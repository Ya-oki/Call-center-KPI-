/**
 * Feature 3 — conduct flag pipeline (SOT §10).
 */

import { describe, expect, it } from "vitest";
import { computeBackPay, scoreMonth } from "@/lib/engine/score";
import { ConductNoteRejected, ingestConductFlags } from "@/lib/ingest/conduct";
import { readH1Data } from "@/lib/ingest/h1";
import { BACKPAY_H1_SETTINGS, BACKPAY_MONTHS_MULTIPLIER, H2_FORWARD_SETTINGS } from "@/lib/config/defaults";
import type { AgentMonthInput, ConductFlag } from "@/lib/engine/types";

const PIPELINE = { ...H2_FORWARD_SETTINGS, conduct_pipeline_enabled: true };

function agent(flags: ConductFlag[]): AgentMonthInput {
  return {
    key: "A", name: "A", month: "Jul", monthly_salary: 1600,
    retained_capital: 135_000, clients_start: 100, active_clients_end: 80,
    reactivated: 300, redeposit_clients: 0, activity_composite: null,
    conduct_multiplier: 1.0, conduct_flags: flags,
  };
}
const flag = (over: Partial<ConductFlag>): ConductFlag => ({
  manager_alias: "A", month: "Jul", type: "agent_conduct", severity: "minor", substantiated: true, ...over,
});

describe("conduct multiplier logic (pipeline enabled)", () => {
  it("(i) client_platform, severe, substantiated → multiplier 1.0 (never affects score)", () => {
    const s = scoreMonth(agent([flag({ type: "client_platform", severity: "severe", substantiated: true })]), PIPELINE);
    expect(s.conduct_multiplier_effective).toBe(1.0);
    expect(s.final_score).toBe(s.raw_score);
    expect(s.review_badges).toContain("client_platform_complaint");
  });

  it("(ii) substantiated major agent_conduct → final = raw × 0.5", () => {
    const s = scoreMonth(agent([flag({ type: "agent_conduct", severity: "major", substantiated: true })]), PIPELINE);
    expect(s.conduct_multiplier_effective).toBe(0.5);
    expect(s.final_score).toBeCloseTo(s.raw_score * 0.5, 9);
  });

  it("(iii) unsubstantiated agent_conduct → 1.0 + review badge", () => {
    const s = scoreMonth(agent([flag({ type: "agent_conduct", severity: "major", substantiated: false })]), PIPELINE);
    expect(s.conduct_multiplier_effective).toBe(1.0);
    expect(s.review_badges).toContain("unsubstantiated_conduct");
  });

  it("(iv) major + minor substantiated → 0.5 (worst-of), not 0.45 (product)", () => {
    const s = scoreMonth(
      agent([
        flag({ severity: "major", substantiated: true }),
        flag({ severity: "minor", substantiated: true }),
      ]),
      PIPELINE,
    );
    expect(s.conduct_multiplier_effective).toBe(0.5);
  });

  it("severe substantiated → 0.0", () => {
    const s = scoreMonth(agent([flag({ severity: "severe", substantiated: true })]), PIPELINE);
    expect(s.conduct_multiplier_effective).toBe(0.0);
    expect(s.final_score).toBe(0);
  });
});

describe("conduct note PII guard", () => {
  it("(v) rejects a note containing a client identifier (5+-digit run)", () => {
    // Fake ID (not a real client) that still triggers the digit-run guard.
    expect(() => ingestConductFlags([flag({ note: "client 500123 complained" })])).toThrow(ConductNoteRejected);
  });
  it("rejects phone-like notes; accepts clean notes", () => {
    expect(() => ingestConductFlags([flag({ note: "+1 415 555 1212" })])).toThrow(ConductNoteRejected);
    expect(ingestConductFlags([flag({ note: "pressured client to redeposit" })])).toHaveLength(1);
  });
});

describe("H1 back-pay is immune to conduct flags (pipeline OFF)", () => {
  it("(vi) flags present in data, multipliers still 1.0, golden numbers unchanged", () => {
    const rows = readH1Data().map((r) => ({
      ...r,
      conduct_flags: [flag({ type: "agent_conduct", severity: "severe", substantiated: true })],
    }));
    const res = computeBackPay(rows, BACKPAY_H1_SETTINGS, { multiplier: BACKPAY_MONTHS_MULTIPLIER });
    expect(res.totalCost).toBeCloseTo(4032.99, 2);
    const lida = res.agents.find((a) => a.name === "Lida")!;
    expect(lida.backpay_total).toBeCloseTo(1382.22, 2);
    for (const a of res.agents) expect(a.conduct_multiplier).toBe(1.0);
  });
});
