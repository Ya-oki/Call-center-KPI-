/**
 * /h2 — the H2 design lab (NEW route; reachable by direct URL only, no link from
 * /overview). Reads the SAME engine + config as /overview but renders the
 * forward-looking H2 views. /overview is FROZEN and untouched.
 *
 * Default state: progressive PREVIEW (payout_authorized=false) applied to the H1
 * scores; concentration + conduct feeds are absent, so those sections show their
 * "no feed yet" state and the SOT §8 preconditions note stays visible.
 */

import { computeBackPay } from "@/lib/engine/score";
import { readH1Data } from "@/lib/ingest/h1";
import {
  BACKPAY_H1_SETTINGS,
  BACKPAY_MONTHS_MULTIPLIER,
  CAP_PCT_OPTIONS,
  CURVE_P_OPTIONS,
  H2_FORWARD_SETTINGS,
} from "@/lib/config/defaults";
import { H2View } from "./H2View";

export default function H2Page() {
  // Available scored data = the H1 trio. Their avg scores feed the progressive
  // PREVIEW (illustrative — real H2 needs recalibrated live data, §8 precondition 1).
  const bp = computeBackPay(readH1Data(), BACKPAY_H1_SETTINGS, {
    multiplier: BACKPAY_MONTHS_MULTIPLIER,
  });

  const agents = bp.agents.map((a) => ({
    name: a.name,
    avgScore: a.avg_score,
    salary: a.monthly_salary,
  }));

  const forward = {
    floor: H2_FORWARD_SETTINGS.FLOOR,
    capOptions: [...CAP_PCT_OPTIONS],
    curveOptions: [...CURVE_P_OPTIONS],
    payoutAuthorized: H2_FORWARD_SETTINGS.payout_authorized ?? false,
    concentrationEnabled: H2_FORWARD_SETTINGS.concentration_cap_enabled ?? false,
    concCapPct: H2_FORWARD_SETTINGS.CONC_CAP_PCT ?? 0.25,
    conductPipelineEnabled: H2_FORWARD_SETTINGS.conduct_pipeline_enabled ?? false,
    targetCapital: H2_FORWARD_SETTINGS.TARGET_CAPITAL,
    targetEngage: H2_FORWARD_SETTINGS.TARGET_ENGAGE,
  };

  const currency = process.env.NEXT_PUBLIC_CURRENCY ?? "USD";
  return <H2View agents={agents} forward={forward} currency={currency} />;
}
