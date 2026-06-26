/**
 * ⚠️ SYNTHETIC DEMO DATA — NOT REAL. Do not treat as real agents, clients, or
 * money. Hand-authored to lock the P1 golden numbers (BUILD_SPEC §8, restated by
 * the P1 ECONOMICS block). Never replace with production data.
 *
 * Value metric = net_deposit (deposit − withdrawal); may be negative.
 * Attribution  = point-in-time manager_email on each client-month row.
 */

import type {
  AgentActivity,
  ClientMonthRow,
  EngineSettings,
} from "@/lib/engine/types";

export const DEMO_CLIENTS: ClientMonthRow[] = [
  // 2026-05
  { period: "2026-05", client_id: "c1", manager_email: "lida", net_deposit: 5000, status: "active" },
  { period: "2026-05", client_id: "c2", manager_email: "lida", net_deposit: 3000, status: "active" },
  { period: "2026-05", client_id: "c3", manager_email: "lara", net_deposit: 4000, status: "active" },
  { period: "2026-05", client_id: "c4", manager_email: "lara", net_deposit: 2000, status: "dormant" },
  { period: "2026-05", client_id: "c5", manager_email: "hossein", net_deposit: 6000, status: "active" },
  { period: "2026-05", client_id: "c6", manager_email: "hossein", net_deposit: -1000, status: "churned" },
  { period: "2026-05", client_id: "c7", manager_email: "mahya", net_deposit: 1500, status: "active" },
  { period: "2026-05", client_id: "c8", manager_email: "armin", net_deposit: 2500, status: "active" },
  { period: "2026-05", client_id: "c9", manager_email: "armin", net_deposit: 500, status: "active" },
  // 2026-06
  { period: "2026-06", client_id: "c1", manager_email: "lida", net_deposit: 2000, status: "active" },
  { period: "2026-06", client_id: "c2", manager_email: "lida", net_deposit: 1000, status: "active" },
  { period: "2026-06", client_id: "c3", manager_email: "lara", net_deposit: 3000, status: "active" },
  { period: "2026-06", client_id: "c4", manager_email: "lara", net_deposit: -500, status: "churned" },
  { period: "2026-06", client_id: "c5", manager_email: "hossein", net_deposit: 3000, status: "active" },
  { period: "2026-06", client_id: "c6", manager_email: "hossein", net_deposit: 0, status: "churned" },
  { period: "2026-06", client_id: "c7", manager_email: "mahya", net_deposit: 2000, status: "active" },
  { period: "2026-06", client_id: "c10", manager_email: "mahya", net_deposit: 1000, status: "active" },
  { period: "2026-06", client_id: "c8", manager_email: "armin", net_deposit: 1000, status: "active" },
  { period: "2026-06", client_id: "c9", manager_email: "armin", net_deposit: -2000, status: "churned" },
];

// Coverage fractions encoded as clients_covered / assigned_clients (exact):
//   lida 1.00 = 10/10 · lara 0.90 = 9/10 · hossein 1.00 = 10/10
//   mahya 0.80 = 8/10 · armin 0.85 = 17/20
export const DEMO_ACTIVITY: AgentActivity[] = [
  { manager_email: "lida", calls: 120, talk_min: 600, messages: 200, avg_response_min: 10, clients_covered: 10, assigned_clients: 10, conduct: 1.0, impede_flag: 0 },
  { manager_email: "lara", calls: 100, talk_min: 500, messages: 180, avg_response_min: 12, clients_covered: 9, assigned_clients: 10, conduct: 1.0, impede_flag: 0 },
  { manager_email: "hossein", calls: 140, talk_min: 700, messages: 220, avg_response_min: 8, clients_covered: 10, assigned_clients: 10, conduct: 1.0, impede_flag: 0 },
  { manager_email: "mahya", calls: 60, talk_min: 300, messages: 90, avg_response_min: 20, clients_covered: 8, assigned_clients: 10, conduct: 1.0, impede_flag: 0 },
  { manager_email: "armin", calls: 80, talk_min: 400, messages: 120, avg_response_min: 15, clients_covered: 17, assigned_clients: 20, conduct: 1.0, impede_flag: 1 },
];

/** Golden settings — payout 10%, hold 40%, outcome 65%, impede penalty 50%. */
export const DEMO_SETTINGS: EngineSettings = {
  payout_rate: 10,
  hold_pct: 40,
  outcome_weight: 65,
  impede_penalty: 50,
  status: "UNAPPROVED",
};
