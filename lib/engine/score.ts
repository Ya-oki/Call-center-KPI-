/**
 * Retention Engine — PURE calculation engine (P1).
 *
 * Deterministic. No DB, no fetch, no Date.now(), no globals. Input: typed rows +
 * settings. Output: a ScopeResult. All money/scoring values come from `settings`.
 *
 * The reward model (ECONOMICS block, supersedes prototype/BUILD_SPEC on conflict):
 *
 *   netDeskValue  = Σ net_deposit over all client-months in scope        (may be < 0)
 *   pool          = max(0, netDeskValue) × payout_rate/100                (floored)
 *   wo            = outcome_weight/100 ;  wa = 1 − wo
 *   penaltyMult   = 1 − impede_penalty/100
 *
 *   Per agent a (attribution = point-in-time manager_email on each row):
 *     rev_a         = Σ net_deposit of a's client-months                 (may be < 0)
 *     ownClients_a  = distinct clients a serviced in scope
 *     survived_a    = ownClients whose LATEST-in-scope status != 'churned'
 *     survRate_a    = survived_a / ownClients_a            (0 if none)
 *     outcomeRaw_a  = rev_a × (0.5 + 0.5·survRate_a)        (NOT floored; may be < 0)
 *
 *     coverage_a    = min(1, clients_covered/assigned_clients)  (1 if no assigned)
 *     respScore_a   = avg_response_min==null ? 0 : 1/(1 + avg_response_min/15)
 *     activityComp_a= 0.35·calls + 0.20·(talk_min/10) + 0.20·messages
 *                     + 0.15·(respScore·100) + 0.10·(coverage·100)
 *     conductFinal_a= impede_flag>0 ? min(conduct_a, penaltyMult) : conduct_a
 *
 *   Normalization = MIN-MAX to [0,1] across agents, for BOTH indices. This lets
 *   negative outcomes rank lowest (→ 0) without breaking share math:
 *     idx_a = (raw_a − min)/(max − min) ; all 0 if max==min
 *
 *     score_a   = conductFinal_a × (wo·outcomeIdx_a + wa·activityIdx_a)
 *     share_a   = score_a / Σ score                          (0 if Σ ≤ 0)
 *     payout_a  = pool × share_a
 *     paidNow_a = payout_a × (1 − hold_pct/100)
 *     held_a    = payout_a × (hold_pct/100)
 *   rank: payout desc (deterministic tie-break by manager_email).
 */

import type {
  AgentActivity,
  AgentResult,
  ClientMonthRow,
  ClientStatus,
  EngineSettings,
  ScopeResult,
} from "@/lib/engine/types";

/** Shown on every PROVISIONAL (UNAPPROVED) result. Pay is not yet authorized. */
export const PROVISIONAL_DISCLAIMER =
  "PROVISIONAL — not an authorized payout. Pending executive sign-off.";

/** Min-max normalize to [0,1]. All zeros when the range collapses (max == min). */
function minMax(values: number[]): number[] {
  if (values.length === 0) return [];
  const min = Math.min(...values);
  const max = Math.max(...values);
  if (max === min) return values.map(() => 0);
  const span = max - min;
  return values.map((v) => (v - min) / span);
}

