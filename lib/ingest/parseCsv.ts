/**
 * CSV parsing for clients / activity uploads.
 *
 * P0 STUB — built in P2 (DB + ingestion). Mirrors the prototype's parseCSV
 * (Opo_Retention_Desk_Platform_v1.html): split on newlines, comma-split cells,
 * coerce numerics, reject commas inside values. Implemented alongside validate.ts.
 */

export type CsvRow = Record<string, string | number>;

export function parseCsv(_text: string): CsvRow[] {
  throw new Error("parseCsv: implemented in P2 (ingestion).");
}
