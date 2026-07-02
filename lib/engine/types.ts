/**
 * Retention Engine — domain types (v3).
 *
 * Types only — no logic. The formula STRUCTURE is unchanged from v2 (four capped
 * pillars, conduct gate); v3 changes constants, the bonus mapping (two modes),
 * the data source, and adds a service-activity redistribution path.
 */

/** One agent's metrics for a single month. */
export interface AgentMonthInput {
  /** Grouping key — manager alias (Lida/Radin/Lara), never a real name. */
  key: string;
  name: string;
  month: string; // 'Feb'..'Jun' (or a label for single-month use)
  monthly_salary: number;
  /** Net client money kept (capital pillar; floored at 0 in scoring). */
  retained_capital: number;
  clients_start: number;
  active_clients_end: number;
  reactivated: number;
  redeposit_clients: number;
  /** Quality-weighted service activity; null when there is no usable call feed. */
  activity_composite: number | null;
  /** Conduct gate in [0,1] — agent misconduct only, NOT client-platform complaints. */
  conduct_multiplier: number;
}

/** Pillar weights — each is BOTH the scale factor and the cap for its pillar. */
export interface PillarWeights {
  capital: number;
  retention: number;
  engagement: number;
  activity: number;
}

export type SettingsStatus = "UNAPPROVED" | "APPROVED";

/** Bonus mapping mode: linear back-pay (H1) vs progressive forward (H2). */
export type BonusMode = "backpay_linear" | "forward_progressive";

/** Versioned reward settings. No magic numbers live in the scoring logic. */
export interface EngineSettings {
  TARGET_CAPITAL: number;
  TARGET_ENGAGE: number;
  TARGET_ACTIVITY: number;
  /** True while the unified call feed is pending — activity is not scored (SOT §9). */
  TARGET_ACTIVITY_PENDING_LIVE_FEED: boolean;
  /** Back-pay linear ceiling, as a fraction of salary (0.15 = 15%). */
  CEILING_PCT: number;
  /** H2 progressive cap, as a fraction of salary (0.20–0.25). */
  CAP_PCT: number;
  /** H2 progressive floor score — no bonus at/below it. */
  FLOOR: number;
  /** H2 progressive curve exponent (convex when > 1). */
  CURVE_P: number;
  WEIGHTS: PillarWeights;
  mode: BonusMode;
  /** When true, Service Activity (D) is redistributed across A/B/C (SOT §9). */
  redistribute_service_activity: boolean;
  status: SettingsStatus;
}

/** The four pillar scores for one month. D is null when redistributed (no feed). */
export interface MonthPillars {
  capital: number; // A, capped at WEIGHTS.capital
  retention: number; // B, capped at WEIGHTS.retention
  engagement: number; // C, capped at WEIGHTS.engagement
  activity: number | null; // D, or null when redistributed
}

/** Per-month scored result. */
export interface MonthScore {
  month: string;
  pillars: MonthPillars;
  /** 0..100. When redistributed, = (A+B+C)/(sum of 3 weights)·(sum of all weights). */
  raw_score: number;
  final_score: number; // raw_score × conduct_multiplier
  redistributed: boolean;
}

/** Single-month per-agent result (computeScope: v2 regression + H2 forward preview). */
export interface AgentResult {
  key: string;
  name: string;
  month: string;
  monthly_salary: number;
  conduct_multiplier: number;
  pillars: MonthPillars;
  raw_score: number;
  final_score: number;
  redistributed: boolean;
  monthly_bonus: number;
  bonus_pct_salary: number;
  rank: number;
}

export interface ScopeResult {
  agents: AgentResult[]; // sorted by monthly_bonus desc
  totalBonusCost: number;
  maxPossibleCost: number;
  mode: BonusMode;
  authorized: boolean;
  disclaimer: string | null;
}

/** Per-agent back-pay result: monthly scores aggregated to an average + total. */
export interface AgentBackPay {
  key: string;
  name: string;
  monthly_salary: number;
  conduct_multiplier: number;
  months: MonthScore[];
  avg_score: number;
  monthly_bonus: number; // linear: (avg/100)·CEILING_PCT·salary
  months_multiplier: number;
  backpay_total: number; // monthly_bonus × multiplier
  rank: number;
}

export interface BackPayResult {
  agents: AgentBackPay[]; // sorted by backpay_total desc
  monthlyCost: number; // Σ monthly_bonus
  totalCost: number; // Σ backpay_total
  maxMonthlyCost: number; // Σ salary·CEILING_PCT (all at 100)
  maxTotalCost: number; // maxMonthlyCost × multiplier
  multiplier: number;
  authorized: boolean;
  disclaimer: string | null;
}
