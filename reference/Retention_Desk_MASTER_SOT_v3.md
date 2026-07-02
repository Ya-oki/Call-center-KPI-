# Retention Desk — Compensation System: Master Source of Truth (v3)

**Owner:** Yasi (COO) · **Approver:** TJ (CEO) · **Data authority:** Ares (CRM) **Scope:** Retention account managers only. IB and conversion (FTD) teams excluded — separate systems. **Status:** Back-pay numbers FINAL pending TJ ceiling sign-off. H2 forward system in design. **Supersedes:** all prior scattered session notes and the v2 provisional doc. This is the single reference.

---

## 0\. How to read this document

This is the definitive record of the retention-desk compensation rebuild. It contains, in order: what was broken, the corrected formula, the recalibrated H2 constants, the clean H1 data, the final back-pay numbers, the open design decisions, and the data-integrity findings. Bracketed items marked **\[DECISION\]** require a human sign-off; **\[INFERENCE\]** marks analytical conclusions drawn from data rather than stated fact.

---

## 1\. The verdict on the old formula (why it was discarded)

The prior "Total Monthly Score /100" was reverse-engineered from real January 2026 data and found to be structurally indefensible:

- **Scored deposit collection, not retention.** 70% of points rewarded money coming in, not clients kept.  
- **Uncapped and size-biased.** Net Deposit \= raw dollars ÷ 6,000, uncapped — Lida scored 69 on a component "capped" at 50\. Biggest book won automatically, regardless of skill.  
- **Structurally riggable.** The previous manager (Sophia) controlled book assignment, the CRM export, and was scored by the same system. No separation of duties.  
- **Rewarded deposit-pushing** — a B-book/compliance risk.  
- **Conduct-blind**, with a dead flat-10 calls component and unfair negative scoring when whales withdrew.

**Contamination confirmed:** Sophia's January export inflated net deposit vs Ares's clean data by 27–280% per agent (Lida alone: $416,676 reported vs $326,501 clean, a 27.6% / $90,175 overstatement on one agent-month).

**Verdict:** the net-deposit *idea* (protecting client capital) is legitimate; the *construction* is not. Use the clean CRM numbers, discard the scoring rules. Sophia is no longer in the system; the rebuild assumes clean, separated-duty inputs going forward.

---

## 2\. The corrected formula (four capped pillars, conduct-gated)

Score out of 100, built from four capped pillars, then gated on conduct. Conversion (FTD) removed.

| Pillar | Points | Rewards |
| :---- | :---- | :---- |
| A. Retained Capital | 40 | Net client money kept vs a monthly target (capped, floored at 0\) |
| B. Client Retention | 30 | Share of funded clients still active month-end |
| C. Reactivation & Loyalty | 15 | Dormant clients revived \+ repeat depositors |
| D. Service Activity | 15 | Real calls/connections vs the \~60-call/day standard |
| Conduct gate | ×(0–1) | Clean \= 1.0; violations multiply down, to 0 in serious cases |

### Equations

```
A_capital    = clamp(0, 40, max(0, retained_capital) / TARGET_CAPITAL * 40)
B_retention  = clamp(0, 30, (active_clients_end / clients_start) * 30)
C_engagement = clamp(0, 15, (reactivated + redeposit_clients) / TARGET_ENGAGE * 15)
D_activity   = clamp(0, 15, activity_composite / TARGET_ACTIVITY * 15)

raw_score    = A_capital + B_retention + C_engagement + D_activity     # 0–100
final_score  = raw_score * conduct_multiplier                          # 0–100
```

### Bonus mapping — two modes

**Back-pay (H1, one-time, linear):**

```
monthly_bonus = (final_score / 100) * CEILING_PCT * monthly_salary
```

**Going-forward (H2, progressive — see §8):**

```
bonus_pct     = CAP_PCT * ( max(0, final_score - FLOOR) / (100 - FLOOR) ) ** CURVE_P
monthly_bonus = bonus_pct * monthly_salary
```

**Anti-gaming rules:** targets freeze at quarter start (changes apply next quarter only); the conduct gate is hard and cannot be averaged away; agents see only their own score logic, never peers' absolute numbers.

---

## 3\. Constants — v2 placeholders vs v3 recalibrated

