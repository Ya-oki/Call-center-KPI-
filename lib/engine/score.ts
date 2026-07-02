/**
 * Retention Engine — PURE calculation engine (v3).
 *
 * Deterministic. No DB, no fetch, no Date.now(), no globals. All numeric values
 * come from `settings` — there are NO magic numbers in this logic.
 *
 * Formula STRUCTURE is unchanged from v2 (four capped pillars, conduct gate).
 * v3 adds: (a) Service-Activity redistribution when there is no call feed, and
 * (b) two bonus-mapping modes — linear back-pay (H1) and progressive forward (H2).
 *
 *   A_capital    = clamp(0, W.capital,    max(0, retained_capital)/TARGET_CAPITAL · W.capital)
 *   B_retention  = clamp(0, W.retention,  active_clients_end/clients_start        · W.retention)
 *   C_engagement = clamp(0, W.engagement, (reactivated + redeposit)/TARGET_ENGAGE · W.engagement)
 *   D_activity   = clamp(0, W.activity,   activity_composite/TARGET_ACTIVITY      · W.activity)
 *
 *   raw_score:
 *     - normal:        A + B + C + D
 *     - redistributed: (A + B + C) / (W.capital+W.retention+W.engagement) · (sum of all weights)
 *   final_score  = raw_score · conduct_multiplier
 *
 *   Bonus (mode):
 *     backpay_linear:      (final_score/100) · CEILING_PCT · salary
 *     forward_progressive: CAP_PCT · (max(0, final_score − FLOOR)/(100 − FLOOR))^CURVE_P · salary
 */

import type {
  AgentBackPay,
  AgentMonthInput,
  AgentResult,
  BackPayResult,
  ConcentrationInfo,
  ConductSeverity,
  EngineSettings,
  MonthScore,
  ScopeResult,
} from "@/lib/engine/types";

/** Shown on every PROVISIONAL (UNAPPROVED) result. Pay is not yet authorized. */
export const PROVISIONAL_DISCLAIMER =
  "PROVISIONAL — not an authorized payout. Pending executive sign-off.";

function clamp(lo: number, hi: number, x: number): number {
  return Math.max(lo, Math.min(hi, x));
}

/**
 * H2 progressive bonus percentage (fraction of salary).
 * Mirrors SOT §8: no bonus at/below FLOOR, convex growth above it, CAP at 100.
 */
export function progressiveBonusPct(
  score: number,
  capPct: number,
  floor: number,
  curveP: number,
): number {
  if (score <= floor) return 0;
  return capPct * ((score - floor) / (100 - floor)) ** curveP;
}

/** Substantiated agent-conduct severity → multiplier (SOT §10). */
function severityMultiplier(sev: ConductSeverity): number {
  if (sev === "minor") return 0.9;
  if (sev === "major") return 0.5;
  return 0.0; // severe
}

/**
 * Pure per-month pillar + final scoring. Formula STRUCTURE unchanged. H2 behaviour
 * (concentration cap, book-risk flag, conduct pipeline) is gated by settings flags
 * that default OFF — with them off and no H2 feeds, output is bit-identical to H1.
 */
