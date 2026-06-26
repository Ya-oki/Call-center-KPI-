/**
 * P3-lite — read-only demo dashboard (server component).
 *
 * Fixture in → engine → out. No DB, no auth, no writes. Renders the SAME
 * computeScope() the tests lock, stamped PROVISIONAL while settings are
 * UNAPPROVED. Zero env required to render (fixture is in-repo).
 */

import { computeScope } from "@/lib/engine/score";
import type { AgentResult } from "@/lib/engine/types";
import { SEED_AGENTS } from "@/lib/db/store";
import {
  DEMO_ACTIVITY,
  DEMO_CLIENTS,
  DEMO_SETTINGS,
} from "@/tests/fixtures/demo_netdeposit";

// Currency label is configurable but defaults to USD so the demo is one-click.
const CURRENCY = process.env.NEXT_PUBLIC_CURRENCY ?? "USD";

const DISPLAY_NAME = new Map(
  SEED_AGENTS.map((a) => [a.manager_email, a.display_name]),
);

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

const idx = (n: number): string => n.toFixed(2);
const integer = (n: number): string => new Intl.NumberFormat("en-US").format(n);

function SummaryCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-slate-700/60 bg-slate-800/40 p-4">
      <div className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
        {label}
      </div>
      <div className="mt-1 text-2xl font-semibold tabular-nums text-slate-50">
        {value}
      </div>
      {hint ? <div className="mt-0.5 text-xs text-slate-500">{hint}</div> : null}
    </div>
  );
}

const TH = ({
  children,
  right = false,
}: {
  children: React.ReactNode;
  right?: boolean;
}) => (
  <th
    className={`whitespace-nowrap px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-400 ${
      right ? "text-right" : "text-left"
    }`}
  >
    {children}
  </th>
);

const TD = ({
  children,
  right = false,
  strong = false,
}: {
  children: React.ReactNode;
  right?: boolean;
  strong?: boolean;
}) => (
  <td
    className={`whitespace-nowrap px-3 py-2.5 ${right ? "text-right tabular-nums" : "text-left"} ${
      strong ? "font-semibold text-slate-50" : "text-slate-300"
    }`}
  >
    {children}
  </td>
);

export default function OverviewDemoPage() {
  const result = computeScope(DEMO_CLIENTS, DEMO_ACTIVITY, DEMO_SETTINGS);
  const ranked: AgentResult[] = [...result.agents].sort((a, b) => a.rank - b.rank);

  const periods = result.periods;
  const first = periods[0];
  const last = periods[periods.length - 1];
  const periodRange =
    first === undefined || last === undefined
      ? "—"
      : first === last
        ? first
        : `${first} — ${last}`;

  const paidPct = 100 - DEMO_SETTINGS.hold_pct;
  const heldPct = DEMO_SETTINGS.hold_pct;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200">
      <main className="mx-auto max-w-6xl px-6 py-8">
        {/* Header */}
        <header className="mb-6">
          <h1 className="text-xl font-semibold text-slate-50">
            Retention Desk · Reward &amp; Performance
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Demo · synthetic data · {periodRange} · payout rate{" "}
            {DEMO_SETTINGS.payout_rate}% · {paidPct}% paid / {heldPct}% held
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
              <div className="mt-0.5 text-sm text-amber-200/90">
                {result.disclaimer}
              </div>
            </div>
          </div>
        ) : null}

        {/* Desk summary */}
        <section className="mb-8 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
          <SummaryCard
            label="Net desk value"
            value={money(result.netDeskValue)}
            hint="Σ net deposit (deposit − withdrawal)"
          />
          <SummaryCard
            label="Reward pool"
            value={money(result.pool)}
            hint={`${DEMO_SETTINGS.payout_rate}% of net desk value`}
          />
          <SummaryCard
            label="Paid now"
            value={money(result.paidNow)}
            hint={`${paidPct}% of pool`}
          />
          <SummaryCard
            label="Held"
            value={money(result.held)}
            hint={`${heldPct}% · matures next quarter`}
          />
          <SummaryCard label="Scope" value={periodRange} hint={`${ranked.length} agents`} />
        </section>

        {/* Leaderboard */}
        <section className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/40">
          <div className="border-b border-slate-800 px-4 py-3">
            <h2 className="text-sm font-semibold text-slate-100">
              Contribution leaderboard
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-900/60">
                <tr>
                  <TH>#</TH>
                  <TH>Agent</TH>
                  <TH right>Net deposit</TH>
                  <TH right>Survival</TH>
                  <TH right>Outcome</TH>
                  <TH right>Activity</TH>
                  <TH right>Conduct</TH>
                  <TH right>Share</TH>
                  <TH right>Payout</TH>
                  <TH right>Paid now</TH>
                  <TH right>Held</TH>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {ranked.map((a) => {
                  const gated = a.conductFinal < 1;
                  return (
                    <tr key={a.manager_email} className="hover:bg-slate-800/30">
                      <TD>{a.rank}</TD>
                      <TD strong>
                        <span className="flex items-center gap-2">
                          {DISPLAY_NAME.get(a.manager_email) ?? a.manager_email}
                          {gated ? (
                            <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-amber-300">
                              conduct gate applied
                            </span>
                          ) : null}
                        </span>
                      </TD>
                      <TD right>{integer(a.rev)}</TD>
                      <TD right>{pct(a.survRate, 0)}</TD>
                      <TD right>{idx(a.outcomeIdx)}</TD>
                      <TD right>{idx(a.activityIdx)}</TD>
                      <TD right>
                        <span className={gated ? "text-amber-300" : undefined}>
                          {idx(a.conductFinal)}
                        </span>
                      </TD>
                      <TD right>{pct(a.share)}</TD>
                      <TD right strong>
                        {money(a.payout)}
                      </TD>
                      <TD right>{money(a.paidNow)}</TD>
                      <TD right>{money(a.held)}</TD>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {/* How this is computed */}
        <footer className="mt-6 rounded-xl border border-slate-800 bg-slate-900/30 px-4 py-4 text-xs leading-relaxed text-slate-400">
          <span className="font-semibold text-slate-300">How this is computed: </span>
          value = net deposit (deposit − withdrawal); survival-weighted;
          conduct-gated; min-max normalized across agents; {paidPct}% paid /{" "}
          {heldPct}% held. Numbers are{" "}
          <span className="font-semibold text-amber-300">PROVISIONAL</span>{" "}
          pending executive sign-off.
        </footer>
      </main>
    </div>
  );
}
