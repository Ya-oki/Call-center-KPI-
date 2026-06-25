-- ─────────────────────────────────────────────────────────────────────────────
-- Retention Engine — canonical Postgres DDL
-- Source of truth: Opo_Retention_Engine_BUILD_SPEC.md §6.
-- Standard Postgres only (no vendor-only SQL) so it runs on any Postgres for the
-- later migration off Supabase (BUILD_SPEC §12).
--
-- P0 NOTE: This is the canonical schema. Ingestion, calculation, and close logic
-- that populate result_snapshot / result_agent / holdback_ledger arrive in later
-- phases (P2–P4). The DDL is laid down now so the structure is reviewable.
-- ─────────────────────────────────────────────────────────────────────────────

-- Required for gen_random_uuid() on stock Postgres (Supabase has it enabled).
create extension if not exists pgcrypto;

-- ── People who can log in ────────────────────────────────────────────────────
create table if not exists app_user (
  id         uuid primary key default gen_random_uuid(),
  email      text unique not null,
  role       text not null check (role in ('agent','manager','auditor')),
  agent_id   text,            -- links an agent login to their agent_id; null for manager
  created_at timestamptz default now()
);

-- ── Agent roster ─────────────────────────────────────────────────────────────
create table if not exists agent (
  agent_id   text primary key,
  name       text not null,
  start_date date,
  active     boolean default true
);

-- ── One row per client per month (from CRM export) ───────────────────────────
create table if not exists client_month (
  period       text not null,            -- 'YYYY-MM'
  client_id    text not null,
  agent_id     text not null references agent(agent_id),
  status       text not null check (status in ('active','dormant','churned')),
  net_revenue  numeric not null default 0,
  deposits     numeric default 0,
  withdrawals  numeric default 0,
  bonus_credit numeric default 0,
  primary key (period, client_id)         -- idempotent upsert key
);

-- ── One row per agent per month (from Zoho/VoIP + manual) ─────────────────────
create table if not exists activity_month (
  period                  text not null,
  agent_id                text not null references agent(agent_id),
  qualified_calls         int default 0,
  talk_time_min           int default 0,
  messages                int default 0,
  avg_response_min        numeric,
  clients_covered         int default 0,
  assigned_clients        int default 0,
  conduct_score           numeric default 1,   -- 0..1
  withdrawal_impeding_flag int default 0,       -- 0/1
  primary key (period, agent_id)
);

-- ── Versioned dials so historical results are reproducible ───────────────────
-- Every money/scoring default lives here, never hardcoded (BUILD_SPEC §14).
create table if not exists settings_version (
  id              uuid primary key default gen_random_uuid(),
  effective_from  timestamptz default now(),
  payout_rate     numeric,   -- % of net desk revenue -> pool
  hold_pct        numeric,   -- % of payout held back
  outcome_weight  numeric,   -- outcome vs activity weighting (0..100)
  impede_penalty  numeric,   -- conduct multiplier penalty for withdrawal-impeding
  currency        text,
  retention_target numeric,  -- OKR: active-client retention target
  created_by      uuid references app_user(id)
);

-- ── Immutable computed snapshot for a scope (quarter close) ──────────────────
create table if not exists result_snapshot (
  id                  uuid primary key default gen_random_uuid(),
  scope               text not null,   -- 'YYYY-MM' or 'YYYY-Qn' or 'H1-2026'
  settings_version_id uuid references settings_version(id),
  computed_at         timestamptz default now(),
  net_desk_revenue    numeric,
  pool                numeric,
  locked              boolean default false
);

create table if not exists result_agent (
  snapshot_id   uuid references result_snapshot(id),
  agent_id      text references agent(agent_id),
  outcome_idx   numeric,
  activity_idx  numeric,
  conduct_final numeric,
  score         numeric,
  share         numeric,
  payout        numeric,
  paid_now      numeric,
  held          numeric,
  rank          int,
  primary key (snapshot_id, agent_id)
);

-- ── Holdback lifecycle ───────────────────────────────────────────────────────
create table if not exists holdback_ledger (
  id            uuid primary key default gen_random_uuid(),
  agent_id      text references agent(agent_id),
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
-- Agents may read only their own result_agent / holdback_ledger rows.
-- Managers/auditors read all. Only managers write raw tables, settings, close.
--
-- P0 NOTE: Policies are scaffolded here as the canonical intent. They are wired
-- to Supabase Auth (auth.uid()) and verified end-to-end in P3 (Auth + RLS).
-- Enable + refine alongside the auth layer; left commented so the DDL applies
-- cleanly on a fresh Postgres before auth exists.
-- ─────────────────────────────────────────────────────────────────────────────

-- alter table result_agent     enable row level security;
-- alter table holdback_ledger  enable row level security;
--
-- create policy result_agent_self_read on result_agent
--   for select using (
--     exists (
--       select 1 from app_user u
--       where u.id = auth.uid()
--         and (u.role in ('manager','auditor') or u.agent_id = result_agent.agent_id)
--     )
--   );
--
-- create policy holdback_self_read on holdback_ledger
--   for select using (
--     exists (
--       select 1 from app_user u
--       where u.id = auth.uid()
--         and (u.role in ('manager','auditor') or u.agent_id = holdback_ledger.agent_id)
--     )
--   );
