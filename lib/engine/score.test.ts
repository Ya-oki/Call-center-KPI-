/**
 * Engine acceptance tests (P1) — the contract.
 *
 * GOLDEN (DEMO_* fixture, settings payout 10 / hold 40 / outcome 65 / penalty 50):
 *   netDeskValue = 34000.00 · pool = 3400.00
 *   Σ share = 1 (±1e-9) · Σ payout = pool (±1e-6) · Σ(paidNow+held) = pool (±1e-6)
 *   armin conductFinal = 0.50 (impede gate fires)
 *   ranking: lida > hossein > lara > mahya > armin
 *   payouts: lida 1331.68 · hossein 943.69 · lara 768.44 · mahya 294.43 · armin 61.76 (±0.01)
 *
 * Per CLAUDE.md: never change a pay formula without updating this file in the
 * same commit and flagging it in the PR.
 */

import { describe, expect, it } from "vitest";
import { computeScope, PROVISIONAL_DISCLAIMER } from "@/lib/engine/score";
import type { AgentResult } from "@/lib/engine/types";
import {
  DEMO_ACTIVITY,
  DEMO_CLIENTS,
  DEMO_SETTINGS,
} from "@/tests/fixtures/demo_netdeposit";

function byEmail(agents: AgentResult[], email: string): AgentResult {
  const a = agents.find((x) => x.manager_email === email);
  if (!a) throw new Error(`agent ${email} not found`);
  return a;
}

const result = computeScope(DEMO_CLIENTS, DEMO_ACTIVITY, DEMO_SETTINGS);

describe("computeScope — golden numbers", () => {
  it("netDeskValue = 34000 (negative net-deposits included, not floored)", () => {
    expect(result.netDeskValue).toBeCloseTo(34000, 6);
  });

  it("pool = 3400 (floored at desk level)", () => {
    expect(result.pool).toBeCloseTo(3400, 6);
  });

  it("ranking: lida > hossein > lara > mahya > armin", () => {
    const order = [...result.agents]
      .sort((a, b) => a.rank - b.rank)
      .map((a) => a.manager_email);
    expect(order).toEqual(["lida", "hossein", "lara", "mahya", "armin"]);
  });

  it("payouts match the locked golden values (±0.01)", () => {
    const expected: Record<string, number> = {
      lida: 1331.68,
      hossein: 943.69,
      lara: 768.44,
      mahya: 294.43,
      armin: 61.76,
    };
    for (const [email, want] of Object.entries(expected)) {
      expect(byEmail(result.agents, email).payout).toBeCloseTo(want, 2);
    }
  });

  it("armin conductFinal = 0.50 (impede gate)", () => {
    expect(byEmail(result.agents, "armin").conductFinal).toBeCloseTo(0.5, 9);
  });
});

describe("computeScope — invariants", () => {
  it("Σ share = 1 (±1e-9)", () => {
    const sumShare = result.agents.reduce((s, a) => s + a.share, 0);
    expect(Math.abs(sumShare - 1)).toBeLessThanOrEqual(1e-9);
  });

  it("Σ payout = pool (±1e-6)", () => {
    const sumPayout = result.agents.reduce((s, a) => s + a.payout, 0);
    expect(Math.abs(sumPayout - result.pool)).toBeLessThanOrEqual(1e-6);
  });

  it("Σ(paidNow + held) = pool (±1e-6)", () => {
    const sumSplit = result.agents.reduce((s, a) => s + a.paidNow + a.held, 0);
    expect(Math.abs(sumSplit - result.pool)).toBeLessThanOrEqual(1e-6);
    expect(result.paidNow + result.held).toBeCloseTo(result.pool, 6);
  });

  it("impede ⇒ conductFinal ≤ penaltyMult (1 − impede_penalty/100)", () => {
    const penaltyMult = 1 - DEMO_SETTINGS.impede_penalty / 100;
    const armin = byEmail(result.agents, "armin");
    expect(armin.conductFinal).toBeLessThanOrEqual(penaltyMult);
  });

  it("min-max normalization puts the lowest outcome at 0 (armin) and highest at 1 (lida)", () => {
    expect(byEmail(result.agents, "armin").outcomeIdx).toBeCloseTo(0, 9);
    expect(byEmail(result.agents, "lida").outcomeIdx).toBeCloseTo(1, 9);
  });

  it("negative net-deposit is not floored at the agent level (armin rev = 2000, churn drags it)", () => {
    expect(byEmail(result.agents, "armin").rev).toBeCloseTo(2000, 6);
  });
});

describe("computeScope — safety / approval gate", () => {
  it("UNAPPROVED settings produce a PROVISIONAL, unauthorized result", () => {
    expect(result.authorized).toBe(false);
    expect(result.disclaimer).toBe(PROVISIONAL_DISCLAIMER);
  });

  it("APPROVED settings authorize the result and drop the disclaimer", () => {
    const approved = computeScope(DEMO_CLIENTS, DEMO_ACTIVITY, {
      ...DEMO_SETTINGS,
      status: "APPROVED",
    });
    expect(approved.authorized).toBe(true);
    expect(approved.disclaimer).toBeNull();
  });

  it("a desk-wide capital loss yields no pool (pool floored to 0)", () => {
    const allOut = DEMO_CLIENTS.map((r) => ({ ...r, net_deposit: -Math.abs(r.net_deposit) - 1 }));
    const res = computeScope(allOut, DEMO_ACTIVITY, DEMO_SETTINGS);
    expect(res.netDeskValue).toBeLessThan(0);
    expect(res.pool).toBe(0);
    expect(res.agents.every((a) => a.payout === 0)).toBe(true);
  });
});
