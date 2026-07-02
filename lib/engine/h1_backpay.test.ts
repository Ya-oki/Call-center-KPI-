/**
 * H1 back-pay GOLDEN test — the authoritative pay check, on REAL data.
 *
 * Loads the committed Manager_Report_H1_2026 + Manager_Retention_H1_2026 CSVs,
 * runs the same computeBackPay the dashboard uses (placeholder targets, D
 * redistributed, conduct 1.0, Feb–Jun, ×6, linear 15%), and asserts SOT §5:
 *
 *   Lida:  avg 96.0  · $230.37/mo · $1,382.22 (6-mo)
 *   Lara:  avg 93.8  · $225.24/mo · $1,351.43
 *   Radin: avg 90.2  · $216.56/mo · $1,299.34
 *   Trio total: $4,032.99 ; Radin ranks LAST (falsification check).
 *
 * If this does not reproduce, the engine/data is wrong — do NOT adjust the
 * numbers to fit.
 */

import { describe, expect, it } from "vitest";
import { computeBackPay } from "@/lib/engine/score";
import { readH1Data } from "@/lib/ingest/h1";
import { BACKPAY_H1_SETTINGS, BACKPAY_MONTHS_MULTIPLIER } from "@/lib/config/defaults";
import type { AgentBackPay } from "@/lib/engine/types";

const result = computeBackPay(readH1Data(), BACKPAY_H1_SETTINGS, {
  multiplier: BACKPAY_MONTHS_MULTIPLIER,
});

const byName = (agents: AgentBackPay[], name: string): AgentBackPay => {
  const a = agents.find((x) => x.name === name);
  if (!a) throw new Error(`agent ${name} not found`);
  return a;
};

const GOLDEN: Record<string, { avg: number; monthly: number; total: number }> = {
  Lida: { avg: 96.0, monthly: 230.37, total: 1382.22 },
  Lara: { avg: 93.8, monthly: 225.24, total: 1351.43 },
  Radin: { avg: 90.2, monthly: 216.56, total: 1299.34 },
};

describe("H1 back-pay — golden numbers (real data)", () => {
  for (const [name, g] of Object.entries(GOLDEN)) {
    it(`${name}: avg score, monthly bonus, and 6-mo total`, () => {
      const a = byName(result.agents, name);
      expect(Math.abs(a.avg_score - g.avg)).toBeLessThanOrEqual(0.05); // 1-dp golden
      expect(Math.abs(a.monthly_bonus - g.monthly)).toBeLessThanOrEqual(0.01);
      expect(Math.abs(a.backpay_total - g.total)).toBeLessThanOrEqual(0.01);
    });
  }

  it("trio total back-pay = $4,032.99", () => {
    expect(Math.abs(result.totalCost - 4032.99)).toBeLessThanOrEqual(0.01);
  });

  it("Radin ranks LAST of the trio (the rigging is gone — SOT §5)", () => {
    const order = [...result.agents].sort((a, b) => a.rank - b.rank).map((a) => a.name);
    expect(order).toEqual(["Lida", "Lara", "Radin"]);
    expect(byName(result.agents, "Radin").rank).toBe(3);
  });

  it("per-month final scores match SOT §5 (March drags, systemic event)", () => {
    const lida = byName(result.agents, "Lida");
    const scores = Object.fromEntries(lida.months.map((m) => [m.month, m.final_score]));
    expect(Math.abs((scores.Feb ?? 0) - 99.9)).toBeLessThanOrEqual(0.1);
    expect(Math.abs((scores.Mar ?? 0) - 80.1)).toBeLessThanOrEqual(0.1);
    expect(scores.Apr).toBeCloseTo(100, 5);
  });
});

describe("H1 back-pay — model guarantees", () => {
  it("excludes Mahya & Armin (only the trio is scored)", () => {
    const names = result.agents.map((a) => a.name).sort();
    expect(names).toEqual(["Lara", "Lida", "Radin"]);
  });

  it("Service Activity is redistributed for every month (no feed → D null)", () => {
    for (const a of result.agents) {
      for (const m of a.months) {
        expect(m.redistributed).toBe(true);
        expect(m.pillars.activity).toBeNull();
      }
    }
  });

  it("all trio conduct multipliers are 1.0 (misconduct-only gate; SOT §10)", () => {
    for (const a of result.agents) expect(a.conduct_multiplier).toBe(1.0);
  });

  it("scored on the placeholder back-pay targets, not the recalibrated ones", () => {
    expect(BACKPAY_H1_SETTINGS.TARGET_CAPITAL).toBe(150_000);
    expect(BACKPAY_H1_SETTINGS.TARGET_ENGAGE).toBe(50);
  });

  it("stays UNAPPROVED / PROVISIONAL until sign-off", () => {
    expect(result.authorized).toBe(false);
    expect(result.disclaimer).toContain("PROVISIONAL");
  });
});
