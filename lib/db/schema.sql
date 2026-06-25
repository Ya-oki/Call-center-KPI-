-- ─────────────────────────────────────────────────────────────────────────────
-- Retention Engine — canonical Postgres DDL
-- Reconciled in P2 to the ENGINE's vocabulary (lib/engine/types.ts is the source
-- of truth; the schema conforms to it, never the reverse):
--   value metric  = net_deposit (deposit − withdrawal; may be negative)
--   attribution   = manager_email (point-in-time servicing agent on each row)
--
-- Standard Postgres only (no vendor-only SQL) so it runs on any Postgres for the
-- later migration off Supabase (BUILD_SPEC §12). Idempotent (if not exists).
-- ─────────────────────────────────────────────────────────────────────────────

-- Required for gen_random_uuid() on stock Postgres (Supabase has it enabled).
create extension if not exists pgcrypto;

-- ── Agent roster — manager_email is the canonical key ────────────────────────
create table if not exists agent (
  manager_email text primary key,
  display_name  text,                          -- label only; defaults to email local-part
  role          text default 'retention_agent',
  active        boolean default true,
  start_date    date
);

-- ── People who can log in ────────────────────────────────────────────────────
create table if not exists app_user (
  id            uuid primary key default gen_random_uuid(),
  email         text unique not null,
  role          text not null check (role in ('agent','manager','auditor')),
  manager_email text references agent(manager_email),  -- links an agent login to their roster row; null for manager
  created_at    timestamptz default now()
);

-- ── One row per client per month (from CRM export) ───────────────────────────
create table if not exists client_month (
  period        text not null,                 -- 'YYYY-MM'
  client_id     text not null,
  manager_email text not null references agent(manager_email),
  net_deposit   numeric not null default 0,    -- deposit − withdrawal; MAY BE NEGATIVE (not floored)
  status        text not null check (status in ('active','dormant','churned')),
  primary key (period, client_id)              -- idempotent upsert key
);

-- ── One row per agent per month (from Zoho/VoIP + manual) ─────────────────────
create table if not exists activity_month (
  period           text not null,
  manager_email    text not null references agent(manager_email),
  calls            int default 0,
  talk_min         int default 0,
  messages         int default 0,
  avg_response_min numeric,                     -- nullable: no responsiveness signal
  clients_covered  int default 0,
  assigned_clients int default 0,
  conduct          numeric default 1,           -- 0..1
  impede_flag      int default 0,               -- 0/1 withdrawal-impeding
  primary key (period, manager_email)
);

-- ── Versioned dials so historical results are reproducible ───────────────────
-- Every money/scoring default lives here, never hardcoded (BUILD_SPEC §14).
-- `status` is the approval gate the engine reads (UNAPPROVED ⇒ PROVISIONAL).
create table if not exists settings_version (
  id               uuid primary key default gen_random_uuid(),
  effective_from   timestamptz default now(),
  payout_rate      numeric,   -- % of net desk value -> pool
  hold_pct         numeric,   -- % of payout held back
  outcome_weight   numeric,   -- outcome vs activity weighting (0..100)
  impede_penalty   numeric,   -- conduct multiplier penalty for withdrawal-impeding
  currency         text,
  retention_target numeric,   -- OKR: active-client retention target
  status           text not null default 'UNAPPROVED' check (status in ('UNAPPROVED','APPROVED')),
  created_by       uuid references app_user(id)
);

-- ── Immutable computed snapshot for a scope (quarter close) ──────────────────
create table if not exists result_snapshot (
  id                  uuid primary key default gen_random_uuid(),
  scope               text not null,            -- 'YYYY-MM' or 'YYYY-Qn' or 'H1-2026'
  settings_version_id uuid references settings_version(id),
  computed_at         timestamptz default now(),
  net_desk_value      numeric,                  -- Σ net_deposit in scope (may be negative)
  pool                numeric,
  locked              boolean default false
);

create table if not exists result_agent (
  snapshot_id   uuid references result_snapshot(id),
  manager_email text references agent(manager_email),
  outcome_idx   numeric,
  activity_idx  numeric,
  conduct_final numeric,
  score         numeric,
  share         numeric,
  payout        numeric,
  paid_now      numeric,
  held          numeric,
  rank          int,
  primary key (snapshot_id, manager_email)
);

-- ── Holdback lifecycle ───────────────────────────────────────────────────────
create table if not exists holdback_ledger (
  id            uuid primary key default gen_random_uuid(),
  manager_email text references agent(manager_email),
  source_scope  text,
  amount        numeric,
  status        text check (status in ('held','released','clawed_back')) default 'held',
  release_scope text,
  resolved_at   timestamptz
);

-- ── Audit everything that touches pay ────────────────────────────────────────
create table if not exists audit_log (
  id      bigserial primary key,
  at      timestamptz default now(),
  user_id uuid references app_user(id),
  action  text,        -- 'upload','recompute','dial_change','close','release','clawback'
  detail  jsonb
);

-- ─────────────────────────────────────────────────────────────────────────────
-- Row-Level Security (BUILD_SPEC §6, §11)
-- Agents may read only their own result_agent / holdback_ledger rows (matched by
-- manager_email). Managers/auditors read all. Only managers write raw tables,
-- settings, close.
--
-- P2 NOTE: Policies are scaffolded here as canonical intent. They are wired to
-- Supabase Auth (auth.uid()) and verified end-to-end in P3 (Auth + RLS). Left
-- commented so the DDL applies cleanly on a fresh Postgres before auth exists.
-- ─────────────────────────────────────────────────────────────────────────────

-- alter table result_agent     enable row level security;
-- alter table holdback_ledger  enable row level security;
--
-- create policy result_agent_self_read on result_agent
--   for select using (
--     exists (
--       select 1 from app_user u
--       where u.id = auth.uid()
--         and (u.role in ('manager','auditor') or u.manager_email = result_agent.manager_email)
--     )
--   );
--
-- create policy holdback_self_read on holdback_ledger
--   for select using (
--     exists (
--       select 1 from app_user u
--       where u.id = auth.uid()
--         and (u.role in ('manager','auditor') or u.manager_email = holdback_ledger.manager_email)
--     )
--   );
