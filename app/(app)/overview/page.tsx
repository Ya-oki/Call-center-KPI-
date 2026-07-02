/**
 * Demo dashboard (server component) — v3, REAL H1 back-pay.
 *
 * Loads the committed H1 CSVs → computeBackPay (placeholder targets, D
 * redistributed, conduct 1.0, ×6, linear 15%) and hands serializable results to
 * a client mode-toggle. Read-only. Stamped PROVISIONAL until CEO sign-off.
 * Zero env required; statically prerendered at build.
 */

import { computeBackPay } from "@/lib/engine/score";
import { readH1Data, SYSTEMIC_EVENT_MONTHS } from "@/lib/ingest/h1";
import {
  BACKPAY_H1_SETTINGS,
  BACKPAY_MONTHS_MULTIPLIER,
  CAP_PCT_OPTIONS,
  DEFAULT_ENGINE_SETTINGS,
} from "@/lib/config/defaults";
import { ModeToggle } from "./ModeToggle";

export default function OverviewPage() {
  const bp = computeBackPay(readH1Data(), BACKPAY_H1_SETTINGS, {
    multiplier: BACKPAY_MONTHS_MULTIPLIER,
  });

  const backpay = {
    agents: bp.agents.map((a) => ({
      name: a.name,
      rank: a.rank,
      salary: a.monthly_salary,
      avgScore: a.avg_score,
      monthlyBonus: a.monthly_bonus,
      total: a.backpay_total,
      months: a.months.map((m) => ({
        month: m.month,
        A: m.pillars.capital,
        B: m.pillars.retention,
        C: m.pillars.engagement,
        finalScore: m.final_score,
        systemic: SYSTEMIC_EVENT_MONTHS.has(m.month),
      })),
    })),
    monthlyCost: bp.monthlyCost,
    totalCost: bp.totalCost,
    maxMonthlyCost: bp.maxMonthlyCost,
    maxTotalCost: bp.maxTotalCost,
    multiplier: bp.multiplier,
    ceilingPct: BACKPAY_H1_SETTINGS.CEILING_PCT,
    weights: BACKPAY_H1_SETTINGS.WEIGHTS,
  };

  const forward = {
    floor: DEFAULT_ENGINE_SETTINGS.FLOOR,
    curveP: DEFAULT_ENGINE_SETTINGS.CURVE_P,
    capOptions: [...CAP_PCT_OPTIONS],
    targetCapital: DEFAULT_ENGINE_SETTINGS.TARGET_CAPITAL,
    targetEngage: DEFAULT_ENGINE_SETTINGS.TARGET_ENGAGE,
  };

  const currency = process.env.NEXT_PUBLIC_CURRENCY ?? "USD";
  const authorized = bp.authorized;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200">
      <main className="mx-auto max-w-5xl px-6 py-8">
        <header className="mb-6">
          <h1 className="text-xl font-semibold text-slate-50">
            Retention Desk · Compensation
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            H1 2026 back-pay · real data (aliases) · Feb–Jun ×{bp.multiplier} ·
            conduct 1.0 · linear {Math.round(BACKPAY_H1_SETTINGS.CEILING_PCT * 100)}%
          </p>
        </header>

        {/* PROVISIONAL banner — impossible to miss */}
        {!authorized ? (
          <div
            role="alert"
            className="mb-6 flex items-start gap-3 rounded-xl border border-amber-500/50 bg-amber-500/10 px-4 py-3"
          >
            <span aria-hidden className="mt-0.5 text-lg leading-none text-amber-400">
              ⚠
            </span>
            <div>
              <div className="text-sm font-semibold uppercase tracking-wide text-amber-300">
                Provisional
              </div>
              <div className="mt-0.5 text-sm text-amber-200/90">
                Back-pay FINAL pending CEO ceiling sign-off. H2 forward system in
                design.
              </div>
            </div>
          </div>
        ) : null}

        <ModeToggle backpay={backpay} forward={forward} currency={currency} />
      </main>
    </div>
  );
}
