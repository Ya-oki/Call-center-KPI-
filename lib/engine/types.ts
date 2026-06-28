/**
 * Retention Engine — domain types (v2 corrected retention model).
 *
 * Types only — no logic. The engine (score.ts) is a PURE function over these:
 * per-agent monthly metrics + versioned settings in, computed results out. No
 * DB, no fetch, no globals.
 *
 * v2 MODEL: each agent earns a monthly bonus as a % of their own salary, driven
 * by four target-based, capped pillars (capital / retention / engagement /
 * activity), gated by a conduct multiplier. There is no shared pool and no
 * cross-agent normalization — every agent is scored against fixed targets.
 */

/** One agent's pre-aggregated metrics for a single month. */
export interface AgentMonthInput {
  email: string;
  name: string;
  monthly_salary: number;
  /** Net-deposit retained this month (capital pillar input; floored at 0 in scoring). */
  retained_capital: number;
  /** Clients on the book at the start of the month. */
  clients_start: number;
  /** Active clients at month end (retention pillar input). */
  active_clients_end: number;
  /** Reactivated clients this month (engagement pillar input). */
  reactivated: number;
  /** Clients who redeposited this month (engagement pillar input). */
  redeposit_clients: number;
  /** Quality-weighted service activity composite (activity pillar input). */
  activity_composite: number;
  /** Conduct gate in [0,1]; multiplies the raw score. */
  conduct_multiplier: number;
}

/** Pillar weights — each is BOTH the scale factor and the cap for its pillar. */
export interface PillarWeights {
  capital: number;
  retention: number;
  engagement: number;
  activity: number;
}

/** Approval gate — pay is not authorized until settings are explicitly APPROVED. */
export type SettingsStatus = "UNAPPROVED" | "APPROVED";

/**
 * Versioned reward settings. Every number the engine uses lives here — there are
 * no magic numbers in the scoring logic.
 */
export interface EngineSettings {
  /** Monthly retained capital that maxes the capital pillar. */
  TARGET_CAPITAL: number;
  /** (reactivated + redeposit) clients that maxes the engagement pillar. */
  TARGET_ENGAGE: number;
  /** Activity composite that maxes the service pillar. */
  TARGET_ACTIVITY: number;
  /** Maximum bonus as a % of monthly salary (the ceiling). */
  CEILING_PCT: number;
  /** Pillar weights/caps; must sum to 100 so raw_score is on a 0..100 scale. */
  WEIGHTS: PillarWeights;
  status: SettingsStatus;
}

/** The four capped pillar scores for one agent. */
export interface AgentPillars {
  capital: number; // A, capped at WEIGHTS.capital
  retention: number; // B, capped at WEIGHTS.retention
  engagement: number; // C, capped at WEIGHTS.engagement
  activity: number; // D, capped at WEIGHTS.activity
}

/** Per-agent computed result. */
export interface AgentResult {
  email: string;
  name: string;
  monthly_salary: number;
  conduct_multiplier: number;
  pillars: AgentPillars;
  raw_score: number; // 0..100 (sum of pillars)
  final_score: number; // raw_score × conduct_multiplier
  monthly_bonus: number;
  bonus_pct_salary: number; // monthly_bonus / monthly_salary (fraction)
  rank: number;
}

/** Full computed result for the month. */
export interface ScopeResult {
  agents: AgentResult[]; // sorted by monthly_bonus desc
  totalBonusCost: number; // Σ monthly_bonus
  maxPossibleCost: number; // Σ ceiling (all agents at final 100, no gate)
  /**
   * SAFETY: true only when settings.status === 'APPROVED'. While UNAPPROVED the
   * engine still computes, but results are PROVISIONAL and must be rendered as
   * such. No code path may set this true without an explicit settings change.
   */
  authorized: boolean;
  disclaimer: string | null;
}