export function computeScope(
  clients: ClientMonthRow[],
  activity: AgentActivity[],
  settings: EngineSettings,
): ScopeResult {
  const periods = [...new Set(clients.map((r) => r.period))].sort();

  const netDeskValue = clients.reduce((sum, r) => sum + r.net_deposit, 0);
  const pool = Math.max(0, netDeskValue) * (settings.payout_rate / 100);
  const holdFrac = settings.hold_pct / 100;
  const wo = settings.outcome_weight / 100;
  const wa = 1 - wo;
  const penaltyMult = 1 - settings.impede_penalty / 100;

  // Latest-in-scope status per client (point-in-time history preserved — we keep
  // the row with the greatest period; 'YYYY-MM' sorts lexicographically).
  const latestStatus = new Map<string, { period: string; status: ClientStatus }>();
  for (const r of clients) {
    const cur = latestStatus.get(r.client_id);
    if (!cur || r.period > cur.period) {
      latestStatus.set(r.client_id, { period: r.period, status: r.status });
    }
  }

  // Agent registry — stable order: activity order first, then any client-only
  // managers. Order does not affect index values; it only fixes iteration.
  const activityByEmail = new Map<string, AgentActivity>();
  const order: string[] = [];
  for (const a of activity) {
    if (!activityByEmail.has(a.manager_email)) {
      activityByEmail.set(a.manager_email, a);
      order.push(a.manager_email);
    }
  }
  const seen = new Set(order);
  for (const r of clients) {
    if (!seen.has(r.manager_email)) {
      seen.add(r.manager_email);
      order.push(r.manager_email);
    }
  }

  // Per-agent revenue + serviced client set (attribution = manager_email on row).
  const revByEmail = new Map<string, number>();
  const clientsByEmail = new Map<string, Set<string>>();
  for (const email of order) {
    revByEmail.set(email, 0);
    clientsByEmail.set(email, new Set());
  }
  for (const r of clients) {
    revByEmail.set(r.manager_email, (revByEmail.get(r.manager_email) ?? 0) + r.net_deposit);
    clientsByEmail.get(r.manager_email)?.add(r.client_id);
  }

  // Raw per-agent values (pre-normalization), in registry order.
  const raw = order.map((email) => {
    const rev = revByEmail.get(email) ?? 0;
    const clientIds = clientsByEmail.get(email) ?? new Set<string>();
    const ownClients = clientIds.size;
    let survived = 0;
    for (const cid of clientIds) {
      const ls = latestStatus.get(cid);
      if (ls && ls.status !== "churned") survived += 1;
    }
    const survRate = ownClients > 0 ? survived / ownClients : 0;
    const outcomeRaw = rev * (0.5 + 0.5 * survRate);

    const act = activityByEmail.get(email);
    const calls = act?.calls ?? 0;
    const talk = act?.talk_min ?? 0;
    const messages = act?.messages ?? 0;
    const avgResp = act ? act.avg_response_min : null;
    const covered = act?.clients_covered ?? 0;
    const assigned = act?.assigned_clients ?? 0;
    const conduct = act?.conduct ?? 1;
    const impede = act?.impede_flag ?? 0;

    const coverage = assigned > 0 ? Math.min(1, covered / assigned) : 1;
    const respScore = avgResp === null ? 0 : 1 / (1 + avgResp / 15);
    const activityComp =
      0.35 * calls +
      0.2 * (talk / 10) +
      0.2 * messages +
      0.15 * (respScore * 100) +
      0.1 * (coverage * 100);
    const conductFinal = impede > 0 ? Math.min(conduct, penaltyMult) : conduct;

    return {
      email,
      rev,
      ownClients,
      survived,
      survRate,
      coverage,
      outcomeRaw,
      activityComp,
      conduct,
      conductFinal,
    };
  });

  const outcomeIdx = minMax(raw.map((r) => r.outcomeRaw));
  const activityIdx = minMax(raw.map((r) => r.activityComp));

  const scored = raw.map((r, i) => {
    const oIdx = outcomeIdx[i] ?? 0;
    const aIdx = activityIdx[i] ?? 0;
    const score = r.conductFinal * (wo * oIdx + wa * aIdx);
    return { ...r, outcomeIdx: oIdx, activityIdx: aIdx, score };
  });

  const sumScore = scored.reduce((sum, r) => sum + r.score, 0);

  const unranked: AgentResult[] = scored.map((r) => {
    const share = sumScore > 0 ? r.score / sumScore : 0;
    const payout = pool * share;
    return {
      manager_email: r.email,
      rev: r.rev,
      ownClients: r.ownClients,
      survived: r.survived,
      survRate: r.survRate,
      coverage: r.coverage,
      outcomeRaw: r.outcomeRaw,
      outcomeIdx: r.outcomeIdx,
      activityComp: r.activityComp,
      activityIdx: r.activityIdx,
      conduct: r.conduct,
      conductFinal: r.conductFinal,
      score: r.score,
      share,
      payout,
      paidNow: payout * (1 - holdFrac),
      held: payout * holdFrac,
      rank: 0,
    };
  });

  const agents = [...unranked].sort(
    (a, b) => b.payout - a.payout || a.manager_email.localeCompare(b.manager_email),
  );
  agents.forEach((a, i) => {
    a.rank = i + 1;
  });

  const authorized = settings.status === "APPROVED";
  const disclaimer = authorized ? null : PROVISIONAL_DISCLAIMER;

  return {
    periods,
    netDeskValue,
    pool,
    paidNow: pool * (1 - holdFrac),
    held: pool * holdFrac,
    sumScore,
    agents,
    authorized,
    disclaimer,
  };
}
