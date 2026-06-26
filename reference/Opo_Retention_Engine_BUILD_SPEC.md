# Retention Desk Reward Engine — Master Build Specification
**Version:** 1.0 · **Date:** 2026-06-24 · **For:** Claude Code (autonomous build) · **Owner:** Yasi

---

## 0. How to use this file

This is the single source of truth for building the production system. Open it in Claude Code and work top-to-bottom through the **Build Phases (§13)**. Two companion files belong in the repo and are **canonical references**:

- `Opo_Retention_Desk_Platform_v1.html` — the working prototype. **It is the source of truth for the calculation math and the UX.** Re-implement its behaviour faithfully; do not invent new formulas.
- `Opo_Retention_Desk_Comp_Blueprint_v1.md` — the design rationale (the "why").

**Rule for the coding agent:** if any instinct conflicts with the prototype's math, the prototype wins. If a formula must change, change the unit test in the same commit and flag it to the owner.

---

## 1. What we are building (one paragraph)

A web platform for a forex broker's **retention desk** (account managers who service already-deposited clients — they do not convert leads). The desk earns a shared reward **pool** = a % of the net company revenue its clients generate. Each agent's slice is set by a **contribution score** (outcome + activity, gated by conduct). Part of each reward is paid now; part is **held** until the next quarter to prove the clients stayed. Data arrives as **CSV uploads** from the CRM and the call platform (Zoho/VoIP) — there is **no live CRM connection**. The system computes, stores history, and shows each agent a simple self-serve dashboard.

## 2. Locked product decisions (do not redesign)

| Decision | Value |
|---|---|
| Value metric | **Net company revenue** (spread + commission + swap, net of reversals). Not deposits. |
| Book model | **Pooled / dynamic** → pool + contribution-share, not personal-book commission. |
| Withdrawals | **Never scored as an event.** They flow only through retained revenue + survival. **Impeding a withdrawal lowers conduct.** |
| Holdback | Default **60% paid now / 40% held**, released next quarter if clients survive; clawed back on churn/reversal. |
| Reward weighting | Default **outcome 0.65 / activity 0.35**. |
| Access | **Agents log into their own view**; manager/admin sees all. |
| Stack | **Next.js + Supabase + Vercel** now; **portable to own infra later** (see §12). |
| Naming | Reward / performance, never "commission". |

All numeric defaults are **configuration**, not hardcoded constants.

## 3. Personas & access

