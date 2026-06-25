/**
 * Retention Engine — domain types for the pure calculation engine.
 *
 * Types only — no logic. The engine (score.ts) is a PURE function over these:
 * arrays of typed rows + settings in, computed result objects out. No DB, no
 * fetch, no globals (BUILD_SPEC §4, §14).
 */

import type { EngineSettings } from "@/lib/config/defaults";

export type ClientStatus = "active" | "dormant" | "churned";

/** One row per client per month (mirrors client_month / clients CSV). */
export interface ClientMonthRow {
  period: string; // 'YYYY-MM'
  client_id: string;
  agent_id: string;
  status: ClientStatus;
  net_revenue: number;
  deposits: number;
  withdrawals: number;
  bonus_credit: number;
}

/** One row per agent per month (mirrors activity_month / activity CSV). */
export interface ActivityMonthRow {
  period: string; // 'YYYY-MM'
  agent_id: string;
  agent_name: string;
  qualified_calls: number;
  talk_time_min: number;
  messages: number;
  avg_response_min: number | null;
  clients_covered: number;
  assigned_clients: number;
  conduct_score: number; // 0..1
  withdrawal_impeding_flag: 0 | 1;
}

/** Per-agent computed result within a scope. */
export interface AgentResult {
  agentId: string;
  name: string;
  outcomeIdx: number;
  activityIdx: number;
  conductFinal: number;
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
  netDeskRevenue: number;
  pool: number;
  paidNow: number;
  held: number;
  agents: AgentResult[];
}

export type { EngineSettings };
