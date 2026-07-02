/**
 * Feature 2 — concentration cap + book-risk flag (SOT §7).
 */

import { describe, expect, it } from "vitest";
import { scoreMonth } from "@/lib/engine/score";
import { ingestClientCapital, pseudonymizeClientRef } from "@/lib/ingest/clientCapital";
import { H2_FORWARD_SETTINGS } from "@/lib/config/defaults";
import {
  agentWith,
  CONC_CAP_REFERENCE,
  RAW_CLIENT_IDS,
  RAW_X,
  RAW_Y,
  X_BOOK_TOTAL,
  Y_BOOK_TOTAL,
} from "@/tests/fixtures/h2_concentration";

const clientsX = ingestClientCapital(RAW_X);
const clientsY = ingestClientCapital(RAW_Y);
const X = agentWith("AgentX", clientsX, X_BOOK_TOTAL);
const Y = agentWith("AgentY", clientsY, Y_BOOK_TOTAL);

const ON = { ...H2_FORWARD_SETTINGS, concentration_cap_enabled: true, CONC_CAP_PCT: 0.25 };
const OFF = { ...H2_FORWARD_SETTINGS, concentration_cap_enabled: false };

describe("concentration cap", () => {
  it("(i) clamps the whale's contribution to exactly CONC_CAP_PCT × TARGET_CAPITAL", () => {
    expect(CONC_CAP_REFERENCE).toBe(67_500);
    const whale = clientsX[0]!; // net_deposit 200k
    const contribution = Math.min(Math.max(0, whale.net_deposit), CONC_CAP_REFERENCE);
    expect(contribution).toBe(67_500);
    // capped book input = 67,500 + 40,000 + 30,000 + 20,000
    const s = scoreMonth(X, ON);
    expect(s.concentration?.applied).toBe(true);
    expect(s.concentration?.cappedCapitalInput).toBe(157_500);
    expect(s.concentration?.rawCapitalInput).toBe(290_000);
  });

  it("(ii) leaves an evenly-distributed book unaffected (every client below the cap)", () => {
    const s = scoreMonth(Y, ON);
    expect(s.concentration?.cappedCapitalInput).toBe(Y_BOOK_TOTAL);
    expect(s.concentration?.rawCapitalInput).toBe(Y_BOOK_TOTAL);
  });

  it("(iv) with the cap disabled, scores are bit-identical to the aggregate path", () => {
    const withClients = scoreMonth(X, OFF);
    const noClients = scoreMonth({ ...X, client_capital: undefined }, OFF);
    expect(withClients.raw_score).toBe(noClients.raw_score);
    expect(withClients.final_score).toBe(noClients.final_score);
    expect(withClients.pillars).toEqual(noClients.pillars);
  });
});

describe("book-risk flag (visibility only)", () => {
  it("(iii) fires on the whale book, not the distributed book", () => {
    expect(scoreMonth(X, ON).book_risk_flag).toBe(true);
    expect(scoreMonth(Y, ON).book_risk_flag).toBe(false);
  });

  it("never affects the score (flag on vs off yields the same final score)", () => {
    // Y has no flag; X has a flag but score is unchanged by the flag itself.
    const highThreshold = { ...ON, RISK_FLAG_THRESHOLD: -0.01 }; // force flag on everyone
    const a = scoreMonth(X, ON);
    const b = scoreMonth(X, highThreshold);
    expect(a.final_score).toBe(b.final_score);
  });

  it("emits a book_risk_review badge when flagged", () => {
    expect(scoreMonth(X, ON).review_badges).toContain("book_risk_review");
    expect(scoreMonth(Y, ON).review_badges ?? []).not.toContain("book_risk_review");
  });
});

describe("ingestion pseudonymization (no raw IDs persist)", () => {
  it("(v) every client_ref is opaque and no raw ID survives", () => {
    const persisted = JSON.stringify([...clientsX, ...clientsY]);
    for (const id of RAW_CLIENT_IDS) expect(persisted).not.toContain(id);
    for (const c of [...clientsX, ...clientsY]) expect(c.client_ref).toMatch(/^C-[a-p]{8}$/);
  });

  it("is stable: same raw ID → same pseudonym", () => {
    expect(pseudonymizeClientRef("710001")).toBe(pseudonymizeClientRef("710001"));
    expect(pseudonymizeClientRef("710001")).not.toBe(pseudonymizeClientRef("710002"));
  });
});
