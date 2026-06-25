/**
 * Upload validation + per-row error report.
 *
 * P0 STUB — built in P2 (DB + ingestion). Per BUILD_SPEC §7: required columns
 * present, period matches YYYY-MM, numerics parse, status/flags in allowed sets,
 * no commas inside values. Critical errors reject the file; warnings accept it.
 */

export type ValidationKind = "clients" | "activity";

export interface RowIssue {
  row: number;
  field: string;
  severity: "error" | "warning";
  message: string;
}

export interface ValidationReport {
  ok: boolean;
  issues: RowIssue[];
}

export function validate(
  _kind: ValidationKind,
  _rows: Array<Record<string, string | number>>,
): ValidationReport {
  throw new Error("validate: implemented in P2 (ingestion).");
}
