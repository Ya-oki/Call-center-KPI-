# Working agreements

- The HTML prototype in `/reference` is the source of truth for math and UX. Do not invent formulas.
- The calculation engine (`/lib/engine/score.ts`) must be PURE: no DB, no fetch, no globals. Deterministic.
- Never change a pay formula without updating `/lib/engine/score.test.ts` in the SAME commit and noting it in the PR.
- All money/scoring values are configuration (`settings_version` / `lib/config`), never hardcoded.
- Enforce access with RLS, not just the UI. Agents see only their own data.
- TypeScript strict. No `any` in engine or db layers.
- Every action that touches pay writes an `audit_log` row.
- Keep dependencies minimal and portable (standard Postgres, no vendor-only SQL).
- Run `npm test` and `npm run lint` before every commit. Engine acceptance tests must stay green.

## Build phases (work in this order — BUILD_SPEC §13)

- **P0 — Scaffold** ✅ Next.js + TS + tooling, repo structure, CLAUDE.md, CI, canonical `schema.sql`, config placeholders. (No reward math yet.)
- **P1 — Engine first:** implement `score.ts` + `score.test.ts`; pass all §8 acceptance tests against demo data **before any UI**.
  - Golden numbers to hit: `netDeskRevenue = 42,420` · `pool = 4,242` · ranking `Mehdi > Omar > Sara > Lena > Niki` · `Niki conductFinal = 0.50`.
- **P2 — DB + ingestion:** schema, CSV parse/validate/upsert, templates, audit log.
- **P3 — Auth + dashboards:** roles, RLS, the six manager views + `/me`, recompute wiring.
- **P4 — Quarterly close + holdback ledger:** snapshots, lock, release/clawback, history.
- **P5 — Harden + deploy:** error reports, exports, Vercel deploy, seed demo data, smoke tests.
- **P6 — Portability:** Dockerfile, compose, migration doc.

## Repo map

- `app/` — Next.js App Router. `(auth)/login`, `(app)/{overview,leaderboard,agent/[id],me,data,settings,method}`, `api/`.
- `lib/engine/` — pure reward engine (`score.ts`, `types.ts`, `score.test.ts`).
- `lib/config/` — dials + modelling-choice config placeholders (value metric, survival, attribution).
- `lib/ingest/` — CSV parse + validate (P2).
- `lib/db/` — `schema.sql` (canonical DDL) + `queries.ts`.
- `lib/auth/`, `lib/storage/` — portability seams (swap Supabase later).
- `reference/` — canonical spec, prototype, and blueprint. Do not edit; they win on conflict.
