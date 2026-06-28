/**
 * Demo dashboard (server component) — v2 corrected retention model.
 *
 * Fixture in → engine → out. No DB, no auth, no writes. Renders the SAME
 * computeScope() the tests lock, stamped PROVISIONAL while settings are
 * UNAPPROVED. Zero env required (fixture is in-repo). Read-only.
 */

import { computeScope } from "@/lib/engine/score";
import type { AgentResult, EngineSettings } from "@/lib/engine/types";
import { DEMO_AGENTS, DEMO_SETTINGS } from "@/tests/fixtures/demoData";

// Currency label is configurable but defaults to USD so the demo is one-click.
const CURRENCY = process.env.NEXT_PUBLIC_CURRENCY ?? "USD";

const money = (n: number): string =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: CURRENCY,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);

const pct = (n: number, dp = 1): string =>
  new Intl.NumberFormat("en-US", {
    style: "percent",
    minimumFractionDigits: dp,
    maximumFractionDigits: dp,
  }).format(n);

const score2 = (n: number): string => n.toFixed(2);

function Pillar({
  label,
  value,
  max,
}: {
  label: string;
  value: number;
  max: number;
}) {
  const frac = max > 0 ? Math.max(0, Math.min(1, value / max)) : 0;
  return (
    <div>
      <div className="flex items-baseline justify-between text-xs">
        <span className="text-slate-400">{label}</span>
        <span className="tabular-nums text-slate-200">
          {score2(value)}{" "}
          <span className="text-slate-500">/ {max}</span>
        </span>
      </div>
      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-700/50">
        <div
          className="h-full rounded-full bg-sky-500"
          style={{ width: `${frac * 100}%` }}
        />
      </div>
    </div>
  );
}

function AgentCard({
  a,
  weights,
}: {
  a: AgentResult;
  weights: EngineSettings["WEIGHTS"];
}) {
  const gated = a.conduct_multiplier < 1;
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid h-7 w-7 place-items-center rounded-full bg-slate-800 text-xs font-semibold text-slate-300">
            {a.rank}
          </span>
          <div>
            <div className="font-semibold text-slate-50">{a.name}</div>
            <div className="text-xs text-slate-500">
              salary {money(a.monthly_salary)}/mo
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-semibold tabular-nums text-slate-50">
            {money(a.monthly_bonus)}
          </div>
          <div className="text-xs text-slate-400">
            {pct(a.bonus_pct_salary)} of salary · final {score2(a.final_score)}/100
          </div>
        </div>
      </div>

      {gated ? (
        <div className="mt-3 inline-flex items-center gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-300">
          ⚠ Conduct gate ×{a.conduct_multiplier.toFixed(2)} — raw{" "}
          {score2(a.raw_score)} reduced to {score2(a.final_score)}
        </div>
      ) : null}

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Pillar label="Retained Capital" value={a.pillars.capital} max={weights.capital} />
        <Pillar label="Client Retention" value={a.pillars.retention} max={weights.retention} />
        <Pillar label="Reactivation" value={a.pillars.engagement} max={weights.engagement} />
        <Pillar label="Service Activity" value={a.pillars.activity} max={weights.activity} />
      </div>
    </div>
  );
}

export default function OverviewDemoPage() {
  const result = computeScope(DEMO_AGENTS, DEMO_SETTINGS);
  const costPctOfMax =
    result.maxPossibleCost > 0 ? result.totalBonusCost / result.maxPossibleCost : 0;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200">
      <main className="mx-auto max-w-5xl px-6 py-8">
        <header className="mb-6">
          <h1 className="text-xl font-semibold text-slate-50">
            Retention Desk · Monthly Bonus
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Demo · synthetic data · target-based, capped, conduct-gated · bonus
            ceiling {DEMO_SETTINGS.CEILING_PCT}% of salary
          </p>
        </header>

        {/* PROVISIONAL banner — impossible to miss */}
        {!result.authorized && result.disclaimer ? (
          <div
            role="alert"
            className="mb-6 flex items-start gap-3 rounded-xl border border-amber-500/50 bg-amber-500/10 px-4 py-3"
          >
            <span aria-hidden className="mt-0.5 text-lg leading-none text-amber-400">
              ⚠
            </span>
            <div>
              <div className="text-sm font-semibold uppercase tracking-wide text-amber-300">
                Provisional — not an authorized payout
              </div>
              <div className="mt-0.5 text-sm text-amber-200/90">{result.disclaimer}</div>
            </div>
          </div>
        ) : null}

        {/* Agents, sorted by bonus desc */}
        <section className="space-y-3">
          {result.agents.map((a) => (
            <AgentCard key={a.email} a={a} weights={DEMO_SETTINGS.WEIGHTS} />
          ))}
        </section>

        {/* Cost footer — total vs max possible, always visible */}
        <footer className="mt-6 rounded-xl border border-slate-800 bg-slate-900/30 px-4 py-4 text-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-slate-400">
              Total monthly bonus cost{" "}
              <span className="font-semibold text-slate-100">
                {money(result.totalBonusCost)}
              </span>{" "}
              of max possible{" "}
              <span className="font-semibold text-slate-100">
                {money(result.maxPossibleCost)}
              </span>
            </span>
            <span className="tabular-nums text-slate-400">
              {pct(costPctOfMax)} of ceiling
            </span>
          </div>
          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-800">
            <div
              className="h-full rounded-full bg-emerald-500/80"
              style={{ width: `${Math.min(1, costPctOfMax) * 100}%` }}
            />
          </div>
          <p className="mt-3 text-xs leading-relaxed text-slate-500">
            Bonus = (final score / 100) × {DEMO_SETTINGS.CEILING_PCT}% × salary.
            Four capped pillars (Retained Capital /{DEMO_SETTINGS.WEIGHTS.capital},
            Client Retention /{DEMO_SETTINGS.WEIGHTS.retention}, Reactivation /
            {DEMO_SETTINGS.WEIGHTS.engagement}, Service Activity /
            {DEMO_SETTINGS.WEIGHTS.activity}) scored against fixed targets, then
            gated by conduct. Numbers are{" "}
            <span className="font-semibold text-amber-300">PROVISIONAL</span>{" "}
            pending executive sign-off.
          </p>
        </footer>
      </main>
    </div>
  );
}
