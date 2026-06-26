# Deploy — P3-lite demo (Vercel)

A read-only, **zero-config** demo of the reward engine: synthetic fixture in →
`computeScope()` → dashboard out. **No database, no auth, no environment
variables required.** Every number is stamped **PROVISIONAL** until settings are
APPROVED.

The landing page is `/` (redirects to `/overview`).

---

## What's already deploy-ready

- **Framework**: Next.js 14 (App Router). Vercel auto-detects it — no `vercel.json`
  needed.
- **Build command**: `next build` · **Install**: `npm install` · **Output**: default
  (`.next`). All Vercel defaults; nothing to override.
- **Env vars**: none required. The only optional one is `NEXT_PUBLIC_CURRENCY`
  (defaults to `USD`), so a one-click deploy renders correctly.
- `/overview` is statically prerendered (fixture is in-repo), so first paint is
  instant and there's no server dependency.

Verify locally before deploying:

```bash
npm install
npm run build        # must pass (it does)
npm run start        # serves the production build at http://localhost:3000
```

---

## Option A — Vercel CLI (fastest for a shareable link)

```bash
npm i -g vercel        # if not installed
vercel login           # one time

# from the repo root:
vercel                 # creates the project + a preview deployment (preview URL)
vercel --prod          # promotes to production (the shareable link)
```

Accept the defaults when prompted:
- Set up and deploy? **Y**
- Which scope? **<your account/team>**
- Link to existing project? **N** (first time)
- Project name? **retention-engine** (or anything)
- Directory? **./**
- Override build settings? **N**

The CLI prints the deployment URL. `vercel --prod` gives the stable production URL
to share with the CEO.

## Option B — Vercel dashboard ("Import Project")

1. Push this branch to GitHub (when you're ready).
2. <https://vercel.com/new> → **Import** the repository.
3. Framework preset: **Next.js** (auto-detected). Leave build/output settings as
   default.
4. Environment variables: **none required**. (Optionally add
   `NEXT_PUBLIC_CURRENCY` if you want a non-USD label.)
5. **Deploy**. Vercel builds with `next build` and gives you a production URL plus
   automatic preview URLs for future commits.

---

## Optional configuration

| Variable               | Default | Purpose                          |
| ---------------------- | ------- | -------------------------------- |
| `NEXT_PUBLIC_CURRENCY` | `USD`   | Currency label for money values. |

---

## Notes / scope

- This demo intentionally bypasses the database — it proves the engine end-to-end
  with the locked golden numbers (`netDeskValue 34,000` · `pool 3,400` ·
  `lida > hossein > lara > mahya > armin`). The DB-backed, authenticated app
  (roles, RLS, uploads, recompute) is **P3-proper** and beyond this deploy.
- Because results are PROVISIONAL, the dashboard shows a prominent amber banner.
  Do not represent these as authorized payouts.
