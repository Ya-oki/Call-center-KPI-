/**
 * Retention Engine — PURE calculation engine (v2 corrected retention model).
 *
 * Deterministic. No DB, no fetch, no Date.now(), no globals. All numeric values
 * come from `settings` — there are NO magic numbers in this logic.
 *
 * Per agent (targets/weights/ceiling from settings):
 *   A_capital    = clamp(0, W.capital,    (max(0, retained_capital)/TARGET_CAPITAL)  · W.capital)
 *   B_retention  = clamp(0, W.retention,  (active_clients_end/clients_start)         · W.retention)
 *   C_engagement = clamp(0, W.engagement, ((reactivated + redeposit)/TARGET_ENGAGE)  · W.engagement)
 *   D_activity   = clamp(0, W.activity,   (activity_composite/TARGET_ACTIVITY)       · W.activity)
 *   raw_score    = A + B + C + D                                   // 0..100 (W sums to 100)
 *   final_score  = raw_score × conduct_multiplier                 // conduct in [0,1]
 *   monthly_bonus = (final_score/100) × (CEILING_PCT/100) × monthly_salary
 *
 * Results are ranked by bonus desc. Every result keeps authorized:false + the
 * PROVISIONAL disclaimer while settings.status is UNAPPROVED.
 */

import type {
  AgentMonthInput,
  AgentResult,
  EngineSettings,
  ScopeResult,
} from "@/lib/engine/types";

/** Shown on every PROVISIONAL (UNAPPROVED) result. Pay is not yet authorized. */
export const PROVISIONAL_DISCLAIMER =
  "PROVISIONAL — not an authorized payout. Pending executive sign-off.";

function clamp(lo: number, hi: number, x: number): number {
  return Math.max(lo, Math.min(hi, x));
}

export function computeScope(
  agents: AgentMonthInput[],
  settings: EngineSettings,
): ScopeResult {
  const { TARGET_CAPITAL, TARGET_ENGAGE, TARGET_ACTIVITY, CEILING_PCT, WEIGHTS } =
    settings;

  const computed: AgentResult[] = agents.map((a) => {
    const capital = clamp(
      0,
      WEIGHTS.capital,
      (Math.max(0, a.retained_capital) / TARGET_CAPITAL) * WEIGHTS.capital,
    );
    const retentionRatio =
      a.clients_start > 0 ? a.active_clients_end / a.clients_start : 0;
    const retention = clamp(0, WEIGHTS.retention, retentionRatio * WEIGHTS.retention);
    const engagement = clamp(
      0,
      WEIGHTS.engagement,
      ((a.reactivated + a.redeposit_clients) / TARGET_ENGAGE) * WEIGHTS.engagement,
    );
    const activity = clamp(
      0,
      WEIGHTS.activity,
      (a.activity_composite / TARGET_ACTIVITY) * WEIGHTS.activity,
    );

    const rawScore = capital + retention + engagement + activity;
    const finalScore = rawScore * a.conduct_multiplier;
    const monthlyBonus = (finalScore / 100) * (CEILING_PCT / 100) * a.monthly_salary;

    return {
      email: a.email,
      name: a.name,
      monthly_salary: a.monthly_salary,
      conduct_multiplier: a.conduct_multiplier,
      pillars: { capital, retention, engagement, activity },
      raw_score: rawScore,
      final_score: finalScore,
      monthly_bonus: monthlyBonus,
      bonus_pct_salary: a.monthly_salary > 0 ? monthlyBonus / a.monthly_salary : 0,
      rank: 0,
    };
  });

  const ranked = [...computed].sort(
    (x, y) => y.monthly_bonus - x.monthly_bonus || x.email.localeCompare(y.email),
  );
  ranked.forEach((r, i) => {
    r.rank = i + 1;
  });

  const totalBonusCost = ranked.reduce((sum, r) => sum + r.monthly_bonus, 0);
  const maxPossibleCost = agents.reduce(
    (sum, a) => sum + (CEILING_PCT / 100) * a.monthly_salary,
    0,
  );

  const authorized = settings.status === "APPROVED";
  const disclaimer = authorized ? null : PROVISIONAL_DISCLAIMER;

  return {
    agents: ranked,
    totalBonusCost,
    maxPossibleCost,
    authorized,
    disclaimer,
  };
}
