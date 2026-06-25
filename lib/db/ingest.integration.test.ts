/**
 * P2 integration test — the DB path and the engine agree.
 *
 * Drives the full pipeline against an in-process Postgres (pg-mem) running the
 * REAL schema.sql DDL and the REAL canonical SQL:
 *
 *   fixture → CSV → parse/validate → upsert (Postgres) → query → computeScope
 *
 * and asserts the locked P1 golden block (34000 / 3400 / ranking / payouts). This
 * proves the schema + ingestion conform to the engine, and that computeScope runs
 * UNCHANGED on DB-loaded rows.
 *
 * Activity note: the synthetic fixture's activity is pre-aggregated per agent, so
 * it is loaded under a single scope month ('2026-06'); SELECT_ACTIVITY_AGGREGATED
 * groups it back to one AgentActivity per agent, reproducing the exact values.
 */

import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { DataType, newDb } from "pg-mem";
import { beforeAll, describe, expect, it } from "vitest";

import { computeScope } from "@/lib/engine/score";
import type { AgentResult, ClientMonthRow } from "@/lib/engine/types";
import {
  PgDataStore,
  SEED_AGENTS,
  type Queryable,
} from "@/lib/db/store";
import { ingestActivityCsv, ingestClientsCsv } from "@/lib/ingest/ingest";
import {
  DEMO_ACTIVITY,
  DEMO_CLIENTS,
  DEMO_SETTINGS,
} from "@/tests/fixtures/demo_netdeposit";

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
    query: (text: string, params?: ReadonlyArray<unknown>) => pool.query(text, params as unknown[]),
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

const byEmail = (agents: AgentResult[], email: string): AgentResult => {
  const a = agents.find((x) => x.manager_email === email);
  if (!a) throw new Error(`agent ${email} not found`);
  return a;
};

describe("P2 — DB ingestion → engine (golden via the DB path)", () => {
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

  it("reproduces the golden block through the DB path", async () => {
    const clients = await store.getClientMonths();
    const activity = await store.getActivity();
    const result = computeScope(clients, activity, DEMO_SETTINGS);

    // eslint-disable-next-line no-console
    console.log(
      `[DB→engine] netDeskValue=${result.netDeskValue} pool=${result.pool} ` +
        `ranking=${[...result.agents].sort((a, b) => a.rank - b.rank).map((a) => a.manager_email).join(">")}`,
    );
    for (const a of [...result.agents].sort((x, y) => x.rank - y.rank)) {
      // eslint-disable-next-line no-console
      console.log(`  #${a.rank} ${a.manager_email.padEnd(8)} payout=${a.payout.toFixed(2)}`);
    }

    expect(result.netDeskValue).toBeCloseTo(34000, 6);
    expect(result.pool).toBeCloseTo(3400, 6);

    const order = [...result.agents].sort((a, b) => a.rank - b.rank).map((a) => a.manager_email);
    expect(order).toEqual(["lida", "hossein", "lara", "mahya", "armin"]);

    const expected: Record<string, number> = {
      lida: 1331.68,
      hossein: 943.69,
      lara: 768.44,
      mahya: 294.43,
      armin: 61.76,
    };
    for (const [email, want] of Object.entries(expected)) {
      expect(byEmail(result.agents, email).payout).toBeCloseTo(want, 2);
    }

    // Σ payout reconciles to pool through the DB path too.
    const sumPayout = result.agents.reduce((s, a) => s + a.payout, 0);
    expect(Math.abs(sumPayout - result.pool)).toBeLessThanOrEqual(1e-6);

    // UNAPPROVED settings ⇒ result is provisional/unauthorized.
    expect(result.authorized).toBe(false);
  });

  it("seeds display_name labels (hossein→Radin, armin→Ali) without touching the engine key", async () => {
    const res = await db.query("select manager_email, display_name from agent order by manager_email");
    const labels = Object.fromEntries(res.rows.map((r) => [String(r.manager_email), String(r.display_name)]));
    expect(labels.hossein).toBe("Radin");
    expect(labels.armin).toBe("Ali");
    expect(labels.lida).toBe("Lida");
  });

  it("re-uploading the same month is idempotent (no duplicate rows, golden unchanged)", async () => {
    const reClients = await ingestClientsCsv(clientsToCsv(DEMO_CLIENTS), store, { actor: "tester" });
    const reActivity = await ingestActivityCsv(activityToCsv(), store, { actor: "tester" });
    expect(reClients.ok).toBe(true);
    expect(reActivity.ok).toBe(true);

    const counts = await db.__counts();
    expect(counts.clients).toBe(DEMO_CLIENTS.length); // unchanged
    expect(counts.activity).toBe(DEMO_ACTIVITY.length); // unchanged

    const result = computeScope(await store.getClientMonths(), await store.getActivity(), DEMO_SETTINGS);
    expect(result.netDeskValue).toBeCloseTo(34000, 6);
    expect(byEmail(result.agents, "lida").payout).toBeCloseTo(1331.68, 2);
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
