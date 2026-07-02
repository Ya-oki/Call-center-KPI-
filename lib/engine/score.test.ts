/**
 * Engine unit tests (v3) — synthetic regression + logic units.
 *
 * The synthetic single-month case pins the formula (placeholder targets, D
 * scored, linear) as a pure-math guard. The authoritative pay check on real data
 * is lib/engine/h1_backpay.test.ts.
 *
 * Per CLAUDE.md: never change a pay formula without updating the tests in the
 * same commit and flagging it in the PR.
 */

import { describe, expect, it } from "vitest";
import {
  computeScope,
  progressiveBonusPct,
  scoreMonth,
  PROVISIONAL_DISCLAIMER,
} from "@/lib/engine/score";
import type { AgentMonthInput, AgentResult } from "@/lib/engine/types";
import { DEMO_AGENTS, DEMO_SETTINGS } from "@/tests/fixtures/demoData";

const TOL = 0.01;
const near = (a: number, e: number): void =>
  expect(Math.abs(a - e)).toBeLessThanOrEqual(TOL);

const result = computeScope(DEMO_AGENTS, DEMO_SETTINGS);
const byName = (agents: AgentResult[], name: string): AgentResult => {
  const a = agents.find((x) => x.name === name);
  if (!a) throw new Error(`agent ${name} not found`);
  return a;
};

describe("computeScope — synthetic regression (linear, D scored)", () => {
  const GOLDEN: Record<string, { raw: number; final: number; bonus: number }> = {
    Lida: { raw: 95.875, final: 95.875, bonus: 230.1 },
    Radin: { raw: 95.814, final: 95.814, bonus: 229.95 },
    Lara: { raw: 75.873, final: 75.873, bonus: 182.09 },
    Mahya: { raw: 59.933, final: 59.933, bonus: 112.37 },
    Ali: { raw: 51.167, final: 25.583, bonus: 53.72 },
  };

  for (const [name, g] of Object.entries(GOLDEN)) {
    it(`${name}: raw/final/bonus match (±${TOL})`, () => {
      const a = byName(result.agents, name);
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

  it("D pillar is scored (not redistributed) in this profile", () => {
    for (const a of result.agents) {
      expect(a.redistributed).toBe(false);
      expect(a.pillars.activity).not.toBeNull();
    }
  });
});

describe("computeScope — invariants", () => {
  it("pillars are capped at their weights; raw ≤ 100; final ≤ raw", () => {
    for (const a of result.agents) {
      expect(a.pillars.capital).toBeLessThanOrEqual(DEMO_SETTINGS.WEIGHTS.capital + 1e-9);
      expect(a.pillars.retention).toBeLessThanOrEqual(DEMO_SETTINGS.WEIGHTS.retention + 1e-9);
      expect(a.pillars.engagement).toBeLessThanOrEqual(DEMO_SETTINGS.WEIGHTS.engagement + 1e-9);
      expect(a.raw_score).toBeLessThanOrEqual(100 + 1e-9);
      expect(a.final_score).toBeLessThanOrEqual(a.raw_score + 1e-9);
    }
  });

  it("no bonus exceeds the linear ceiling (CEILING_PCT of salary)", () => {
    for (const a of result.agents) {
      expect(a.monthly_bonus).toBeLessThanOrEqual(a.monthly_salary * DEMO_SETTINGS.CEILING_PCT + 1e-9);
    }
  });

  it("capital pillar floors negative retained_capital at 0", () => {
    const neg: AgentMonthInput = { ...DEMO_AGENTS[0]!, retained_capital: -50_000 };
    expect(scoreMonth(neg, DEMO_SETTINGS).pillars.capital).toBe(0);
  });
});

describe("scoreMonth — service-activity redistribution ((A+B+C)/85·100)", () => {
  it("redistributes to a null D and rescales the 3 pillars to 100", () => {
    const input: AgentMonthInput = { ...DEMO_AGENTS[0]!, activity_composite: null };
    const s = scoreMonth(input, { ...DEMO_SETTINGS, redistribute_service_activity: true });
    expect(s.redistributed).toBe(true);
    expect(s.pillars.activity).toBeNull();
    const three = s.pillars.capital + s.pillars.retention + s.pillars.engagement;
    near(s.raw_score, (three / 85) * 100);
  });
});

describe("progressiveBonusPct — H2 forward mapping (SOT §8)", () => {
  it("is 0 at or below the floor", () => {
    expect(progressiveBonusPct(60, 0.25, 60, 1.5)).toBe(0);
    expect(progressiveBonusPct(55, 0.25, 60, 1.5)).toBe(0);
  });

  it("matches the equation at 80/90/100 (CAP 25%)", () => {
    near(progressiveBonusPct(80, 0.25, 60, 1.5), 0.0884);
    near(progressiveBonusPct(90, 0.25, 60, 1.5), 0.1624);
    near(progressiveBonusPct(100, 0.25, 60, 1.5), 0.25);
  });

  it("70 → 3.125% per the stated equation (doc's illustrative 4.4% is a typo)", () => {
    near(progressiveBonusPct(70, 0.25, 60, 1.5), 0.03125);
  });
});

describe("computeScope — safety / approval gate", () => {
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
