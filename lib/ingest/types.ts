/**
 * Raw ingestion data shapes (per-client-month and per-agent-month feeds).
 *
 * These describe the CSV/DB ingestion vocabulary and are consumed by the
 * ingestion + DB layers (lib/ingest, lib/db). They are intentionally separate
 * from the reward engine's inputs (lib/engine/types.ts): the v2 engine scores
 * pre-aggregated per-agent monthly metrics, not these raw rows. Reconciling the
 * ingestion feed to the v2 engine inputs is future work.
 */

export type ClientStatus = "active" | "dormant" | "churned";

/** One row per client per month (mirrors client_month / clients CSV). */
export interface ClientMonthRow {
  period: string; // 'YYYY-MM'
  client_id: string;
  manager_email: string;
  net_deposit: number; // deposit − withdrawal; may be negative
  status: ClientStatus;
}

/** Per-agent servicing activity (mirrors activity_month / activity CSV). */
export interface AgentActivity {
  manager_email: string;
  calls: number;
  talk_min: number;
  messages: number;
  avg_response_min: number | null;
  clients_covered: number;
  assigned_clients: number;
  conduct: number; // 0..1
  impede_flag: 0 | 1;
}