The v2 targets were explicit placeholders ("set from the team's real distribution once Ares's data lands"). Real data blows past them, saturating pillars A and C so the formula stops discriminating. v3 recalibrates from the trio's actual Jan–Jun distribution.

| Constant | v2 (placeholder) | v3 (recalibrated) | Basis |
| :---- | :---- | :---- | :---- |
| `TARGET_CAPITAL` | 150,000 / mo | **270,000 / mo** | Trio monthly net-deposit median ($269,234) |
| `TARGET_ENGAGE` | 50 clients | **600** | Median react+redeposit (633); v2 was \~12x too low |
| `TARGET_ACTIVITY` | 100 | **TBD** | Pending unified call-data feed (see §9) |
| `CEILING_PCT` (back-pay) | 15% | **15%** | TJ approved |
| `CAP_PCT` (H2 progressive) | — | **20–25%** \[DECISION\] | TJ open to higher; see §8 |
| `FLOOR` (H2 progressive) | — | **60** | No bonus below standard |
| `CURVE_P` (H2 progressive) | — | **1.5** | Convex / accelerating |
| Weights | 40/30/15/15 | 40/30/15/15 | Retention-weighted by design |

Reference distribution (trio, Jan–Jun net deposit): min $24,055 · median $269,234 · 75th pct $572,232 · max $2,299,938.

---

## 4\. Clean H1 pillar inputs (Ares data, contamination removed)

Back-pay trio only. Mahya and Armin were renamed from prior managers on 2026-05-18 (no continuous H1 history; financials only, excluded from back-pay).

| Metric | Lida | Radin | Lara |
| :---- | :---- | :---- | :---- |
| H1 net deposit | $1,410,191 | $4,803,934 | $1,704,890 |
| H1 client PNL (context) | −$1,590,265 | −$1,916,667 | −$1,656,813 |
| H1 avg survival (1−churn/start) | 60.7% | 59.6% | 59.9% |
| H1 reactivated clients | 1,764 | 1,643 | 1,667 |
| H1 redeposit clients | 1,229 | 1,143 | 1,221 |
| Service activity (calls) | no data | no data | no data |
| Conduct flags | 6\* | 0 | 0 |

\*Lida's flags are **client complaints about platform execution (slippage, PSP, orders)** — not agent misconduct. Conduct multiplier held at 1.0. See §10.

**On clean data the three are near-identical on retention, reactivation, and redeposit** — they separate only on raw net deposit (Radin 3.4x), which the capital cap neutralizes. \[INFERENCE\] The real skill differentiator on this desk is retention behavior, not dollars protected.

---

## 5\. Back-pay — FINAL numbers

Corrected formula, clean data, Service Activity redistributed across the 3 data-backed pillars (one-time, back-pay only), March left in, conduct 1.0, 15% linear ceiling. Scored Feb–Jun (January has no retention data).

| Agent | Feb | Mar | Apr | May | Jun | Avg score | Monthly bonus | 6-mo back-pay |
| :---- | :---- | :---- | :---- | :---- | :---- | :---- | :---- | :---- |
| Lida | 99.9 | 80.1 | 100 | 100 | 100 | 96.0% | $230.37 | **$1,382.22** |
| Lara | 100 | 69.2 | 100 | 100 | 100 | 93.8% | $225.24 | **$1,351.43** |
| Radin | 100 | 80.1 | 100 | 71.1 | 100 | 90.2% | $216.56 | **$1,299.34** |
| **Total** |  |  |  |  |  |  |  | **$4,032.99** |

**\[DECISION\] Multiplier:** ×6 (pay all six months, Feb–Jun avg standing in for Jan) or ×5 (only scored months). Recommendation: ×6 for a good-faith catch-up. Numbers above are ×6.

**Key result — the rigging is gone.** Under Sophia's formula, Radin's whale-heavy book crowned him. On the corrected formula he ranks **last** of the three (his May capital collapse to $57k drags him). The old winner did not survive the recompute — this is the falsification check passing, and the single most important thing to show TJ.

**Honest framing for TJ:** the 90–96% scores are near-ceiling because the back-pay ran on placeholder targets that saturate. This is deliberate for a catch-up (meaningful money, real underperformance visible only in March), **not** evidence the team maxed out. H2 will run on recalibrated targets that actually discriminate.

