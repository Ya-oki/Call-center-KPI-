/**
 * Retention Engine — PURE calculation engine.
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ P0 STUB — NO MATH YET.                                                    │
 * │                                                                          │
 * │ The reward formula is the de-risking core of this project and is built   │
 * │ in P1, faithfully mirroring the verified prototype                       │
 * │ (Opo_Retention_Desk_Platform_v1.html → compute()) and locked behind the  │
 * │ golden-number acceptance tests in BUILD_SPEC §8:                         │
 * │   netDeskRevenue = 42,420 · pool = 4,242 ·                               │
 * │   ranking Mehdi > Omar > Sara > Lena > Niki · Niki conductFinal = 0.50.  │
 * │                                                                          │
 * │ Until P1, computeScope intentionally throws so nothing silently ships a  │
 * │ wrong number. Do NOT invent formulas here — the prototype wins.          │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * Contract (implemented in P1):
 *   computeScope(clients, activity, settings) -> ScopeResult
 *   - PURE & deterministic: no DB, no fetch, no Date.now(), no globals.
 *   - All money/scoring values come from `settings` (lib/config/defaults).
 */

import type {
  ActivityMonthRow,
  ClientMonthRow,
  EngineSettings,
  ScopeResult,
} from "@/lib/engine/types";

/** Sentinel thrown by the P0 stub so callers can detect "engine not built yet". */
export const ENGINE_NOT_IMPLEMENTED =
  "computeScope is a P0 stub — the reward math lands in P1 (mirror the prototype).";

/**
 * Compute a scope result. P0: not implemented.
 *
 * @param _clients  client-month rows in/around the scope
 * @param _activity agent-month activity rows in/around the scope
 * @param _settings dials + modelling choices (lib/config/defaults)
 */
export function computeScope(
  _clients: ClientMonthRow[],
  _activity: ActivityMonthRow[],
  _settings: EngineSettings,
): ScopeResult {
  throw new Error(ENGINE_NOT_IMPLEMENTED);
}
