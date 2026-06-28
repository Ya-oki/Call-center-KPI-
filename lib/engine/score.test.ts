/**
 * Engine acceptance tests (v2 corrected retention model) — the contract.
 *
 * GOLDEN (DEMO_AGENTS, settings TARGET_CAPITAL 150000 / TARGET_ENGAGE 50 /
 * TARGET_ACTIVITY 100 / CEILING 15% / weights 40·30·15·15), 2-decimal tolerance.
 * If the engine doesn't reproduce these, the engine is wrong, not the numbers.
 *
 *   Lida:  A40.00 B28.12 C13.50 D14.25 raw95.88 final95.88 bonus 230.10
 *   Radin: A37.33 B28.48 C15.00 D15.00 raw95.81 final95.81 bonus 229.95
 *   Lara:  A24.00 B27.27 C11.40 D13.20 raw75.87 final75.87 bonus 182.09
 *   Mahya: A16.00 B28.33 C 6.60 D 9.00 raw59.93 final59.93 bonus 112.37
 *   Ali:   A10.67 B24.00 C 6.00 D10.50 raw51.17 conduct0.50 final25.58 bonus 53.72
 *   Total monthly bonus cost = 808.25 ; max possible (all 100, no gate) = 1117.50
 *
 * Per CLAUDE.md: never change a pay formula without updating this file in the
 * same commit and flagging it in the PR.
 */

import { describe, expect, it } from "vitest";
import { computeScope, PROVISIONAL_DISCLAIMER } from "@/lib/engine/score";
import type { AgentResult } from "@/lib/engine/types";
import { DEMO_AGENTS, DEMO_SETTINGS } from "@/tests/fixtures/demoData";

const TOL = 0.01; // 2-decimal (1-cent) tolerance

function near(actual: number, expected: number): void {
  expect(Math.abs(actual - expected)).toBeLessThanOrEqual(TOL);
}

const result = computeScope(DEMO_AGENTS, DEMO_SETTINGS);

function byName(agents: AgentResult[], name: string): AgentResult {
  const a = agents.find((x) => x.name === name);
  if (!a) throw new Error(`agent ${name} not found`);
  return a;
}

interface Golden {
  A: number;
  B: number;
  C: number;
  D: number;
  raw: number;
  final: number;
  bonus: number;
}

const GOLDEN: Record<string, Golden> = {
  Lida: { A: 40.0, B: 28.12, C: 13.5, D: 14.25, raw: 95.88, final: 95.88, bonus: 230.1 },
  Radin: { A: 37.33, B: 28.48, C: 15.0, D: 15.0, raw: 95.81, final: 95.81, bonus: 229.95 },
  Lara: { A: 24.0, B: 27.27, C: 11.4, D: 13.2, raw: 75.87, final: 75.87, bonus: 182.09 },
  Mahya: { A: 16.0, B: 28.33, C: 6.6, D: 9.0, raw: 59.93, final: 59.93, bonus: 112.37 },
  Ali: { A: 10.67, B: 24.0, C: 6.0, D: 10.5, raw: 51.17, final: 25.58, bonus: 53.72 },
};

describe("computeScope v2 — golden numbers", () => {
  for (const [name, g] of Object.entries(GOLDEN)) {
    it(`${name}: pillars, scores, and bonus match (±${TOL})`, () => {
      const a = byName(result.agents, name);
      near(a.pillars.capital, g.A);
      near(a.pillars.retention, g.B);
      near(a.pillars.engagement, g.C);
      near(a.pillars.activity, g.D);
      near(a.raw_score, g.raw);
      near(a.final_score, g.final);
      near(a.monthly_bonus, g.bonus);
    });
  }

  it("Ali's conduct gate halves his final score", () => {
    const ali = byName(result.agents, "Ali");
    expect(ali.conduct_multiplier).toBe(0.5);
    near(ali.final_score, ali.raw_score * 0.5);
  });

  it("total monthly bonus cost = 808.25 and max possible = 1117.50", () => {
    near(result.totalBonusCost, 808.25);
    near(result.maxPossibleCost, 1117.5);
  });

  it("ranking by bonus desc: Lida > Radin > Lara > Mahya > Ali", () => {
    const order = [...result.agents]
      .sort((a, b) => a.rank - b.rank)
      .map((a) => a.name);
    expect(order).toEqual(["Lida", "Radin", "Lara", "Mahya", "Ali"]);
  });
});

describe("computeScope v2 — invariants", () => {
  it("each pillar is capped at its weight", () => {
    for (const a of result.agents) {
      expect(a.pillars.capital).toBeLessThanOrEqual(DEMO_SETTINGS.WEIGHTS.capital + 1e-9);
      expect(a.pillars.retention).toBeLessThanOrEqual(DEMO_SETTINGS.WEIGHTS.retention + 1e-9);
      expect(a.pillars.engagement).toBeLessThanOrEqual(DEMO_SETTINGS.WEIGHTS.engagement + 1e-9);
      expect(a.pillars.activity).toBeLessThanOrEqual(DEMO_SETTINGS.WEIGHTS.activity + 1e-9);
    }
  });

  it("raw_score never exceeds 100; final_score never exceeds raw_score", () => {
    for (const a of result.agents) {
      expect(a.raw_score).toBeLessThanOrEqual(100 + 1e-9);
      expect(a.final_score).toBeLessThanOrEqual(a.raw_score + 1e-9);
    }
  });

  it("no agent's bonus exceeds the salary ceiling (CEILING_PCT% of salary)", () => {
    const ceil = DEMO_SETTINGS.CEILING_PCT / 100;
    for (const a of result.agents) {
      expect(a.monthly_bonus).toBeLessThanOrEqual(a.monthly_salary * ceil + 1e-9);
      expect(a.bonus_pct_salary).toBeLessThanOrEqual(ceil + 1e-9);
    }
  });

  it("capital pillar floors negative retained_capital at 0", () => {
    const res = computeScope(
      [{ ...DEMO_AGENTS[0]!, retained_capital: -50_000 }],
      DEMO_SETTINGS,
    );
    expect(res.agents[0]!.pillars.capital).toBe(0);
  });
});

describe("computeScope v2 — safety / approval gate", () => {
  it("UNAPPROVED settings produce a PROVISIONAL, unauthorized result", () => {
    expect(result.authorized).toBe(false);
    expect(result.disclaimer).toBe(PROVISIONAL_DISCLAIMER);
  });

  it("APPROVED settings authorize the result and drop the disclaimer", () => {
    const approved = computeScope(DEMO_AGENTS, { ...DEMO_SETTINGS, status: "APPROVED" });
    expect(approved.authorized).toBe(true);
    expect(approved.disclaimer).toBeNull();
  });
});
