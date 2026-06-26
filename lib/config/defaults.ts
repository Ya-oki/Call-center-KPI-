/**
 * Retention Engine — configuration defaults & placeholders.
 *
 * P0 SCOPE: This file declares the *dials and policy choices* that drive the
 * reward engine. Per BUILD_SPEC §2/§16 every numeric default is CONFIGURATION,
 * never a hardcoded constant in the math. The calculation that consumes these
 * values is implemented in P1 (lib/engine/score.ts) — there is intentionally
 * NO MATH in this file.
 *
 * The three modelling choices the blueprint flags as decisions (value metric,
 * survival/maturity, attribution) are captured here as explicit, typed config
 * placeholders so the engine can read them without re-litigating policy and so
 * Finance/owner sign-off has one place to land.
 *
 * Mirrors the prototype dials (Opo_Retention_Desk_Platform_v1.html → DEFAULTS).
 */

// ── Reward dials (prototype DEFAULTS: payout 10, hold 40, wo 65, pen 50) ──────
export interface RewardDials {
  /** % of net desk revenue that funds the pool. */
  payoutRate: number;
  /** % of each payout held back to next quarter. */
  holdPct: number;
  /** Outcome vs activity weighting, 0..100 (activity weight = 100 - this). */
  outcomeWeight: number;
  /** Withdrawal-impeding conduct penalty, 0..100 (multiplier = 1 - pen/100). */
  impedePenalty: number;
  /** Display currency symbol. */
  currency: string;
}

// ── OKR targets (prototype DEFAULTS: tret 85, react 8) ───────────────────────
export interface OkrTargets {
  /** Active-client retention target %. */
  retentionTarget: number;
  /** Reactivations target per scope. */
  reactivationsTarget: number;
}

export const DEFAULT_DIALS: RewardDials = {
  payoutRate: 10,
  holdPct: 40,
  outcomeWeight: 65,
  impedePenalty: 50,
  currency: "$",
};

export const DEFAULT_OKRS: OkrTargets = {
  retentionTarget: 85,
  reactivationsTarget: 8,
};

// ─────────────────────────────────────────────────────────────────────────────
// MODELLING CHOICES — config placeholders (Blueprint §12 "open decisions").
// These describe HOW the engine should interpret the data. They are surfaced as
// configuration now so P1 reads policy from here; no formula is implemented yet.
// ─────────────────────────────────────────────────────────────────────────────

/** What counts as the value the desk is rewarded on. */
export interface ValueMetricConfig {
  /**
   * Which field the pool is built from. P1 ECONOMICS locks this to `net_deposit`
   * (deposit − withdrawal) per client-month — NOT net company revenue. This
   * supersedes the prototype/BUILD_SPEC. Negative net-deposit is real signal and
   * is not floored at the agent level (only the desk-wide pool is floored).
   */
  source: "net_deposit";
  /**
   * Is client trading P&L (B-book) included in the value metric?
   * OPEN DECISION — confirm with Finance (Blueprint §9, §12). Affects the source
   * export, NOT the engine. Placeholder default: excluded until signed off.
   */
  includeBBookPnl: boolean;
  /**
   * If the value field isn't exportable, document a proxy here
   * (e.g. "volume × avg_markup") as an interim value. null = use the real field.
   */
  proxyFormula: string | null;
}

/** How retention "survival" / maturity is judged for outcome + holdback release. */
export interface SurvivalConfig {
  /**
   * A client "survived" if its latest-in-scope status is not this set.
   * Placeholder: churned counts as not-survived; active/dormant survive.
   */
  churnStatuses: ReadonlyArray<"active" | "dormant" | "churned">;
  /** Quarters a held amount waits before release (the maturity proof window). */
  holdbackReleaseQuarters: number;
}

/** How revenue/clients are attributed to an agent under a pooled/dynamic book. */
export interface AttributionConfig {
  /**
   * v1 = "latest-in-scope servicing agent" owns the client (matches prototype).
   * Avoids answering "who owns this client" under reassignment.
   */
  method: "latest_in_scope_servicing_agent";
}

export const DEFAULT_VALUE_METRIC: ValueMetricConfig = {
  source: "net_deposit",
  includeBBookPnl: false, // OPEN DECISION — Finance sign-off pending
  proxyFormula: null,
};

export const DEFAULT_SURVIVAL: SurvivalConfig = {
  churnStatuses: ["churned"],
  holdbackReleaseQuarters: 1,
};

export const DEFAULT_ATTRIBUTION: AttributionConfig = {
  method: "latest_in_scope_servicing_agent",
};

/**
 * Platform-level policy config (dials + modelling choices). This documents the
 * desk's policy decisions. The ENGINE consumes a flat `EngineSettings`
 * (lib/engine/types.ts) carrying payout_rate / hold_pct / outcome_weight /
 * impede_penalty / status — kept separate so the pure engine has zero coupling
 * to this placeholder config.
 */
export interface PlatformConfig {
  dials: RewardDials;
  okrs: OkrTargets;
  valueMetric: ValueMetricConfig;
  survival: SurvivalConfig;
  attribution: AttributionConfig;
}

export const DEFAULT_PLATFORM_CONFIG: PlatformConfig = {
  dials: DEFAULT_DIALS,
  okrs: DEFAULT_OKRS,
  valueMetric: DEFAULT_VALUE_METRIC,
  survival: DEFAULT_SURVIVAL,
  attribution: DEFAULT_ATTRIBUTION,
};
