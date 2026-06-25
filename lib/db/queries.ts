/**
 * Canonical parameterized SQL for the ingestion + read paths (P2).
 *
 * One set of standard-Postgres statements, used by PgDataStore against any
 * pg-compatible client (Supabase/pg in prod, pg-mem in tests). Keeping the SQL
 * here — not inline — means the integration test exercises the exact statements
 * production runs.
 */

/** Auto-create an agent if absent; never clobbers an existing display_name. */
export const UPSERT_AGENT_IGNORE = `
  insert into agent (manager_email, display_name, role, active)
  values ($1, $2, 'retention_agent', true)
  on conflict (manager_email) do nothing
  returning manager_email
`;

/** Seed/label an agent; sets the canonical display_name (label only). */
export const UPSERT_AGENT_SEED = `
  insert into agent (manager_email, display_name)
  values ($1, $2)
  on conflict (manager_email) do update set display_name = excluded.display_name
`;

/** Idempotent upsert on (period, client_id) — re-uploading a month overwrites. */
export const UPSERT_CLIENT_MONTH = `
  insert into client_month (period, client_id, manager_email, net_deposit, status)
  values ($1, $2, $3, $4, $5)
  on conflict (period, client_id) do update set
    manager_email = excluded.manager_email,
    net_deposit   = excluded.net_deposit,
    status        = excluded.status
`;

/** Idempotent upsert on (period, manager_email). */
export const UPSERT_ACTIVITY_MONTH = `
  insert into activity_month
    (period, manager_email, calls, talk_min, messages, avg_response_min,
     clients_covered, assigned_clients, conduct, impede_flag)
  values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
  on conflict (period, manager_email) do update set
    calls            = excluded.calls,
    talk_min         = excluded.talk_min,
    messages         = excluded.messages,
    avg_response_min = excluded.avg_response_min,
    clients_covered  = excluded.clients_covered,
    assigned_clients = excluded.assigned_clients,
    conduct          = excluded.conduct,
    impede_flag      = excluded.impede_flag
`;

export const SELECT_CLIENT_MONTHS = `
  select period, client_id, manager_email, net_deposit, status
  from client_month
`;

/**
 * Aggregate monthly activity → one row per agent for the scope, matching the
 * shapes the engine consumes (AgentActivity). Sums volumes, averages the rate
 * metrics, and treats impede as "ever flagged in scope".
 */
export const SELECT_ACTIVITY_AGGREGATED = `
  select
    manager_email,
    coalesce(sum(calls), 0)            as calls,
    coalesce(sum(talk_min), 0)         as talk_min,
    coalesce(sum(messages), 0)         as messages,
    avg(avg_response_min)              as avg_response_min,
    coalesce(sum(clients_covered), 0)  as clients_covered,
    coalesce(sum(assigned_clients), 0) as assigned_clients,
    coalesce(avg(conduct), 1)          as conduct,
    coalesce(max(impede_flag), 0)      as impede_flag
  from activity_month
`;

export const INSERT_AUDIT = `
  insert into audit_log (action, detail) values ($1, $2::jsonb)
`;
