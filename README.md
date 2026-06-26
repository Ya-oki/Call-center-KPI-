# Retention Desk — Reward & Performance Platform

A web platform for a forex broker's **retention desk**. The desk earns a shared
reward **pool** (a % of the net company revenue its clients generate); each
agent's slice is set by a **contribution score** (outcome + activity, gated by
conduct). Part of each reward is paid now; part is **held** until next quarter to
prove clients stayed. Data arrives as **CSV uploads** (CRM + call platform) — no
live CRM connection.

> Sophisticated underneath (attribution, maturity, anti-gaming, conduct), simple
> on the surface (one payout number, three drivers, paid-now/held split).

## Status — Phase P0 (scaffold)

This repo is at **P0: scaffold only**. The structure, tooling, canonical
database schema, and configuration placeholders are in place. **The reward math
is intentionally not implemented yet** — it is the de-risking core and is built
and locked behind golden-number acceptance tests in **P1** (`lib/engine`).

Canonical references live in [`/reference`](./reference) and **win on any
conflict**:

- `Opo_Retention_Engine_BUILD_SPEC.md` — master build spec (phases P0–P6).
- `Opo_Retention_Desk_Platform_v1.html` — prototype: **source of truth for math + UX**.
- `Opo_Retention_Desk_Comp_Blueprint_v1.md` — design rationale.

See [`CLAUDE.md`](./CLAUDE.md) for working agreements and the phase plan.

## Stack

Next.js (App Router) · TypeScript (strict) · Supabase (Postgres + Auth) · Vercel
— designed to be **portable to own infra later** (standard Postgres, auth/storage
behind thin seams, all config via env vars).

## Getting started

```bash
npm install
cp .env.example .env.local   # fill in Supabase keys
npm run dev                  # http://localhost:3000  → /overview
```

Quality gates (also run in CI):

```bash
npm run typecheck   # tsc --noEmit (strict)
npm run lint        # next lint
npm test            # vitest (engine acceptance tests)
```

## Repo layout

```
app/                 Next.js App Router
  (auth)/login       sign in (P3)
  (app)/overview     manager: desk KPIs (P3)
  (app)/leaderboard  manager: contribution leaderboard (P3)
  (app)/agent/[id]   manager: single-agent detail (P3)
  (app)/me           agent: own self-serve view, RLS-scoped (P3)
  (app)/data         manager: CSV upload / templates / export (P2–P3)
  (app)/settings     manager: dials + OKR targets (P3)
  (app)/method       how-it-works + withdrawals policy (P3)
  api/               route handlers (P2–P4)
lib/
  engine/            PURE reward engine — score.ts / types.ts / score.test.ts (P1)
  config/            dials + modelling-choice placeholders (value metric, survival, attribution)
  ingest/            CSV parse + validate (P2)
  db/                schema.sql (canonical DDL) + queries.ts
  auth/  storage/    portability seams
reference/           canonical spec / prototype / blueprint (do not edit)
```

## Portability (planned, P6)

`schema.sql` runs on any standard Postgres; auth/storage sit behind adapters
selected by `AUTH_PROVIDER` / `STORAGE_PROVIDER`; all config is env-driven. A
Dockerfile + `docker-compose.yml` and a migration checklist land in P6.
