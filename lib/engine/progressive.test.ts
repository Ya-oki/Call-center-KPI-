/**
 * Feature 1 — progressive bonus (H2 forward), live-ready.
 * Pins the curve at both CEO-selectable exponents (SOT §8) and proves
 * computeScope in forward_progressive mode pays actual per-agent bonuses.
 */

import { describe, expect, it } from "vitest";
import { computeScope, progressiveBonusPct } from "@/lib/engine/score";
import type { AgentMonthInput } from "@/lib/engine/types";
import { H2_FORWARD_SETTINGS } from "@/lib/config/defaults";

describe("progressiveBonusPct — curve values (CAP 0.25)", () => {
  it("p = 1.5 (implemented default): 70/80/90/100", () => {
    expect(progressiveBonusPct(70, 0.25, 60, 1.5)).toBeCloseTo(0.03125, 6); // exact
    expect(progressiveBonusPct(80, 0.25, 60, 1.5)).toBeCloseTo(0.088388, 6);
    expect(progressiveBonusPct(90, 0.25, 60, 1.5)).toBeCloseTo(0.162380, 6);
    expect(progressiveBonusPct(100, 0.25, 60, 1.5)).toBeCloseTo(0.25, 6); // exact
  });

  it("p = 1.25 (gentler alternative): 70/80/90 to 2 s.f.", () => {
    expect(progressiveBonusPct(70, 0.25, 60, 1.25)).toBeCloseTo(0.044, 3);
    expect(progressiveBonusPct(80, 0.25, 60, 1.25)).toBeCloseTo(0.105, 3);
    expect(progressiveBonusPct(90, 0.25, 60, 1.25)).toBeCloseTo(0.174, 3);
    expect(progressiveBonusPct(100, 0.25, 60, 1.25)).toBeCloseTo(0.25, 6);
  });

  it("score ≤ FLOOR → 0 for both curves", () => {
    for (const p of [1.5, 1.25]) {
      expect(progressiveBonusPct(60, 0.25, 60, p)).toBe(0);
      expect(progressiveBonusPct(50, 0.25, 60, p)).toBe(0);
      expect(progressiveBonusPct(0, 0.25, 60, p)).toBe(0);
    }
  });

  it("CAP 0.20 variant spot-check (90, p=1.5)", () => {
    expect(progressiveBonusPct(90, 0.2, 60, 1.5)).toBeCloseTo(0.12990, 5);
  });
});

describe("computeScope — forward_progressive pays real per-agent bonuses", () => {
  const agent: AgentMonthInput = {
    key: "A",
    name: "A",
    month: "Jul",
    monthly_salary: 2000,
    retained_capital: 270_000, // maxes capital at recalibrated target
    clients_start: 100,
    active_clients_end: 100, // retention pillar maxes
    reactivated: 600,
    redeposit_clients: 0, // engagement maxes
    activity_composite: null, // redistributed
    conduct_multiplier: 1.0,
  };

  it("bonus = progressiveBonusPct(final, CAP, FLOOR, CURVE) × salary", () => {
    const settings = { ...H2_FORWARD_SETTINGS, CAP_PCT: 0.25, CURVE_P: 1.5 };
    const res = computeScope([agent], settings);
    const a = res.agents[0]!;
    const expected = progressiveBonusPct(a.final_score, 0.25, settings.FLOOR, 1.5) * 2000;
    expect(a.monthly_bonus).toBeCloseTo(expected, 9);
    expect(res.mode).toBe("forward_progressive");
  });

  it("payout_authorized flows through (default false ⇒ PREVIEW on /h2)", () => {
    const res = computeScope([agent], H2_FORWARD_SETTINGS);
    expect(res.payout_authorized).toBe(false);
  });
});
