/**
 * ⚠️ SYNTHETIC regression fixture — NOT real pay. Single month, 5 agents.
 * Pinned to its OWN settings (placeholder targets 150k/50, no redistribution,
 * linear) so it stays a stable pure-math guard on the formula regardless of the
 * recalibrated DEFAULT_ENGINE_SETTINGS. The authoritative pay check is the real
 * H1 back-pay golden (lib/engine/h1_backpay.test.ts).
 */

import type { AgentMonthInput, EngineSettings } from "@/lib/engine/types";

export const DEMO_AGENTS: AgentMonthInput[] = [
  { key: "lida@opofinance.com", name: "Lida", month: "demo", monthly_salary: 1600, retained_capital: 180_000, clients_start: 160, active_clients_end: 150, reactivated: 45, redeposit_clients: 0, activity_composite: 95, conduct_multiplier: 1.0 },
  { key: "lara@opofinance.com", name: "Lara", month: "demo", monthly_salary: 1600, retained_capital: 90_000, clients_start: 165, active_clients_end: 150, reactivated: 38, redeposit_clients: 0, activity_composite: 88, conduct_multiplier: 1.0 },
  { key: "hossein@opofinance.com", name: "Radin", month: "demo", monthly_salary: 1600, retained_capital: 140_000, clients_start: 158, active_clients_end: 150, reactivated: 50, redeposit_clients: 0, activity_composite: 100, conduct_multiplier: 1.0 },
  { key: "mahya@opofinance.com", name: "Mahya", month: "demo", monthly_salary: 1250, retained_capital: 60_000, clients_start: 90, active_clients_end: 85, reactivated: 22, redeposit_clients: 0, activity_composite: 60, conduct_multiplier: 1.0 },
  { key: "armin@opofinance.com", name: "Ali", month: "demo", monthly_salary: 1400, retained_capital: 40_000, clients_start: 100, active_clients_end: 80, reactivated: 20, redeposit_clients: 0, activity_composite: 70, conduct_multiplier: 0.5 },
];

/** Pinned synthetic settings — placeholder targets, D scored (no redistribution). */
export const DEMO_SETTINGS: EngineSettings = {
  TARGET_CAPITAL: 150_000,
  TARGET_ENGAGE: 50,
  TARGET_ACTIVITY: 100,
  TARGET_ACTIVITY_PENDING_LIVE_FEED: false,
  CEILING_PCT: 0.15,
  CAP_PCT: 0.2,
  FLOOR: 60,
  CURVE_P: 1.5,
  WEIGHTS: { capital: 40, retention: 30, engagement: 15, activity: 15 },
  mode: "backpay_linear",
  redistribute_service_activity: false,
  status: "UNAPPROVED",
};
