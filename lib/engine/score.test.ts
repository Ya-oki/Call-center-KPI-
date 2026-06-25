/**
 * Engine acceptance tests.
 *
 * P0: the engine is a stub, so this file only asserts the scaffold wiring — that
 * computeScope exists and currently refuses to return a number (so no wrong pay
 * value can ship before P1).
 *
 * P1 replaces the body below with the real contract from BUILD_SPEC §8:
 *   - Σ share == 1 (when Σ score > 0), tol 1e-9
 *   - Σ payout == pool and Σ(paidNow+held) == pool, tol 1e-6
 *   - withdrawal_impeding_flag ⇒ conductFinal ≤ penaltyMult
 *   - GOLDEN (payout 10 / hold 40 / outcome 65 / penalty 50) on prototype demo:
 *       netDeskRevenue = 42,420 · pool = 4,242 ·
 *       ranking Mehdi > Omar > Sara > Lena > Niki · Niki conductFinal = 0.50
 */

import { describe, expect, it } from "vitest";
import { computeScope, ENGINE_NOT_IMPLEMENTED } from "@/lib/engine/score";
import { DEFAULT_SETTINGS } from "@/lib/config/defaults";

describe("computeScope (P0 stub)", () => {
  it("is wired up and exported", () => {
    expect(typeof computeScope).toBe("function");
  });

  it("refuses to compute until P1 (guards against shipping a wrong number)", () => {
    expect(() => computeScope([], [], DEFAULT_SETTINGS)).toThrow(
      ENGINE_NOT_IMPLEMENTED,
    );
  });
});