export function scoreMonth(m: AgentMonthInput, settings: EngineSettings): MonthScore {
  const W = settings.WEIGHTS;

  // ── Capital pillar input: aggregate (default) or per-client concentration-capped ──
  const hasClientCapital = Array.isArray(m.client_capital) && m.client_capital.length > 0;
  const concEnabled = settings.concentration_cap_enabled ?? false;
  const concCapPct = settings.CONC_CAP_PCT ?? 0.25;
  let concentration: ConcentrationInfo | null = null;
  let capitalBase = m.retained_capital; // aggregate path — bit-identical to H1 when unused
  if (hasClientCapital && m.client_capital) {
    const cap = concCapPct * settings.TARGET_CAPITAL;
    const rawSum = m.client_capital.reduce((s, c) => s + Math.max(0, c.net_deposit), 0);
    const cappedSum = m.client_capital.reduce(
      (s, c) => s + Math.min(Math.max(0, c.net_deposit), cap),
      0,
    );
    concentration = { applied: concEnabled, rawCapitalInput: rawSum, cappedCapitalInput: cappedSum };
    if (concEnabled) capitalBase = cappedSum;
  }

  const capital = clamp(
    0,
    W.capital,
    (Math.max(0, capitalBase) / settings.TARGET_CAPITAL) * W.capital,
  );
  const retentionRatio =
    m.clients_start > 0 ? m.active_clients_end / m.clients_start : 0;
  const retention = clamp(0, W.retention, retentionRatio * W.retention);
  const engagement = clamp(
    0,
    W.engagement,
    ((m.reactivated + m.redeposit_clients) / settings.TARGET_ENGAGE) * W.engagement,
  );

  const redistribute = settings.redistribute_service_activity || m.activity_composite === null;

  let activity: number | null;
  let rawScore: number;
  if (redistribute) {
    activity = null;
    const three = capital + retention + engagement;
    const denom3 = W.capital + W.retention + W.engagement;
    const full = denom3 + W.activity;
    rawScore = denom3 > 0 ? (three / denom3) * full : 0;
  } else {
    activity = clamp(
      0,
      W.activity,
      ((m.activity_composite ?? 0) / settings.TARGET_ACTIVITY) * W.activity,
    );
    rawScore = capital + retention + engagement + activity;
  }

  // ── Book-risk flag: VISIBILITY ONLY, never affects the score (SOT §7) ──
  let bookRiskFlag = false;
  if (hasClientCapital && m.client_capital) {
    const threshold = settings.RISK_FLAG_THRESHOLD ?? -0.5;
    const sumPl = m.client_capital.reduce((s, c) => s + c.floating_pl, 0);
    const sumNd = m.client_capital.reduce((s, c) => s + c.net_deposit, 0);
    if (sumNd > 0 && sumPl < threshold * sumNd) bookRiskFlag = true;
  }

  // ── Conduct multiplier: input value (H1) or the flag pipeline (H2) ──
  const reviewBadges: string[] = [];
  if (bookRiskFlag) reviewBadges.push("book_risk_review");
  let conductMult = m.conduct_multiplier;
  let conductSource: "input" | "pipeline" = "input";
  if (settings.conduct_pipeline_enabled ?? false) {
    conductSource = "pipeline";
    const flags = m.conduct_flags ?? [];
    const substantiatedAgent = flags
      .filter((f) => f.type === "agent_conduct" && f.substantiated)
      .map((f) => severityMultiplier(f.severity));
    // Worst single multiplier (min) — never multiply flags together.
    conductMult = substantiatedAgent.length > 0 ? Math.min(...substantiatedAgent) : 1.0;
    for (const f of flags) {
      if (f.type === "client_platform") reviewBadges.push("client_platform_complaint");
      else if (f.type === "agent_conduct" && !f.substantiated) reviewBadges.push("unsubstantiated_conduct");
    }
  }

  const finalScore = rawScore * conductMult;

  return {
    month: m.month,
    pillars: { capital, retention, engagement, activity },
    raw_score: rawScore,
    final_score: finalScore,
    redistributed: redistribute,
    conduct_multiplier_effective: conductMult,
    concentration,
    book_risk_flag: bookRiskFlag,
    review_badges: reviewBadges,
    conduct_source: conductSource,
  };
}

/** Bonus for a final score under the settings' mode. */
function bonusFor(finalScore: number, salary: number, settings: EngineSettings): number {
  if (settings.mode === "forward_progressive") {
    return (
      progressiveBonusPct(finalScore, settings.CAP_PCT, settings.FLOOR, settings.CURVE_P) *
      salary
    );
  }
  // backpay_linear (default; the BACK-PAY path — never deleted)
  return (finalScore / 100) * settings.CEILING_PCT * salary;
}

/**
 * Single-month scoring for a set of agents (one row per agent). Used by the v2
 * synthetic regression and the H2 forward preview. Bonus follows settings.mode.
 */
