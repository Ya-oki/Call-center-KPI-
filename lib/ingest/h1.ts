/**
 * H1 2026 back-pay data loader (SOT §4).
 *
 * Joins Manager_Report_H1_2026 (financials → net deposit) with
 * Manager_Retention_H1_2026 (retention) on manager ALIAS (Lida/Radin/Lara) +
 * month, for the scored window Feb–Jun. Produces the engine's per-agent-month
 * inputs. Pure over the two CSV strings; `readH1Data()` supplies them from disk.
 *
 * Rules enforced here:
 *  - Join on alias, never real names.
 *  - Stop the retention parse at the `--- CONDUCT/COMPLAINT` separator (the
 *    committed CSV is already trimmed; this is belt-and-suspenders).
 *  - Exclude Mahya & Armin (renamed 2026-05-18; no continuous H1 history — SOT §4).
 *  - Service Activity has no usable feed → activity_composite = null (redistributed
 *    downstream, SOT §9).
 *  - Conduct = 1.0 for the trio. The gate keys off AGENT MISCONDUCT only; Lida's
 *    flags are client-platform complaints, formally cleared (SOT §10).
 *    TODO(ingestion): split agent-conduct flags from client-platform complaints
 *    at source so the gate stops mislabeling platform problems as violations.
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import type { AgentMonthInput } from "@/lib/engine/types";
import { H1_MONTHLY_SALARY } from "@/lib/config/defaults";

/** Back-pay trio (aliases). Mahya & Armin excluded — no continuous H1 history. */
export const BACKPAY_TRIO = ["Lida", "Radin", "Lara"] as const;

/** Scored window — Feb–Jun (January has no retention data). */
export const SCORED_MONTHS = ["Feb", "Mar", "Apr", "May", "Jun"] as const;

/** Months flagged as a systemic desk-wide event for DISPLAY only (SOT §6). */
export const SYSTEMIC_EVENT_MONTHS = new Set<string>(["Mar"]);

const RETENTION_STOP_MARKER = "---";

function splitCsvLine(line: string): string[] {
  return line.split(",").map((c) => c.trim());
}

interface RetentionRow {
  start: number;
  end: number;
  reactivated: number;
  redeposit: number;
}

/** Parse financials → net deposit by `${manager}|${month}` (skips TOTALs/blanks). */
function parseFinancials(csv: string): Map<string, number> {
  const map = new Map<string, number>();
  const lines = csv.replace(/\r/g, "").split("\n");
  for (let i = 1; i < lines.length; i += 1) {
    const raw = lines[i] ?? "";
    if (raw.trim() === "") continue;
    const c = splitCsvLine(raw);
    const manager = c[0] ?? "";
    const month = c[1] ?? "";
    if (manager === "" || month === "" || month === "H1 TOTAL") continue;
    const netDeposit = Number(c[5] ?? "");
    if (!Number.isFinite(netDeposit)) continue;
    map.set(`${manager}|${month}`, netDeposit);
  }
  return map;
}

/** Parse retention → row by `${manager}|${month}`; stops at the free-text marker. */
function parseRetention(csv: string): Map<string, RetentionRow> {
  const map = new Map<string, RetentionRow>();
  const lines = csv.replace(/\r/g, "").split("\n");
  for (let i = 1; i < lines.length; i += 1) {
    const raw = lines[i] ?? "";
    if (raw.startsWith(RETENTION_STOP_MARKER)) break; // free-text section — not tabular
    if (raw.trim() === "") continue;
    const c = splitCsvLine(raw);
    const manager = c[0] ?? "";
    const month = c[1] ?? "";
    // A second "Manager"/"Month" header (the free-text block) also ends tabular data.
    if (manager === "Manager") break;
    if (manager === "" || month === "") continue;
    const start = Number(c[2] ?? "");
    const end = Number(c[3] ?? "");
    const reactivated = Number(c[5] ?? "");
    const redeposit = Number(c[6] ?? "");
    if (![start, end, reactivated, redeposit].every(Number.isFinite)) continue;
    map.set(`${manager}|${month}`, { start, end, reactivated, redeposit });
  }
  return map;
}

/**
 * Build the trio's Feb–Jun engine inputs by joining the two CSVs on alias+month.
 * Throws if an expected (manager, month) cell is missing — we do not silently
 * drop months, since that would quietly change the back-pay.
 */
export function loadH1(reportCsv: string, retentionCsv: string): AgentMonthInput[] {
  const financials = parseFinancials(reportCsv);
  const retention = parseRetention(retentionCsv);

  const rows: AgentMonthInput[] = [];
  for (const alias of BACKPAY_TRIO) {
    for (const month of SCORED_MONTHS) {
      const netDeposit = financials.get(`${alias}|${month}`);
      const ret = retention.get(`${alias}|${month}`);
      if (netDeposit === undefined || ret === undefined) {
        throw new Error(`H1 data missing for ${alias} ${month} (financials or retention)`);
      }
      rows.push({
        key: alias,
        name: alias, // CRM uses the alias as the label
        month,
        monthly_salary: H1_MONTHLY_SALARY,
        retained_capital: netDeposit,
        clients_start: ret.start,
        active_clients_end: ret.end,
        reactivated: ret.reactivated,
        redeposit_clients: ret.redeposit,
        activity_composite: null, // no usable call feed (SOT §9)
        conduct_multiplier: 1.0, // agent-misconduct-only gate; trio clean (SOT §10)
      });
    }
  }
  return rows;
}

const DATA_DIR = path.join(process.cwd(), "data");

/** Read the committed H1 CSVs from disk and build the engine inputs. */
export function readH1Data(): AgentMonthInput[] {
  const reportCsv = readFileSync(path.join(DATA_DIR, "Manager_Report_H1_2026.csv"), "utf8");
  const retentionCsv = readFileSync(
    path.join(DATA_DIR, "Manager_Retention_H1_2026.csv"),
    "utf8",
  );
  return loadH1(reportCsv, retentionCsv);
}
