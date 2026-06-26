/**
 * CSV parsing for clients / activity uploads (P2).
 *
 * Deliberately minimal and dependency-free, mirroring the prototype's parseCSV:
 * split on newlines, comma-split cells, trim. It does NOT try to handle quoted
 * commas — embedded commas are a validation error (BUILD_SPEC §7: "no commas
 * inside values"), detected downstream as a cell-count mismatch.
 */

export interface ParsedCsvRow {
  /** 1-based source line number (the header is line 1), for the error report. */
  lineNumber: number;
  cells: string[];
}

export interface ParsedCsv {
  columns: string[];
  rows: ParsedCsvRow[];
}

export function parseCsv(text: string): ParsedCsv {
  const lines = text.replace(/\r/g, "").split("\n");

  let headerIdx = -1;
  for (let i = 0; i < lines.length; i += 1) {
    if ((lines[i] ?? "").trim().length > 0) {
      headerIdx = i;
      break;
    }
  }
  if (headerIdx === -1) return { columns: [], rows: [] };

  const columns = (lines[headerIdx] ?? "").split(",").map((s) => s.trim());

  const rows: ParsedCsvRow[] = [];
  for (let i = headerIdx + 1; i < lines.length; i += 1) {
    const line = lines[i] ?? "";
    if (line.trim().length === 0) continue;
    rows.push({
      lineNumber: i + 1,
      cells: line.split(",").map((c) => c.trim()),
    });
  }

  return { columns, rows };
}