---

## 6\. March — systemic event, left in

All three survival rates crater to \~36% in March simultaneously, then recover — a desk-wide event (data-definition change, mass-dormancy sweep, or platform incident), not agent failure. Handling: **left in**, unadjusted. The natural drag pulls scores off 100% exactly where the team genuinely fell short, delivering a partial (not full) catch-up. Annotate in the TJ memo so sub-100 scores read as honest, not punitive. Do not zero it, do not floor it. \[OPEN\] Ares to confirm root cause for the record.

---

## 7\. Data-integrity finding — Radin's book (from CRM screenshots, 2026-07-02)

- **Earned, not inherited (top client):** Client A (ID redacted) shows First Deposit Manager \= radin, manager assigned same day as registration (2026-02-02). Genuine acquisition.  
- **Severe concentration:** that single client \= $2.55M net deposit, **\>50% of Radin's entire H1 book.** His capital "performance" is largely one whale relationship.  
- **B-book risk exemplar:** the whale carries −$1.56M floating losses (deposited $4.6M, withdrew $2M). A whale bleeding out is house-positive under B-book — the precise incentive the formula must not accelerate.  
- **Partial inheritance in the tail:** some clients (e.g., Client B (ID redacted), originally under a prior manager) were batch-reassigned to Radin on 2024-03-07.

\[INFERENCE\] Implication for H2: a capital pillar with no concentration or risk overlay rewards keeping whales underwater. Add (a) a concentration cap (single-client contribution to the capital pillar limited to X%), and (b) a risk/quality flag when a manager's book carries outsized floating losses. This protects against both revenue volatility (whale blow-up) and compliance exposure.

---

## 8\. Progressive bonus (H2 forward incentive)

TJ is open to a ceiling above 15% and wants an accelerating structure — "the further they go, the more they get." Design:

```
bonus_pct = CAP_PCT * ( max(0, score - 60) / 40 ) ** 1.5
```

- **FLOOR 60:** below standard \= no bonus.  
- **CAP\_PCT 20–25%** \[DECISION\]: raised ceiling for top performers.  
- **CURVE\_P 1.5:** convex — marginal reward increases with score.

Example on recalibrated scores (CAP 25%):
- p = 1.5 (implemented default, steeper — concentrates reward at the top):
  70 → 3.1% · 80 → 8.8% · 90 → 16.2% · 100 → 25%
- p = 1.25 (gentler alternative — rewards the middle more):
  70 → 4.4% · 80 → 10.5% · 90 → 17.4% · 100 → 25%
CURVE_P is a one-line config change. CEO to confirm cap % and curve together.

**Two hard preconditions:**

1. **Recalibrate first.** On today's saturated scores (90–96) the convex curve costs \~36% more than linear-15% while rewarding noise. It only works once targets discriminate (§3).  
2. **Strengthen risk controls first.** An accelerating capital-weighted bonus amplifies the deposit-push incentive (see §7). Ship with the hardened conduct gate \+ concentration/risk overlay, or you pay more to take on more B-book risk.

**Cost stays bounded:** max exposure \= Σ(salary × CAP\_PCT). Raising the cap raises the bound proportionally and predictably — still fundamentally safer than revenue-share.

---

## 9\. Service Activity — provably unscorable on current data (stays redistributed through H2)

