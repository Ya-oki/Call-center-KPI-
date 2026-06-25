/**
 * Data store (P2) — the seam between ingestion and Postgres.
 *
 * PgDataStore runs the canonical SQL (lib/db/queries.ts) against any
 * pg-compatible client via the minimal `Queryable` interface, so it's portable
 * (Supabase/pg in prod, pg-mem in tests) with zero engine coupling. It reads
 * back rows already shaped to the ENGINE's types — the DB conforms to the
 * engine, never the reverse.
 */

import type { AgentActivity, ClientMonthRow, ClientStatus } from "@/lib/engine/types";
import {
  INSERT_AUDIT,
  SELECT_ACTIVITY_AGGREGATED,
  SELECT_CLIENT_MONTHS,
  UPSERT_ACTIVITY_MONTH,
  UPSERT_AGENT_IGNORE,
  UPSERT_AGENT_SEED,
  UPSERT_CLIENT_MONTH,
} from "@/lib/db/queries";

/** Minimal pg-compatible client. node-pg Pool/Client and pg-mem both satisfy it. */
export interface QueryResult {
  rows: Array<Record<string, unknown>>;
  rowCount?: number;
}
export interface Queryable {
  query(text: string, params?: ReadonlyArray<unknown>): Promise<QueryResult>;
}

/** Activity row as produced by ingestion (carries the month it belongs to). */
export type ActivityMonthInput = AgentActivity & { period: string };

export interface SeedAgent {
  manager_email: string;
  display_name: string;
}

/** The 5 real agents (SYNTHETIC emails). display_name is label-only. */
export const SEED_AGENTS: readonly SeedAgent[] = [
  { manager_email: "lida", display_name: "Lida" },
  { manager_email: "lara", display_name: "Lara" },
  { manager_email: "hossein", display_name: "Radin" },
  { manager_email: "mahya", display_name: "Mahya" },
  { manager_email: "armin", display_name: "Ali" },
];

export interface DataStore {
  /** Auto-create any missing agents; returns the count newly created. */
  ensureAgents(emails: string[]): Promise<number>;
  /** Apply canonical display-name labels for known agents. */
  seedAgents(agents: readonly SeedAgent[]): Promise<void>;
  upsertClientMonths(rows: ClientMonthRow[]): Promise<number>;
  upsertActivityMonths(rows: ActivityMonthInput[]): Promise<number>;
  getClientMonths(periods?: string[]): Promise<ClientMonthRow[]>;
  getActivity(periods?: string[]): Promise<AgentActivity[]>;
  insertAudit(action: string, detail: Record<string, unknown>): Promise<void>;
}

function localPart(email: string): string {
  const at = email.indexOf("@");
  return at > 0 ? email.slice(0, at) : email;
}

function periodFilterClause(periods: string[] | undefined, startIndex: number): {
  clause: string;
  params: string[];
} {
  if (!periods || periods.length === 0) return { clause: "", params: [] };
  const placeholders = periods.map((_, i) => `$${startIndex + i}`).join(", ");
  return { clause: ` where period in (${placeholders})`, params: periods };
}

function toClientRow(r: Record<string, unknown>): ClientMonthRow {
  return {
    period: String(r.period),
    client_id: String(r.client_id),
    manager_email: String(r.manager_email),
    net_deposit: Number(r.net_deposit),
    status: String(r.status) as ClientStatus,
  };
}

function toActivity(r: Record<string, unknown>): AgentActivity {
  const avg = r.avg_response_min;
  return {
    manager_email: String(r.manager_email),
    calls: Number(r.calls),
    talk_min: Number(r.talk_min),
    messages: Number(r.messages),
    avg_response_min: avg === null || avg === undefined ? null : Number(avg),
    clients_covered: Number(r.clients_covered),
    assigned_clients: Number(r.assigned_clients),
    conduct: Number(r.conduct),
    impede_flag: Number(r.impede_flag) === 1 ? 1 : 0,
  };
}

export class PgDataStore implements DataStore {
  constructor(private readonly db: Queryable) {}

  async ensureAgents(emails: string[]): Promise<number> {
    const unique = [...new Set(emails)];
    let created = 0;
    for (const email of unique) {
      const res = await this.db.query(UPSERT_AGENT_IGNORE, [email, localPart(email)]);
      created += res.rows.length;
    }
    return created;
  }

  async seedAgents(agents: readonly SeedAgent[]): Promise<void> {
    for (const a of agents) {
      await this.db.query(UPSERT_AGENT_SEED, [a.manager_email, a.display_name]);
    }
  }

  async upsertClientMonths(rows: ClientMonthRow[]): Promise<number> {
    for (const r of rows) {
      await this.db.query(UPSERT_CLIENT_MONTH, [
        r.period,
        r.client_id,
        r.manager_email,
        r.net_deposit,
        r.status,
      ]);
    }
    return rows.length;
  }

  async upsertActivityMonths(rows: ActivityMonthInput[]): Promise<number> {
    for (const r of rows) {
      await this.db.query(UPSERT_ACTIVITY_MONTH, [
        r.period,
        r.manager_email,
        r.calls,
        r.talk_min,
        r.messages,
        r.avg_response_min,
        r.clients_covered,
        r.assigned_clients,
        r.conduct,
        r.impede_flag,
      ]);
    }
    return rows.length;
  }

  async getClientMonths(periods?: string[]): Promise<ClientMonthRow[]> {
    const { clause, params } = periodFilterClause(periods, 1);
    const res = await this.db.query(SELECT_CLIENT_MONTHS + clause, params);
    return res.rows.map(toClientRow);
  }

  async getActivity(periods?: string[]): Promise<AgentActivity[]> {
    const { clause, params } = periodFilterClause(periods, 1);
    const sql = SELECT_ACTIVITY_AGGREGATED + clause + " group by manager_email";
    const res = await this.db.query(sql, params);
    return res.rows.map(toActivity);
  }

  async insertAudit(action: string, detail: Record<string, unknown>): Promise<void> {
    await this.db.query(INSERT_AUDIT, [action, JSON.stringify(detail)]);
  }
}
