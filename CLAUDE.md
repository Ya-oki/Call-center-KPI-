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
- **P1 — Engine** ✅ pure `score.ts` + tests green. **v3 (real H1 back-pay + H2 forward).**
  - Formula structure unchanged (four capped pillars capital/40·retention/30·engagement/15·activity/15, conduct gate). v3 adds: service-activity **redistribution** `(A+B+C)/85×100` when there's no call feed (SOT §9), and **two bonus modes** — `backpay_linear` `(final/100)·CEILING_PCT·salary` and `forward_progressive` `CAP_PCT·((score−FLOOR)/(100−FLOOR))^CURVE_P·salary` (SOT §8). `progressiveBonusPct` exported.
  - Two settings profiles in `lib/config/defaults.ts`: **forward** `DEFAULT_ENGINE_SETTINGS` recalibrated (`TARGET_CAPITAL 270000`, `TARGET_ENGAGE 600`, `TARGET_ACTIVITY 100 + PENDING_LIVE_FEED`, `CAP_PCT 0.20` (≤0.25), `FLOOR 60`, `CURVE_P 1.5`); **back-pay** `BACKPAY_H1_SETTINGS` keeps the v2 **placeholder** targets 150k/50 by design (they saturate — SOT §5). `CEILING_PCT` now a fraction (0.15).
  - Real H1 data in `data/*.csv` (aliases; retention trimmed at the CONDUCT separator — no client PII). Loader `lib/ingest/h1.ts` joins financials+retention on alias+month, Feb–Jun trio only (Mahya/Armin excluded), D null, conduct 1.0 (misconduct-only gate; Lida's platform flags cleared — SOT §10).
  - **GOLDEN (real data, `lib/engine/h1_backpay.test.ts`)**: Lida $1,382.22 · Lara $1,351.43 · Radin $1,299.34; trio **$4,032.99**; Radin ranks last (rigging gone). Synthetic `demoData.ts` pinned as a pure-math regression.
  - Dashboard `/overview`: real back-pay with per-month pillar breakdown (D "no feed — redistributed"), March systemic-event footnote, cost vs max, + client mode toggle (Back-pay linear / H2 Forward progressive **preview-only**). Banner: "Back-pay FINAL pending CEO ceiling sign-off."
  - OUT OF SCOPE (not built): capital concentration/risk overlay (SOT §7); two-source call ETL (SOT §9).
- **P2 — DB + ingestion** ✅ `schema.sql` reconciled to the engine's vocabulary (`net_deposit` / `manager_email`); CSV parse + validate (per-row error report, negatives allowed), idempotent upsert on PKs, agent auto-create + seed, audit row per upload. Integration test (pg-mem, real DDL + SQL) proves the DB path reproduces the golden block. 22 tests green.
- **P3-lite — Demo dashboard** ✅ read-only `/overview` server component: fixture → `computeScope` → executive table, PROVISIONAL banner while UNAPPROVED. No DB/auth/writes. Tailwind. Vercel-ready, zero env (`DEPLOY.md`).
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