Call data lives in two unlinked systems: **Zoho Call** (international clients, accessible) and a **local Iranian network log** (accessible only inside Iran's borders — not exportable to Yasi). The Zoho H1 export was reviewed 2026-07-02 and **cannot fairly power the pillar**, for structural reasons:

- **International-only → biased against Iran-heavy books.** All agents fall far below the 60-call/day standard on Zoho (Lida 20/day, Lara 23/day, "Hossein" 11/day) because the Iranian calls — the bulk of a Farsi-market desk — are invisible. "Hossein" (**\[NEEDS CONFIRMATION\]** likely Radin's real name) drops to zero Zoho calls by June, consistent with an Iranian book (his whale is Iranian). Scoring on Zoho would punish the most Iran-focused agents for working where the log can't see them.  
- **31% unattributed.** 3,089 of \~10,000 rows are "Unknown agent," concentrated Jan–Feb then dropping to zero from March — agent tagging was broken early-2026 and fixed \~March. Early-year attribution is unreliable.  
- **June near-empty; possible 10k-row export cap** (11,071 total calls vs \~10,000 rows parsed).  
- **Naming mismatch:** Zoho uses a blend of stage aliases (Lida, Lara) and real names (Hossein, Mani, Niki) — the CRM uses stage aliases. Any join must be reconciled manually.

**Usable signal:** connect rate is consistent (\~47–48% across the trio) and population-robust — a legitimate call-quality metric. Raw volume is not.

**Decision:** Service Activity remains **redistributed / unscored through H2**, not just for back-pay. Do not score activity on partial-population data — it is provably biased against Iran-focused agents.

**Path to eventually scoring it:**

1. Request a **manual monthly call summary from the Iran team** (agent alias, calls, connections) — low-tech but the only route past the data-sovereignty wall. A live integration is not feasible (platform walled inside Iran).  
2. Union that with the Zoho export on a common schema: `agent_alias, month, calls, connections, avg_duration`.  
3. Only then set `TARGET_ACTIVITY` from the unified distribution and switch the pillar on.  
4. Until unified, use Zoho **connect rate** as a soft QA input to the conduct/quality review, not a hard pillar.

\[OWNER\] Yasi \+ Iran team lead: establish the manual monthly call summary. \[OWNER\] Ares: confirm "Hossein" \= Radin alias.

---

## 10\. Conduct gate — Lida's flags formally cleared

The gate exists to catch **agent misconduct** (impeding withdrawals, pressuring deposits). It must **not** fire on **client complaints about the platform** (slippage, PSP failures, order issues).

**COO decision (2026-07-02):** Lida's 6 H1 conduct flags are **cleared** — they trace entirely to client-platform complaints logged in free-text comments, not to any agent misconduct. The flags were an artifact of comment-text keyword matching, not substantiated findings. Conduct multiplier \= 1.0. **No dollar impact** — the $4,033 back-pay already computed her at 1.0.

Going forward, the flag pipeline must distinguish agent-conduct flags from client-platform complaints **at ingestion**, or the gate will keep mislabeling platform problems as agent violations.

---

## 11\. Open decisions & owners

| \# | Item | Owner | Status |
| :---- | :---- | :---- | :---- |
| 1 | Approve $4,033 back-pay split | Yasi | Pending |
| 2 | Back-pay multiplier ×6 vs ×5 | Yasi | Pending (rec: ×6) |
| 3 | Sign off ceiling; confirm H2 CAP\_PCT (20–25%) | TJ | 15% approved; higher cap open |
| 4 | Confirm progressive curve \+ preconditions | TJ \+ Yasi | In design |
| 5 | Radin whale concentration → H2 overlay design | Yasi | Flagged |
| 6 | Service Activity: obtain manual Iran-team call summary to unify with Zoho | Yasi \+ Iran lead | Zoho reviewed; Iranian feed pending. Pillar stays redistributed through H2 |
| 7 | March root-cause confirmation | Ares | Open |
| 8 | Recalibrate targets on live H2 distribution | Yasi \+ Ares | H2 start |
| 9 | Flag pipeline: separate agent-conduct vs client-platform | Ares | H2 |
| 10 | Confirm "Hossein" \= Radin alias in Zoho | Ares | Open |
| 11 | Lida conduct flags cleared | Yasi | **Resolved 2026-07-02** |

---

## Appendix — data lineage & assumptions

- **Sources:** `Manager_Report_H1_2026` (financials, Jan–Jun), `Manager_Retention_H1_2026` (retention Feb–Jun \+ conduct comments), CRM screenshots (Radin provenance, 2026-07-02).  
- **Salaries used:** Lida/Radin/Lara $1,600/mo (per 2026 restructure).  
- **Assumptions:** (a) Feb–Jun average represents January for ×6 back-pay; (b) survival \= 1 − churn/start; retention pillar uses end/start per the formula; (c) placeholder targets used for back-pay by design; (d) conduct 1.0 for all trio.  
- **Not fabricated:** no golden numbers were invented — all computed from the two clean CSVs using the documented equations. TARGET\_ACTIVITY and H2 payout figures are explicitly pending real inputs.