- **Agent** — logs in, sees only their own dashboard (where I stand, what I've done, what moves me up, my history). Read-only.
- **Manager / Admin** — sees all agents, the leaderboard, desk overview; uploads data; edits dials/settings; runs quarterly close. Full access.
- **(Future) Finance/Auditor** — read-only access to results + audit log.

## 4. Architecture overview

```
CSV uploads ──► Ingestion & validation ──► Postgres (raw tables)
                                               │
                                  Calculation engine (pure module)
                                               │
                        Results snapshots + Holdback ledger (Postgres)
                                               │
                 Next.js API / server actions ──► React dashboards (role-scoped)
```

- **Engine is pure & deterministic** — no DB or network calls inside it. Input: arrays of typed rows + settings. Output: computed result objects. This makes it unit-testable and portable.
- **Recompute is explicit** — uploading data or changing dials triggers a recompute for the affected scope; results are snapshotted.

## 5. Repo structure (Next.js App Router, TypeScript)

```
/retention-engine
  /app
    /(auth)/login
    /(app)/overview      # manager
    /(app)/leaderboard   # manager
    /(app)/agent/[id]    # manager view of an agent
    /(app)/me            # agent's own view
    /(app)/data          # manager: uploads, templates, export
    /(app)/settings      # manager: dials, OKR targets
    /api/...             # route handlers (or server actions)
  /lib
    /engine
      score.ts           # PURE calculation engine (mirrors prototype)
      score.test.ts      # invariant + golden tests
      types.ts
    /ingest
      parseCsv.ts
      validate.ts        # schema + mapping + error report
    /db
      schema.sql         # canonical DDL
      queries.ts
    /auth                # role helpers, RLS-aware client
  /reference
    Opo_Retention_Desk_Platform_v1.html
    Opo_Retention_Desk_Comp_Blueprint_v1.md
  CLAUDE.md
  README.md
  .env.example
```

## 6. Data model (Postgres DDL — canonical)

```sql
-- people who can log in
create table app_user (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  role text not null check (role in ('agent','manager','auditor')),
  agent_id text,            -- links an agent login to their agent_id; null for manager
  created_at timestamptz default now()
);

create table agent (
  agent_id text primary key,
  name text not null,
  start_date date,
  active boolean default true
);

-- one row per client per month (from CRM export)
create table client_month (
  period text not null,            -- 'YYYY-MM'
  client_id text not null,
  agent_id text not null references agent(agent_id),
  status text not null check (status in ('active','dormant','churned')),
  net_revenue numeric not null default 0,
  deposits numeric default 0,
  withdrawals numeric default 0,
  bonus_credit numeric default 0,
  primary key (period, client_id)  -- idempotent upsert key
);

-- one row per agent per month (from Zoho/VoIP + manual)
create table activity_month (
  period text not null,
  agent_id text not null references agent(agent_id),
  qualified_calls int default 0,
  talk_time_min int default 0,
  messages int default 0,
  avg_response_min numeric,
  clients_covered int default 0,
  assigned_clients int default 0,
  conduct_score numeric default 1,        -- 0..1
  withdrawal_impeding_flag int default 0, -- 0/1
  primary key (period, agent_id)
);

-- versioned dials so historical results are reproducible
create table settings_version (
  id uuid primary key default gen_random_uuid(),
  effective_from timestamptz default now(),
  payout_rate numeric, hold_pct numeric, outcome_weight numeric,
  impede_penalty numeric, currency text, retention_target numeric,
  created_by uuid references app_user(id)
);

-- immutable computed snapshot for a scope (quarter close)
create table result_snapshot (
  id uuid primary key default gen_random_uuid(),
  scope text not null,                 -- 'YYYY-MM' or 'YYYY-Qn' or 'H1-2026'
  settings_version_id uuid references settings_version(id),
  computed_at timestamptz default now(),
  net_desk_revenue numeric, pool numeric, locked boolean default false
);
create table result_agent (
  snapshot_id uuid references result_snapshot(id),
  agent_id text references agent(agent_id),
  outcome_idx numeric, activity_idx numeric, conduct_final numeric,
  score numeric, share numeric, payout numeric, paid_now numeric, held numeric,
  rank int,
  primary key (snapshot_id, agent_id)
);

-- holdback lifecycle
create table holdback_ledger (
  id uuid primary key default gen_random_uuid(),
  agent_id text references agent(agent_id),
  source_scope text, amount numeric,
  status text check (status in ('held','released','clawed_back')) default 'held',
  release_scope text, resolved_at timestamptz
);

-- audit everything that touches pay
create table audit_log (
  id bigserial primary key,
  at timestamptz default now(),
  user_id uuid references app_user(id),
  action text,        -- 'upload','recompute','dial_change','close','release','clawback'
  detail jsonb
);
```

**Row-Level Security (Supabase):** agents may `select` from `result_agent` / `holdback_ledger` **only where `agent_id` matches their own**. Managers/auditors select all. Only managers may write raw tables, settings, and run close.

## 7. Ingestion pipeline

1. Manager uploads two CSVs (clients, activity). Templates downloadable from the UI.
2. **Validate**: required columns present, `period` matches `YYYY-MM`, numerics parse, `status`/flags in allowed sets, no commas inside values. Produce a **per-row error report**; reject the file if critical errors, accept with warnings otherwise.
3. **Upsert** by primary key (`period,client_id` and `period,agent_id`) → re-uploading a month overwrites it cleanly (idempotent).
4. Auto-create missing `agent` rows from activity file.
5. Write an `audit_log` upload entry.
6. Trigger recompute for affected periods.

## 8. Calculation engine spec (mirror prototype exactly)

Pure function `computeScope(clients, activity, settings) → ScopeResult`. Formulas (canonical — copied from the verified prototype):

```
periods       = sorted distinct client.period in scope
netDeskRevenue = Σ client.net_revenue over scope
pool          = max(0, netDeskRevenue) × (payout_rate/100)
holdFrac      = hold_pct/100
wo            = outcome_weight/100 ;  wa = 1 - wo
penaltyMult   = 1 - (impede_penalty/100)

Per agent a:
  rev_a         = Σ net_revenue of a's client-month rows in scope
  ownClients_a  = clients whose LATEST-in-scope servicing agent == a
  survived_a    = ownClients_a whose latest status != 'churned'
  survRate_a    = survived_a / ownClients_a            (0 if none)
  coverage_a    = min(1, clients_covered / assigned_clients)   (1 if no assigned)
  avgResp_a     = mean(avg_response_min)                (null if none)
  conduct_a     = mean(conduct_score)                  (1 if none)

  outcomeRaw_a    = max(0, rev_a) × (0.5 + 0.5 × survRate_a)
  respScore_a     = avgResp_a==null ? 0 : 1/(1 + avgResp_a/15)
  activityComp_a  = 0.35·calls + 0.20·(talk/10) + 0.20·messages
                    + 0.15·(respScore·100) + 0.10·(coverage·100)

  outcomeIdx_a    = outcomeRaw_a   / max(outcomeRaw over agents)     (0 if max=0)
  activityIdx_a   = activityComp_a / max(activityComp over agents)   (0 if max=0)
  conductFinal_a  = impedeCount_a>0 ? min(conduct_a, penaltyMult) : conduct_a
  score_a         = conductFinal_a × (wo·outcomeIdx_a + wa·activityIdx_a)

  share_a   = score_a / Σ score        (0 if Σ=0)
  payout_a  = pool × share_a
  paidNow_a = payout_a × (1 - holdFrac)
  held_a    = payout_a × holdFrac
rank: sort agents by payout desc.
```

**The internal activity sub-weights (0.35/0.20/0.20/0.15/0.10) are v1 constants matching the prototype; expose them as config in a later phase, not now.**

### Acceptance tests (must pass — these are the contract)

Using the prototype's demo data (`scope = all`):
- `Σ share == 1` (when `Σ score > 0`), tolerance 1e-9.
- `Σ payout == pool` and `Σ (paidNow + held) == pool`, tolerance 1e-6.
- An agent with `withdrawal_impeding_flag` ⇒ `conductFinal ≤ penaltyMult`.
- **Golden numbers** (payout_rate 10, hold 40, outcome_weight 65, penalty 50): netDeskRevenue = **42,420**; pool = **4,242**; ranking order **Mehdi > Omar > Sara > Lena > Niki**; Niki conductFinal = **0.50**. Lock these as a snapshot test.

## 9. API surface (route handlers or server actions)

- `POST /api/upload` (manager) — multipart CSV, kind=clients|activity → validate, upsert, recompute.
- `POST /api/recompute` (manager) — body: scope.
- `GET /api/overview?scope=` — KPIs, revenue-by-month, OKR progress.
- `GET /api/leaderboard?scope=` — agent rows (manager: all).
- `GET /api/agent/:id?scope=` — single agent detail + history (RLS: agent only self).
- `GET /api/me?scope=` — current agent's own detail.
- `GET/PUT /api/settings` (manager) — dials → new `settings_version`.
- `POST /api/close` (manager) — lock a `result_snapshot`, create `holdback_ledger` entries.
- `POST /api/holdback/resolve` (manager) — release or claw back held amounts for a maturing scope.
- `GET /api/export?scope=` — results CSV.

## 10. Frontend (mirror prototype's four views + auth)

Reuse the prototype's layout, bars, and copy. Views: **Overview, Leaderboard, Agent, Data, Settings, How-it-works** for managers; **/me** (the Agent View, self only) for agents. The "How it works" + **Withdrawals policy** text from the prototype must be shown verbatim to agents. Keep the surface simple: one payout number, three drivers, paid-now/held split, "what moves you up".

## 11. Security, privacy, compliance (forex pay data)

- Auth via Supabase Auth (email magic-link or password). Role + `agent_id` on the user profile; enforce with **RLS**, not just UI.
- Treat all pay + revenue data as **confidential**: HTTPS only, encryption at rest (Supabase default), least-privilege service keys, no secrets in the repo (`.env`).
- **Minimize client PII**: store `client_id` only — no client names/emails needed for the calculation. Document this so the CRM export is pseudonymized.
- **Audit log** every upload, dial change, recompute, close, release, clawback.
- **Immutability**: a locked `result_snapshot` cannot be silently changed; corrections create a new snapshot with reason logged (matters given the prior pay dispute).

## 12. Portability to own infrastructure (required)

Design so the later migration off Supabase/Vercel is config, not rewrite:
- **Engine** has zero infra dependencies — moves untouched.
- **Database** is standard Postgres — `schema.sql` runs on any Postgres; RLS policies are portable.
- **Auth & storage** behind thin interfaces (`/lib/auth`, `/lib/storage`) so Supabase Auth/Storage can be swapped for the company's IdP/object store.
- **Config via env vars** only. Provide a **Dockerfile** + `docker-compose.yml` (app + Postgres) so it can run on the company's servers.
- Migration checklist included in README: dump data → run `schema.sql` on target Postgres → restore → repoint env → swap auth adapter.

## 13. Build phases (work in this order)

- **P0 — Scaffold:** Next.js + TS + Supabase project, env, repo, CLAUDE.md, CI lint/test. Commit.
- **P1 — Engine first:** implement `score.ts` + `score.test.ts`; pass all §8 acceptance tests against demo data **before any UI**. This de-risks everything.
- **P2 — DB + ingestion:** schema, CSV parse/validate/upsert, templates, audit log.
- **P3 — Auth + dashboards:** roles, RLS, the six manager views + `/me`, recompute wiring.
- **P4 — Quarterly close + holdback ledger:** snapshots, lock, release/clawback, history.
- **P5 — Harden + deploy:** error reports, exports, Vercel deploy, seed demo data, smoke tests.
- **P6 — Portability:** Dockerfile, compose, migration doc.

Each phase: open a branch, build, run tests, commit, PR, merge.

## 14. CLAUDE.md (put this in the repo root)

```
# Working agreements
- The HTML prototype in /reference is the source of truth for math and UX. Do not invent formulas.
- The calculation engine (/lib/engine/score.ts) must be PURE: no DB, no fetch, no globals. Deterministic.
- Never change a pay formula without updating /lib/engine/score.test.ts in the SAME commit and noting it in the PR.
- All money/scoring values are configuration (settings_version), never hardcoded.
- Enforce access with RLS, not just the UI. Agents see only their own data.
- TypeScript strict. No `any` in engine or db layers.
- Every action that touches pay writes an audit_log row.
- Keep dependencies minimal and portable (standard Postgres, no vendor-only SQL).
- Run `npm test` and `npm run lint` before every commit. Engine acceptance tests must stay green.
```

## 15. How to drive this (runbook for a non-developer)

1. Create a GitHub repo (empty). Create a Supabase project and a Vercel account.
2. Put these three files in the repo: this spec, the HTML prototype, the blueprint.
3. In Claude Code, point it at this repo and say: *"Read Opo_Retention_Engine_BUILD_SPEC.md and execute Phase P0, then stop and show me."* Review, then continue phase by phase (P1, P2, …).
4. After P1, ask: *"Show me the engine test results"* — confirm the golden numbers (42,420 / 4,242 / Mehdi>…>Niki) pass.
5. Connect the repo to Vercel for auto-deploy; put Supabase keys in Vercel env vars (Claude Code will tell you which).
6. When stable, ask Claude Code to execute P6 and hand IT the Docker setup + migration doc.

## 16. Deferred parameters (set as config, not code)

- Payout-rate envelope (decide after backtest reveals the revenue base).
- B-book question: is client trading P&L inside `net_revenue`? (Confirm with Finance; affects the source export, not the engine.)
- Holdback split, weights, impede penalty, OKR targets — all live in `settings_version`.
- Per-client revenue availability: if not exportable, document a proxy (volume × avg markup) as an interim `net_revenue`.

---
*End of spec. Build P1 first and prove the math before building anything else.*
