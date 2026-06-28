/**
 * ⚠️ SYNTHETIC DEMO DATA — NOT REAL pay. One month, 5 agents (email-keyed).
 * Hand-authored to lock the v2 golden numbers. Never replace with real data
 * without re-deriving the golden test.
 *
 * The demo supplies the combined engagement count (reactivated + redeposit) as
 * `reactivated`, with `redeposit_clients` 0 — the engine only uses their sum.
 */

import { DEFAULT_ENGINE_SETTINGS } from "@/lib/config/defaults";
import type { AgentMonthInput, EngineSettings } from "@/lib/engine/types";

export const DEMO_AGENTS: AgentMonthInput[] = [
  {
    email: "lida@opofinance.com",
    name: "Lida",
    monthly_salary: 1600,
    retained_capital: 180_000,
    clients_start: 160,
    active_clients_end: 150,
    reactivated: 45,
    redeposit_clients: 0,
    activity_composite: 95,
    conduct_multiplier: 1.0,
  },
  {
    email: "lara@opofinance.com",
    name: "Lara",
    monthly_salary: 1600,
    retained_capital: 90_000,
    clients_start: 165,
    active_clients_end: 150,
    reactivated: 38,
    redeposit_clients: 0,
    activity_composite: 88,
    conduct_multiplier: 1.0,
  },
  {
    email: "hossein@opofinance.com",
    name: "Radin",
    monthly_salary: 1600,
    retained_capital: 140_000,
    clients_start: 158,
    active_clients_end: 150,
    reactivated: 50,
    redeposit_clients: 0,
    activity_composite: 100,
    conduct_multiplier: 1.0,
  },
  {
    email: "mahya@opofinance.com",
    name: "Mahya",
    monthly_salary: 1250,
    retained_capital: 60_000,
    clients_start: 90,
    active_clients_end: 85,
    reactivated: 22,
    redeposit_clients: 0,
    activity_composite: 60,
    conduct_multiplier: 1.0,
  },
  {
    email: "armin@opofinance.com",
    name: "Ali",
    monthly_salary: 1400,
    retained_capital: 40_000,
    clients_start: 100,
    active_clients_end: 80,
    reactivated: 20,
    redeposit_clients: 0,
    activity_composite: 70,
    conduct_multiplier: 0.5,
  },
];

/** Demo settings — the v2 defaults, UNAPPROVED so the demo stays PROVISIONAL. */
export const DEMO_SETTINGS: EngineSettings = DEFAULT_ENGINE_SETTINGS;
