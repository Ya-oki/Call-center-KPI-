/**
 * ⚠️ SYNTHETIC H2 fixture — NOT real clients. Modeled on the SOT §7 pattern.
 *
 * Agent X: one dominant "whale" client (>50% of book net deposit, deep floating
 * losses) plus small clients — the whale shape. Agent Y: an evenly distributed
 * book of a similar total, modest losses.
 *
 * Raw client_ref values here are fake numeric IDs used ONLY to prove ingestion
 * pseudonymizes them; they must not survive into anything persisted.
 *
 * Cap reference: CONC_CAP_PCT 0.25 × TARGET_CAPITAL 270000 = 67,500.
 */

import type { AgentMonthInput } from "@/lib/engine/types";
import type { RawClientCapitalRow } from "@/lib/ingest/clientCapital";

export const CONC_CAP_REFERENCE = 0.25 * 270_000; // 67,500

/** Known raw IDs — tests assert none of these survive ingestion. */
export const RAW_CLIENT_IDS = ["710001", "710002", "710003", "710004", "820001", "820002", "820003", "820004", "820005"];

// Agent X — whale book: whale 200k (>50% of 290k), floating −150k.
export const RAW_X: RawClientCapitalRow[] = [
  { manager_alias: "AgentX", month: "Jul", client_ref: "710001", net_deposit: 200_000, floating_pl: -150_000 },
  { manager_alias: "AgentX", month: "Jul", client_ref: "710002", net_deposit: 40_000, floating_pl: -2_000 },
  { manager_alias: "AgentX", month: "Jul", client_ref: "710003", net_deposit: 30_000, floating_pl: -2_000 },
  { manager_alias: "AgentX", month: "Jul", client_ref: "710004", net_deposit: 20_000, floating_pl: -2_000 },
];

// Agent Y — distributed book: every client below the cap, modest losses.
export const RAW_Y: RawClientCapitalRow[] = [
  { manager_alias: "AgentY", month: "Jul", client_ref: "820001", net_deposit: 60_000, floating_pl: -3_000 },
  { manager_alias: "AgentY", month: "Jul", client_ref: "820002", net_deposit: 60_000, floating_pl: -3_000 },
  { manager_alias: "AgentY", month: "Jul", client_ref: "820003", net_deposit: 60_000, floating_pl: -3_000 },
  { manager_alias: "AgentY", month: "Jul", client_ref: "820004", net_deposit: 60_000, floating_pl: -3_000 },
  { manager_alias: "AgentY", month: "Jul", client_ref: "820005", net_deposit: 50_000, floating_pl: -3_000 },
];

// Book totals (both 290,000). retained_capital carries the aggregate (the value
// the H1/aggregate path uses when the concentration cap is OFF).
export const X_BOOK_TOTAL = 290_000;
export const Y_BOOK_TOTAL = 290_000;

/** Build an agent-month input from (pseudonymized) client rows. */
export function agentWith(
  key: string,
  clientRows: AgentMonthInput["client_capital"],
  bookTotal: number,
): AgentMonthInput {
  return {
    key,
    name: key,
    month: "Jul",
    monthly_salary: 1600,
    retained_capital: bookTotal, // aggregate path input
    clients_start: 100,
    active_clients_end: 90,
    reactivated: 30,
    redeposit_clients: 20,
    activity_composite: null,
    conduct_multiplier: 1.0,
    client_capital: clientRows,
  };
}
