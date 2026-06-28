/**
 * Retention Engine — versioned settings (v2 corrected retention model).
 *
 * Every numeric dial the engine uses lives here, never hardcoded in the scoring
 * logic (lib/engine/score.ts). These are the canonical defaults; persisted
 * settings_version rows override them per scope, keeping historical results
 * reproducible.
 *
 * SAFETY: defaults ship as UNAPPROVED so nothing reads as authorized pay until
 * an explicit executive sign-off flips the status.
 */

import type { EngineSettings } from "@/lib/engine/types";

export const DEFAULT_ENGINE_SETTINGS: EngineSettings = {
  TARGET_CAPITAL: 150_000, // monthly net-deposit-retained that maxes the capital pillar
  TARGET_ENGAGE: 50, // reactivated + redeposit clients that maxes engagement
  TARGET_ACTIVITY: 100, // activity composite that maxes service
  CEILING_PCT: 15, // max bonus as % of monthly salary
  WEIGHTS: { capital: 40, retention: 30, engagement: 15, activity: 15 }, // sum = 100
  status: "UNAPPROVED",
};
