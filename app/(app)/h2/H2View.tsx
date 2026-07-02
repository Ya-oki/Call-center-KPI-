"use client";

/**
 * /h2 client view — H2 design lab. Reuses /overview's design language (slate +
 * amber tokens) but is a separate component, so /overview is never affected.
 */

import { useState } from "react";

interface AgentPreview {
  name: string;
  avgScore: number;
  salary: number;
}
export interface ForwardConfig {
  floor: number;
  capOptions: number[];
  curveOptions: number[];
  payoutAuthorized: boolean;
  concentrationEnabled: boolean;
  concCapPct: number;
  conductPipelineEnabled: boolean;
  targetCapital: number;
  targetEngage: number;
}

function progressivePct(score: number, cap: number, floor: number, curveP: number): number {
  if (score <= floor) return 0;
  return cap * ((score - floor) / (100 - floor)) ** curveP;
}

export function H2View({
  agents,
  forward,
  currency,
}: {
  agents: AgentPreview[];
  forward: ForwardConfig;
  currency: string;
}) {
  const [cap, setCap] = useState<number>(forward.capOptions[0] ?? 0.2);
  const [curve, setCurve] = useState<number>(forward.curveOptions[0] ?? 1.5);

  const money = (n: number): string =>
    new Intl.NumberFormat("en-US", { style: "currency", currency, minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
  const pct1 = (n: number): string => `${(n * 100).toFixed(1)}%`;

  const pill = (active: boolean): string =>
    active ? "bg-slate-100 text-slate-900" : "border border-slate-700 text-slate-300 hover:bg-slate-800";

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200">
      <main className="mx-auto max-w-5xl px-6 py-8">
        <header className="mb-4">
          <h1 className="text-xl font-semibold text-slate-50">H2 Forward System — IN DESIGN</h1>
          <p className="mt-1 text-sm text-slate-400">
            Design lab for the going-forward incentive.{" "}
            <span className="text-slate-300">/overview remains the H1 back-pay record</span> —
            nothing here changes it.
          </p>
        </header>

        {!forward.payoutAuthorized ? (
          <div role="alert" className="mb-6 flex items-start gap-3 rounded-xl border border-amber-500/50 bg-amber-500/10 px-4 py-3">
            <span aria-hidden className="mt-0.5 text-lg leading-none text-amber-400">⚠</span>
            <div>
              <div className="text-sm font-semibold uppercase tracking-wide text-amber-300">
                Preview — pending CEO sign-off (cap % + curve)
              </div>
              <div className="mt-0.5 text-sm text-amber-200/90">
                Figures below are illustrative: the progressive mapping applied to H1
                scores. Real H2 numbers need recalibrated live data.
              </div>
            </div>
          </div>
        ) : null}

        {/* Progressive preview */}
        <section className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-slate-100">Progressive payouts (preview)</h2>
            <div className="flex flex-wrap items-center gap-4 text-xs">
              <span className="flex items-center gap-2">
                <span className="text-slate-400">CAP</span>
                {forward.capOptions.map((c) => (
                  <button key={c} onClick={() => setCap(c)} className={`rounded-md px-2 py-1 font-medium ${pill(cap === c)}`}>
                    {Math.round(c * 100)}%
                  </button>
                ))}
              </span>
              <span className="flex items-center gap-2">
                <span className="text-slate-400">CURVE_P</span>
                {forward.curveOptions.map((p) => (
                  <button key={p} onClick={() => setCurve(p)} className={`rounded-md px-2 py-1 font-medium ${pill(curve === p)}`}>
                    {p}
                  </button>
                ))}
              </span>
            </div>
          </div>
          <table className="w-full text-sm tabular-nums">
            <thead className="text-slate-400">
              <tr className="text-left">
                <th className="py-1 pr-3 font-medium">Agent</th>
                <th className="py-1 pr-3 text-right font-medium">H1 avg score</th>
                <th className="py-1 pr-3 text-right font-medium">Bonus %</th>
                <th className="py-1 text-right font-medium">Bonus (illustrative)</th>
              </tr>
            </thead>
            <tbody className="text-slate-200">
              {agents.map((a) => {
                const p = progressivePct(a.avgScore, cap, forward.floor, curve);
                return (
                  <tr key={a.name} className="border-t border-slate-800/70">
                    <td className="py-1.5 pr-3 font-medium text-slate-100">{a.name}</td>
                    <td className="py-1.5 pr-3 text-right">{a.avgScore.toFixed(1)}</td>
                    <td className="py-1.5 pr-3 text-right">{pct1(p)}</td>
                    <td className="py-1.5 text-right">{money(p * a.salary)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="mt-2 text-xs text-slate-500">
            bonus % = CAP × (max(0, score − {forward.floor}) / (100 − {forward.floor}))<sup>{curve}</sup>. No bonus at/below {forward.floor}.
          </p>
        </section>

        {/* Concentration section */}
        <section className="mt-4 rounded-xl border border-slate-800 bg-slate-900/40 p-4">
          <h2 className="text-sm font-semibold text-slate-100">Concentration &amp; risk overlay (SOT §7)</h2>
          <p className="mt-2 text-sm text-slate-400">
            Concentration cap:{" "}
            <span className="rounded-md border border-slate-700 bg-slate-800/60 px-2 py-0.5 text-xs text-slate-300">
              no per-client feed yet
            </span>{" "}
            — awaiting the monthly per-client export. When live and enabled, a single
            client&apos;s contribution to the capital pillar is capped at{" "}
            {Math.round(forward.concCapPct * 100)}% of target ({money(forward.concCapPct * forward.targetCapital)}),
            and books with floating losses over 50% of net deposits get a{" "}
            <span className="text-amber-300">book-risk review</span> badge — visibility only,
            no automatic score effect (deposit-pressure becomes a score hit only via the
            conduct pipeline, once substantiated).
          </p>
          <p className="mt-2 text-xs text-slate-500">
            conduct pipeline: {forward.conductPipelineEnabled ? "enabled" : "off (no flag feed yet)"} · concentration cap:{" "}
            {forward.concentrationEnabled ? "enabled" : "off"}
          </p>
        </section>

        {/* §8 preconditions */}
        <footer className="mt-4 rounded-xl border border-slate-800 bg-slate-900/30 px-4 py-4 text-xs leading-relaxed text-slate-400">
          <div className="mb-1 font-semibold text-slate-300">Before progressive ships — two hard preconditions (SOT §8):</div>
          <ol className="ml-4 list-decimal space-y-1">
            <li><span className="font-medium text-slate-300">Recalibrate first</span> (targets {forward.targetCapital.toLocaleString()} / {forward.targetEngage} on real live data) — on saturated scores the convex curve rewards noise.</li>
            <li><span className="font-medium text-slate-300">Strengthen risk controls first</span> — ship with the hardened conduct gate + concentration/risk overlay, or you pay more to take on more B-book risk.</li>
          </ol>
        </footer>
      </main>
    </div>
  );
}
