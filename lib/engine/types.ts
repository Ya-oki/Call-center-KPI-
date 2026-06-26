/**
 * Retention Engine — domain types for the pure calculation engine.
 *
 * Types only — no logic. The engine (score.ts) is a PURE function over these:
 * arrays of typed rows + settings in, computed result objects out. No DB, no
 * fetch, no globals (BUILD_SPEC §4, §14).
 *
 * ECONOMICS NOTE (P1): the value metric is `net_deposit` (deposit − withdrawal)
 * per client-month, NOT net company revenue, and attribution is the
 * point-in-time servicing agent on each row (`manager_email`). These supersede
 * the prototype/BUILD_SPEC where they conflict.
 */

export type ClientStatus = "active" | "dormant" | "churned";

/**
 * One row per client per month.
 * `manager_email` is the point-in-time servicing agent for THIS month — history
 * is never reassigned to a client's latest manager (attribution rule).
 * `net_deposit` may be negative (capital flight is real signal; not floored).
 */
export interface ClientMonthRow {
  period: string; // 'YYYY-MM'
  client_id: string;
  manager_email: string;
  net_deposit: number; // deposit − withdrawal; may be negative
  status: ClientStatus;
}

/**
 * Per-agent servicing activity within the scope (aggregated upstream from the
 * monthly activity feed — that aggregation is an ingestion concern, P2).
 * Coverage is derived from clients_covered / assigned_clients so the prototype's
 * coverage formula stays authoritative.
 */
export interface AgentActivity {
  manager_email: string;
  calls: number;
  talk_min: number;
  messages: number;
  avg_response_min: number | null; // null ⇒ no responsiveness signal ⇒ respScore 0
  clients_covered: number;
  assigned_clients: number;
  conduct: number; // 0..1
  impede_flag: 0 | 1; // withdrawal-impeding
}

/** Approval gate — pay is not authorized until settings are explicitly APPROVED. */
export type SettingsStatus = "UNAPPROVED" | "APPROVED";

/**
 * Flat reward settings consumed by the engine. Every money/scoring value is
 * configuration, never hardcoded (BUILD_SPEC §14). The activity sub-weights are
 * v1 constants in score.ts; they become config in a later phase.
 */
export interface EngineSettings {
  payout_rate: number; // % of net desk value → pool
  hold_pct: number; // % of each payout held back
  outcome_weight: number; // 0..100 (activity weight = 100 − this)
  impede_penalty: number; // 0..100 (conduct multiplier = 1 − this/100)
  status: SettingsStatus;
}

/** Per-agent computed result within a scope (intermediates kept for transparency). */
export interface AgentResult {
  manager_email: string;
  rev: number; // Σ net_deposit attributed to this agent (may be negative)
  ownClients: number;
  survived: number;
  survRate: number;
  coverage: number;
  outcomeRaw: number; // rev × (0.5 + 0.5·survRate); may be negative (not floored)
  outcomeIdx: number; // min-max normalized to [0,1] across agents
  activityComp: number;
  activityIdx: number; // min-max normalized to [0,1] across agents
  conduct: number;
  conductFinal: number; // after impede gate
  score: number;
  share: number;
  payout: number;
  paidNow: number;
  held: number;
  rank: number;
}

/** Full computed result for a scope. */
export interface ScopeResult {
  periods: string[];
  netDeskValue: number; // Σ all net_deposit in scope (may be negative)
  pool: number; // max(0, netDeskValue) × payout_rate/100
  paidNow: number;
  held: number;
  sumScore: number;
  agents: AgentResult[]; // ranked by payout desc
  /**
   * SAFETY: true only when settings.status === 'APPROVED'. While UNAPPROVED the
   * engine still computes, but results are PROVISIONAL and must be rendered as
   * such. No code path may set this true without an explicit settings change.
   */
  authorized: boolean;
  disclaimer: string | null;
}
