/**
 * Retention Engine — versioned settings (v3).
 *
 * Every numeric dial the engine uses lives here, never hardcoded in the scoring
 * logic (lib/engine/score.ts). Two profiles:
 *
 *  - DEFAULT_ENGINE_SETTINGS — H2 FORWARD defaults, recalibrated from the trio's
 *    real Jan–Jun distribution (SOT §3). Progressive bonus mode.
 *  - BACKPAY_H1_SETTINGS      — H1 BACK-PAY, one-time. Uses the v2 PLACEHOLDER
 *    targets (150k/50) BY DESIGN (SOT §5, appendix c): they saturate pillars A/C
 *    so scores sit near ceiling — deliberate for a catch-up, not evidence of
 *    maxing out. Linear bonus mode.
 *
 * SAFETY: both ship UNAPPROVED so nothing reads as authorized pay until an
 * explicit executive sign-off flips the status.
 */

import type { EngineSettings } from "@/lib/engine/types";

export const DEFAULT_ENGINE_SETTINGS: EngineSettings = {
  TARGET_CAPITAL: 270_000, // trio monthly net-deposit median $269,234 (SOT §3)
  TARGET_ENGAGE: 600, // median react+redeposit 633; v2's 50 was ~12x too low (SOT §3)
  TARGET_ACTIVITY: 100, // left at 100 but not yet scored — see PENDING flag
  TARGET_ACTIVITY_PENDING_LIVE_FEED: true, // call data not yet unified (SOT §9)
  CEILING_PCT: 0.15, // back-pay linear ceiling (TJ approved)
  CAP_PCT: 0.2, // H2 progressive; configurable up to 0.25 [DECISION] (SOT §8)
  FLOOR: 60, // no bonus below standard (SOT §8)
  CURVE_P: 1.5, // convex / accelerating (SOT §8)
  WEIGHTS: { capital: 40, retention: 30, engagement: 15, activity: 15 }, // sum = 100
  mode: "forward_progressive",
  redistribute_service_activity: true, // stays redistributed through H2 until a unified feed (SOT §9)
  status: "UNAPPROVED",
};

/** H1 back-pay: placeholder targets (by design), linear mapping, D redistributed. */
export const BACKPAY_H1_SETTINGS: EngineSettings = {
  ...DEFAULT_ENGINE_SETTINGS,
  TARGET_CAPITAL: 150_000, // PLACEHOLDER — saturates by design (SOT §5, appendix c)
  TARGET_ENGAGE: 50, // PLACEHOLDER
  mode: "backpay_linear",
  redistribute_service_activity: true, // no call feed → D redistributed across A/B/C
};

/** Lida/Radin/Lara monthly salary, per 2026 restructure (SOT appendix). */
export const H1_MONTHLY_SALARY = 1600;

/** ×6: pay all six months, Feb–Jun avg standing in for Jan (SOT §5 [DECISION], rec ×6). */
export const BACKPAY_MONTHS_MULTIPLIER = 6;

/** H2 ceiling options TJ is choosing between (SOT §8). */
export const CAP_PCT_OPTIONS = [0.2, 0.25] as const;
