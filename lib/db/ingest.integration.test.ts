/**
 * P2 ingestion integration test (DB path).
 *
 * Drives the ingestion pipeline against an in-process Postgres (pg-mem) running
 * the REAL schema.sql DDL and the REAL canonical SQL:
 *
 *   fixture → CSV → parse/validate → upsert (Postgres) → query
 *
 * NOTE: the v2 reward engine scores per-agent monthly metrics, not these raw
 * client/activity rows, so this test exercises ingestion mechanics only
 * (persistence, idempotency, auto-create, seeding, validation) and is
 * intentionally decoupled from computeScope. Reconciling the ingestion feed to
 * the v2 engine inputs is future work.
 */

import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { DataType, newDb } from "pg-mem";
import { beforeAll, describe, expect, it } from "vitest";

import type { ClientMonthRow } from "@/lib/ingest/types";
import { PgDataStore, SEED_AGENTS, type Queryable } from "@/lib/db/store";
import { ingestActivityCsv, ingestClientsCsv } from "@/lib/ingest/ingest";
import { DEMO_ACTIVITY, DEMO_CLIENTS } from "@/tests/fixtures/demo_netdeposit";

const SCHEMA_SQL = readFileSync(
  fileURLToPath(new URL("./schema.sql", import.meta.url)),
  "utf8",
);

const ACTIVITY_PERIOD = "2026-06";

function clientsToCsv(rows: ClientMonthRow[]): string {
  const header = "period,client_id,manager_email,net_deposit,status";
  const body = rows.map(
    (r) => `${r.period},${r.client_id},${r.manager_email},${r.net_deposit},${r.status}`,
  );
  return [header, ...body].join("\n");
}

function activityToCsv(): string {
  const header =
    "period,manager_email,calls,talk_min,messages,avg_response_min,clients_covered,assigned_clients,conduct,impede_flag";
  const body = DEMO_ACTIVITY.map((a) =>
    [
      ACTIVITY_PERIOD,
      a.manager_email,
      a.calls,
      a.talk_min,
      a.messages,
      a.avg_response_min ?? "",
      a.clients_covered,
      a.assigned_clients,
      a.conduct,
      a.impede_flag,
    ].join(","),
  );
  return [header, ...body].join("\n");
}

function makePool(): Queryable & { __counts(): Promise<Record<string, number>> } {
  const mem = newDb();
  // pg-mem ships very few native functions; provide gen_random_uuid so the
  // `create extension if not exists pgcrypto` + uuid-default DDL runs as on real PG.
  mem.registerExtension("pgcrypto", (schema) => {
    schema.registerFunction({
      name: "gen_random_uuid",
      returns: DataType.uuid,
      implementation: () => randomUUID(),
      impure: true,
    });
  });
  mem.public.none(SCHEMA_SQL);
  const { Pool } = mem.adapters.createPg();
  const pool = new Pool();
  return {
    query: (text: string, params?: ReadonlyArray<unknown>) =>
      pool.query(text, params as unknown[]),
    async __counts() {
      const t = async (sql: string) => Number((await pool.query(sql)).rows[0].n);
      return {
        agents: await t("select count(*)::int n from agent"),
        clients: await t("select count(*)::int n from client_month"),
        activity: await t("select count(*)::int n from activity_month"),
        audit: await t("select count(*)::int n from audit_log"),
      };
    },
  };
}

