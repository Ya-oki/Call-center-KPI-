"use client";

/**
 * Client mode toggle for the demo dashboard.
 *   - Back-pay (linear 15%): the real H1 per-agent results, monthly pillar
 *     breakdown (D marked "no feed — redistributed"), March systemic-event
 *     footnote, cost vs max footer.
 *   - H2 Forward (progressive): PREVIEW ONLY — the progressive curve at a
 *     configurable CAP, plus the two hard preconditions. No per-agent payouts,
 *     because forward requires recalibrated live data that doesn't exist yet.
 */

import { useState } from "react";

interface MonthCell {
  month: string;
  A: number;
  B: number;
  C: number;
  finalScore: number;
  systemic: boolean;
}
interface BackpayAgent {
  name: string;
  rank: number;
  salary: number;
  avgScore: number;
  monthlyBonus: number;
  total: number;
  months: MonthCell[];
}
interface Weights {
  capital: number;
  retention: number;
  engagement: number;
  activity: number;
}
export interface BackpayData {
  agents: BackpayAgent[];
  monthlyCost: number;
  totalCost: number;
  maxMonthlyCost: number;
  maxTotalCost: number;
  multiplier: number;
  ceilingPct: number;
  weights: Weights;
}
export interface ForwardData {
  floor: number;
  curveP: number;
  capOptions: number[];
  targetCapital: number;
  targetEngage: number;
}

function progressivePct(score: number, cap: number, floor: number, curveP: number): number {
  if (score <= floor) return 0;
  return cap * ((score - floor) / (100 - floor)) ** curveP;
}

