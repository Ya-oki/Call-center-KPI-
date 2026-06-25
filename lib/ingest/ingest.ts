/**
 * Ingestion orchestration (P2): parse → validate → upsert → audit.
 *
 * Per BUILD_SPEC §7:
 *   - validate; reject the file on critical errors, accept with warnings
 *   - auto-create missing agent rows from any manager_email seen
 *   - idempotent upsert on primary keys (re-uploading a month overwrites cleanly)
 *   - write an audit_log row per upload
 *
 * The store call order respects the FK to agent(manager_email): agents first,
 * then the data rows.
 */

import type { DataStore } from "@/lib/db/store";
import { validateActivity, validateClients, type RowIssue } from "@/lib/ingest/validate";
import { parseCsv } from "@/lib/ingest/parseCsv";

export interface IngestResult {
  ok: boolean;
  kind: "clients" | "activity";
  issues: RowIssue[];
  rowsUpserted: number;
  agentsCreated: number;
}

export async function ingestClientsCsv(
  csvText: string,
  store: DataStore,
  opts: { actor?: string } = {},
): Promise<IngestResult> {
  const result = validateClients(parseCsv(csvText));
  if (!result.ok) {
    return { ok: false, kind: "clients", issues: result.issues, rowsUpserted: 0, agentsCreated: 0 };
  }

  const emails = result.rows.map((r) => r.manager_email);
  const agentsCreated = await store.ensureAgents(emails);
  const rowsUpserted = await store.upsertClientMonths(result.rows);
  await store.insertAudit("upload", {
    kind: "clients",
    rows: rowsUpserted,
    agentsCreated,
    warnings: result.issues.length,
    actor: opts.actor ?? null,
  });

  return { ok: true, kind: "clients", issues: result.issues, rowsUpserted, agentsCreated };
}

export async function ingestActivityCsv(
  csvText: string,
  store: DataStore,
  opts: { actor?: string } = {},
): Promise<IngestResult> {
  const result = validateActivity(parseCsv(csvText));
  if (!result.ok) {
    return { ok: false, kind: "activity", issues: result.issues, rowsUpserted: 0, agentsCreated: 0 };
  }

  const emails = result.rows.map((r) => r.manager_email);
  const agentsCreated = await store.ensureAgents(emails);
  const rowsUpserted = await store.upsertActivityMonths(result.rows);
  await store.insertAudit("upload", {
    kind: "activity",
    rows: rowsUpserted,
    agentsCreated,
    warnings: result.issues.length,
    actor: opts.actor ?? null,
  });

  return { ok: true, kind: "activity", issues: result.issues, rowsUpserted, agentsCreated };
}