describe("P2 — DB ingestion (persist, seed, idempotent)", () => {
  let db: Queryable & { __counts(): Promise<Record<string, number>> };
  let store: PgDataStore;
  let clientsResult: Awaited<ReturnType<typeof ingestClientsCsv>>;
  let activityResult: Awaited<ReturnType<typeof ingestActivityCsv>>;

  beforeAll(async () => {
    db = makePool();
    store = new PgDataStore(db);
    await store.seedAgents(SEED_AGENTS);
    clientsResult = await ingestClientsCsv(clientsToCsv(DEMO_CLIENTS), store, { actor: "tester" });
    activityResult = await ingestActivityCsv(activityToCsv(), store, { actor: "tester" });
  });

  it("accepts both uploads with no errors", () => {
    expect(clientsResult.ok).toBe(true);
    expect(activityResult.ok).toBe(true);
    expect(clientsResult.rowsUpserted).toBe(DEMO_CLIENTS.length);
    expect(activityResult.rowsUpserted).toBe(DEMO_ACTIVITY.length);
  });

  it("persists agents, rows, and one audit entry per upload", async () => {
    const counts = await db.__counts();
    expect(counts.agents).toBe(5);
    expect(counts.clients).toBe(DEMO_CLIENTS.length);
    expect(counts.activity).toBe(DEMO_ACTIVITY.length);
    expect(counts.audit).toBe(2);
  });

  it("queries back rows shaped for downstream consumers", async () => {
    const clients = await store.getClientMonths();
    const activity = await store.getActivity();
    expect(clients.length).toBe(DEMO_CLIENTS.length);
    expect(activity.length).toBe(5); // aggregated per agent
  });

  it("seeds display_name labels (hossein→Radin, armin→Ali)", async () => {
    const res = await db.query("select manager_email, display_name from agent order by manager_email");
    const labels = Object.fromEntries(res.rows.map((r) => [String(r.manager_email), String(r.display_name)]));
    expect(labels.hossein).toBe("Radin");
    expect(labels.armin).toBe("Ali");
    expect(labels.lida).toBe("Lida");
  });

  it("re-uploading the same month is idempotent (no duplicate rows)", async () => {
    const reClients = await ingestClientsCsv(clientsToCsv(DEMO_CLIENTS), store, { actor: "tester" });
    const reActivity = await ingestActivityCsv(activityToCsv(), store, { actor: "tester" });
    expect(reClients.ok).toBe(true);
    expect(reActivity.ok).toBe(true);

    const counts = await db.__counts();
    expect(counts.clients).toBe(DEMO_CLIENTS.length); // unchanged
    expect(counts.activity).toBe(DEMO_ACTIVITY.length); // unchanged
  });
});

describe("P2 — auto-create + validation rejection", () => {
  it("auto-creates an unseen agent from the clients file", async () => {
    const db = makePool();
    const store = new PgDataStore(db);
    const csv = "period,client_id,manager_email,net_deposit,status\n2026-05,cX,newbie,500,active";
    const res = await ingestClientsCsv(csv, store, {});
    expect(res.ok).toBe(true);
    expect(res.agentsCreated).toBe(1);
    const counts = await db.__counts();
    expect(counts.agents).toBe(1);
  });

  it("rejects a file with a bad period / status and writes nothing", async () => {
    const db = makePool();
    const store = new PgDataStore(db);
    const csv =
      "period,client_id,manager_email,net_deposit,status\n" +
      "2026-13,c1,lida,500,active\n" + // bad month
      "2026-05,c2,lida,100,exploded"; // bad status
    const res = await ingestClientsCsv(csv, store, {});
    expect(res.ok).toBe(false);
    expect(res.rowsUpserted).toBe(0);
    expect(res.issues.some((i) => i.column === "period" && i.severity === "error")).toBe(true);
    expect(res.issues.some((i) => i.column === "status" && i.severity === "error")).toBe(true);
    const counts = await db.__counts();
    expect(counts.clients).toBe(0);
    expect(counts.agents).toBe(0);
  });

  it("does NOT reject negative net_deposit (capital flight is valid signal)", async () => {
    const db = makePool();
    const store = new PgDataStore(db);
    const csv = "period,client_id,manager_email,net_deposit,status\n2026-05,c1,lida,-2000,churned";
    const res = await ingestClientsCsv(csv, store, {});
    expect(res.ok).toBe(true);
    expect(res.rowsUpserted).toBe(1);
    const clients = await store.getClientMonths();
    expect(clients[0]?.net_deposit).toBe(-2000);
  });
});