export function computeScope(
  inputs: AgentMonthInput[],
  settings: EngineSettings,
): ScopeResult {
  const computed: AgentResult[] = inputs.map((m) => {
    const s = scoreMonth(m, settings);
    const bonus = bonusFor(s.final_score, m.monthly_salary, settings);
    return {
      key: m.key,
      name: m.name,
      month: m.month,
      monthly_salary: m.monthly_salary,
      conduct_multiplier: m.conduct_multiplier,
      pillars: s.pillars,
      raw_score: s.raw_score,
      final_score: s.final_score,
      redistributed: s.redistributed,
      monthly_bonus: bonus,
      bonus_pct_salary: m.monthly_salary > 0 ? bonus / m.monthly_salary : 0,
      rank: 0,
      conduct_multiplier_effective: s.conduct_multiplier_effective,
      concentration: s.concentration,
      book_risk_flag: s.book_risk_flag,
      review_badges: s.review_badges,
      conduct_source: s.conduct_source,
    };
  });

  const ranked = [...computed].sort(
    (x, y) => y.monthly_bonus - x.monthly_bonus || x.name.localeCompare(y.name),
  );
  ranked.forEach((r, i) => {
    r.rank = i + 1;
  });

  const maxFactor =
    settings.mode === "forward_progressive" ? settings.CAP_PCT : settings.CEILING_PCT;
  const totalBonusCost = ranked.reduce((s, r) => s + r.monthly_bonus, 0);
  const maxPossibleCost = inputs.reduce((s, m) => s + m.monthly_salary * maxFactor, 0);

  const authorized = settings.status === "APPROVED";
  return {
    agents: ranked,
    totalBonusCost,
    maxPossibleCost,
    mode: settings.mode,
    authorized,
    disclaimer: authorized ? null : PROVISIONAL_DISCLAIMER,
    payout_authorized: settings.payout_authorized ?? false,
  };
}

/**
 * H1 back-pay: aggregate multiple months per agent. Each month is scored, the
 * final scores averaged, then the (linear) monthly bonus is computed from that
 * average and multiplied out. Always linear — this is the BACK-PAY path.
 */
export function computeBackPay(
  rows: AgentMonthInput[],
  settings: EngineSettings,
  opts: { multiplier: number },
): BackPayResult {
  const order: string[] = [];
  const groups = new Map<string, AgentMonthInput[]>();
  for (const r of rows) {
    const g = groups.get(r.key);
    if (g) {
      g.push(r);
    } else {
      groups.set(r.key, [r]);
      order.push(r.key);
    }
  }

  const agents: AgentBackPay[] = order.map((key) => {
    const grp = groups.get(key) ?? [];
    const first = grp[0];
    const salary = first ? first.monthly_salary : 0;
    const conduct = first ? first.conduct_multiplier : 1;
    const months = grp.map((r) => scoreMonth(r, settings));
    const avg =
      months.length > 0
        ? months.reduce((s, m) => s + m.final_score, 0) / months.length
        : 0;
    const monthlyBonus = (avg / 100) * settings.CEILING_PCT * salary;
    return {
      key,
      name: first ? first.name : key,
      monthly_salary: salary,
      conduct_multiplier: conduct,
      months,
      avg_score: avg,
      monthly_bonus: monthlyBonus,
      months_multiplier: opts.multiplier,
      backpay_total: monthlyBonus * opts.multiplier,
      rank: 0,
    };
  });

  const ranked = [...agents].sort(
    (a, b) => b.backpay_total - a.backpay_total || a.name.localeCompare(b.name),
  );
  ranked.forEach((a, i) => {
    a.rank = i + 1;
  });

  const monthlyCost = ranked.reduce((s, a) => s + a.monthly_bonus, 0);
  const maxMonthlyCost = ranked.reduce(
    (s, a) => s + a.monthly_salary * settings.CEILING_PCT,
    0,
  );
  const authorized = settings.status === "APPROVED";

  return {
    agents: ranked,
    monthlyCost,
    totalCost: ranked.reduce((s, a) => s + a.backpay_total, 0),
    maxMonthlyCost,
    maxTotalCost: maxMonthlyCost * opts.multiplier,
    multiplier: opts.multiplier,
    authorized,
    disclaimer: authorized ? null : PROVISIONAL_DISCLAIMER,
  };
}