export function ModeToggle({
  backpay,
  forward,
  currency,
}: {
  backpay: BackpayData;
  forward: ForwardData;
  currency: string;
}) {
  const [tab, setTab] = useState<"backpay" | "forward">("backpay");
  const [cap, setCap] = useState<number>(forward.capOptions[0] ?? 0.2);

  const money = (n: number): string =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(n);
  const s2 = (n: number): string => n.toFixed(2);
  const pct1 = (n: number): string => `${(n * 100).toFixed(1)}%`;

  const tabBtn = (id: "backpay" | "forward", label: string): React.ReactElement => (
    <button
      onClick={() => setTab(id)}
      className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
        tab === id
          ? "bg-slate-100 text-slate-900"
          : "border border-slate-700 text-slate-300 hover:bg-slate-800"
      }`}
    >
      {label}
    </button>
  );

  return (
    <div>
      <div className="mb-4 flex items-center gap-2">
        {tabBtn("backpay", "Back-pay · linear 15%")}
        {tabBtn("forward", "H2 Forward · progressive")}
      </div>

      {tab === "backpay" ? (
        <section className="space-y-3">
          {backpay.agents.map((a) => (
            <div key={a.name} className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="grid h-7 w-7 place-items-center rounded-full bg-slate-800 text-xs font-semibold text-slate-300">
                    {a.rank}
                  </span>
                  <div>
                    <div className="font-semibold text-slate-50">{a.name}</div>
                    <div className="text-xs text-slate-500">
                      avg score {a.avgScore.toFixed(1)} · salary {money(a.salary)}/mo
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-semibold tabular-nums text-slate-50">
                    {money(a.total)}
                  </div>
                  <div className="text-xs text-slate-400">
                    {money(a.monthlyBonus)}/mo × {backpay.multiplier} · back-pay
                  </div>
                </div>
              </div>

              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="text-slate-400">
                    <tr className="text-left">
                      <th className="py-1 pr-3 font-medium">Month</th>
                      <th className="py-1 pr-3 text-right font-medium">
                        Retained Capital /{backpay.weights.capital}
                      </th>
                      <th className="py-1 pr-3 text-right font-medium">
                        Client Retention /{backpay.weights.retention}
                      </th>
                      <th className="py-1 pr-3 text-right font-medium">
                        Reactivation /{backpay.weights.engagement}
                      </th>
                      <th className="py-1 pr-3 text-right font-medium">Service Activity</th>
                      <th className="py-1 text-right font-medium">Final /100</th>
                    </tr>
                  </thead>
                  <tbody className="tabular-nums text-slate-300">
                    {a.months.map((m) => (
                      <tr key={m.month} className="border-t border-slate-800/70">
                        <td className="py-1.5 pr-3">
                          {m.month}
                          {m.systemic ? <sup className="ml-0.5 text-amber-400">†</sup> : null}
                        </td>
                        <td className="py-1.5 pr-3 text-right">{s2(m.A)}</td>
                        <td className="py-1.5 pr-3 text-right">
                          {s2(m.B)}
                          {m.systemic ? <sup className="ml-0.5 text-amber-400">†</sup> : null}
                        </td>
                        <td className="py-1.5 pr-3 text-right">{s2(m.C)}</td>
                        <td className="py-1.5 pr-3 text-right text-slate-500">
                          no feed — redistributed
                        </td>
                        <td className="py-1.5 text-right font-medium text-slate-100">
                          {m.finalScore.toFixed(1)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}

          <p className="px-1 text-xs text-amber-300/90">
            † <span className="font-medium">March: systemic desk-wide event.</span>{" "}
            All three survival rates cratered simultaneously then recovered — left
            in unadjusted, so sub-100 scores read as honest, not punitive.
          </p>

          <footer className="rounded-xl border border-slate-800 bg-slate-900/30 px-4 py-4 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-slate-400">
                Total back-pay cost{" "}
                <span className="font-semibold text-slate-100">{money(backpay.totalCost)}</span>{" "}
                of max possible{" "}
                <span className="font-semibold text-slate-100">{money(backpay.maxTotalCost)}</span>{" "}
                ({money(backpay.monthlyCost)}/mo of {money(backpay.maxMonthlyCost)}/mo × {backpay.multiplier})
              </span>
              <span className="tabular-nums text-slate-400">
                {pct1(backpay.totalCost / backpay.maxTotalCost)} of ceiling
              </span>
            </div>
            <p className="mt-3 text-xs leading-relaxed text-slate-500">
              Service Activity has no usable call feed, so its {backpay.weights.activity}{" "}
              points are redistributed across the three data-backed pillars
              ((A+B+C)/{backpay.weights.capital + backpay.weights.retention + backpay.weights.engagement}×100).
              Scored on placeholder targets by design (they saturate) — deliberate
              for a catch-up, not evidence the team maxed out. Numbers{" "}
              <span className="font-semibold text-amber-300">PROVISIONAL</span> pending CEO sign-off.
            </p>
          </footer>
        </section>
      ) : (
        <section className="space-y-4">
          <div className="rounded-xl border border-amber-500/40 bg-amber-500/5 px-4 py-3 text-sm text-amber-200/90">
            <span className="font-semibold text-amber-300">Preview only.</span>{" "}
            The forward progressive system is in design. It runs on recalibrated
            targets (TARGET_CAPITAL {forward.targetCapital.toLocaleString()},
            TARGET_ENGAGE {forward.targetEngage}) that don&apos;t yet have live
            data — no per-agent payouts are shown until that lands.
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-slate-100">
                Progressive bonus curve
              </h2>
              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-400">CAP_PCT</span>
                {forward.capOptions.map((c) => (
                  <button
                    key={c}
                    onClick={() => setCap(c)}
                    className={`rounded-md px-2 py-1 font-medium ${
                      cap === c
                        ? "bg-slate-100 text-slate-900"
                        : "border border-slate-700 text-slate-300 hover:bg-slate-800"
                    }`}
                  >
                    {Math.round(c * 100)}%
                  </button>
                ))}
              </div>
            </div>
            <p className="mb-3 text-xs text-slate-500">
              bonus % = CAP × (max(0, score − {forward.floor}) / (100 − {forward.floor}))
              <sup>{forward.curveP}</sup> · salary. No bonus at/below {forward.floor}.
            </p>
            <table className="w-full max-w-sm text-sm tabular-nums">
              <thead className="text-slate-400">
                <tr className="text-left">
                  <th className="py-1 font-medium">Final score</th>
                  <th className="py-1 text-right font-medium">Bonus % of salary</th>
                </tr>
              </thead>
              <tbody className="text-slate-200">
                {[60, 70, 80, 90, 100].map((sc) => (
                  <tr key={sc} className="border-t border-slate-800/70">
                    <td className="py-1.5">{sc}</td>
                    <td className="py-1.5 text-right">
                      {pct1(progressivePct(sc, cap, forward.floor, forward.curveP))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/30 px-4 py-4 text-xs leading-relaxed text-slate-400">
            <div className="mb-1 font-semibold text-slate-300">
              Two hard preconditions before this ships (SOT §8):
            </div>
            <ol className="ml-4 list-decimal space-y-1">
              <li>
                <span className="font-medium text-slate-300">Recalibrate first.</span>{" "}
                On today&apos;s saturated scores the convex curve costs ~36% more
                than linear-15% while rewarding noise.
              </li>
              <li>
                <span className="font-medium text-slate-300">Strengthen risk controls first.</span>{" "}
                An accelerating capital-weighted bonus amplifies the deposit-push
                incentive — ship with the hardened conduct gate + concentration/risk
                overlay, or you pay more to take on more B-book risk.
              </li>
            </ol>
          </div>
        </section>
      )}
    </div>
  );
}
