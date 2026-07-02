> **Superseded by Retention_Desk_MASTER_SOT_v3.md — kept for audit trail.**

# Retention Desk — Corrected Compensation Model \+ OKRs (v2)

**Prepared for:** TJ (CEO), Yasi (COO) **Scope:** Retention account managers only (IB and conversion teams excluded — separate systems). **Core rule:** The bonus is a **percentage added to salary**, never a share of revenue. Cost is bounded at `salary × ceiling%`. **Status:** PROVISIONAL — not an authorized payout. Final numbers require Ares's Feb–June CRM export and TJ's sign-off on the ceiling %.

---

## Part 1 — What the old scoring formula actually was (decoded)

The existing "Total Monthly Score" (out of 100\) was built from four hidden parts. Reverse-engineered from the real January 2026 data:

| Component | Stated weight | Actual hidden math | Maxes out at |
| :---- | :---- | :---- | :---- |
| Net Deposit | 50 | `Real Net Deposit ÷ 6,000` (uncapped) | \~300k/month |
| FTD (first-time deposits) | 20 | `FTD count ÷ 150 × 20` | 150 FTDs |
| Redeposit clients | 20 | `redeposit-client count ÷ 450 × 20` | 450 clients |
| Calls | 10 | flat 10 for everyone | — |

*Verification:* Lida's January net-deposit score of 69.45 \= 416,676 ÷ 6,000, exactly. The decode is correct.

### The eight problems

1. **It scores deposit collection, not retention.** 70% of points (Net Deposit 50 \+ FTD 20\) reward money coming in. The desk's actual mission — keep clients, protect their capital, rescue at-risk accounts — is barely measured.  
2. **The weights are fake.** Net Deposit is uncapped: Lida scored **69 on a component capped at 50**. In 2025 this produced totals of 113, 114, 123 — over 100\. It is effectively a single deposit metric wearing a four-part costume.  
3. **Biggest book wins automatically.** Net Deposit is a raw dollar total, not per-client or a rate. An agent assigned wealthy clients outscores one assigned small clients **for identical work**. It measures who you were given, not how you performed.  
4. **It is structurally riggable.** Because of (3), whoever controls book assignment controls the scores. The previous manager controlled book assignment, the CRM export, *and* was scored by the same system — no separation of duties. A fair system never permits this.  
5. **It rewards deposit-pushing — a B-book/compliance risk.** Paying on net deposits incentivizes pressuring clients to deposit. Under B-book exposure, more deposits can mean more client losses.  
6. **No conduct or quality check exists.** An agent can score high by any means, including impeding withdrawals or pressuring clients, with zero downward adjustment.  
7. **The calls component is dead.** Everyone gets a flat 10/10. The real call data (answered, missed, duration) was never wired in.  
8. **It penalizes agents for client withdrawals.** A whale cashing out pushes the score negative (Radin hit −29 in a 2025 month). That isn't the agent's failure, and penalizing it contradicts the "never impede withdrawals" principle.

**Verdict:** The net-deposit *core idea* is legitimate — protecting client capital matters. The *construction* is not defensible: uncapped, size-biased, conversion-contaminated, conduct-blind, with a dead activity input and unfair downside. **Use the CRM numbers; discard the scoring rules.**

---

## Part 2 — The corrected retention formula

A score out of 100, built from four capped pillars, then gated on conduct. Conversion (FTD) is removed — that is the Iran team's job now.

| Pillar | Points | What it rewards | Fixes |
| :---- | :---- | :---- | :---- |
| **A. Retained Capital** | 40 | Net client money kept (deposits − withdrawals), vs a monthly target | Capped (no runaway); floored at 0 (no unfair negative) |
| **B. Client Retention** | 30 | % of the agent's funded clients still active at month-end | The retention signal the old model lacked |
| **C. Reactivation & Loyalty** | 15 | Dormant clients revived \+ repeat-depositing clients | Rewards nurturing, not pushing |
| **D. Service Activity** | 15 | Real calls/connections/coverage vs the \~60-call/day standard | Replaces the dead flat-10 |
| **Conduct gate** | ×(0–1) | Clean \= 1.0; violations multiply the score down, to 0 in serious cases | The integrity fix that was missing |

### Equations

```
A_capital     = clamp(0, 40, max(0, retained_capital) / TARGET_CAPITAL × 40)
B_retention   = clamp(0, 30, (active_clients_end / clients_start) × 30)
C_engagement  = clamp(0, 15, (reactivated + redeposit_clients) / TARGET_ENGAGE × 15)
D_activity    = clamp(0, 15, activity_composite / TARGET_ACTIVITY × 15)

raw_score     = A_capital + B_retention + C_engagement + D_activity   # 0–100
final_score   = raw_score × conduct_multiplier                         # 0–100

monthly_bonus = (final_score / 100) × CEILING_PCT × monthly_salary
quarterly_bonus = average(final_score over quarter) / 100 × CEILING_PCT × quarterly_salary
```

### Dials (set once, frozen per quarter)

| Setting | Working value | Notes |
| :---- | :---- | :---- |
| `TARGET_CAPITAL` | 150,000 / month | Net-deposit-retained that earns full 40\. Set from the team's real distribution once Ares's data lands. |
| `TARGET_ENGAGE` | 50 clients | Reactivated \+ redeposit clients for full 15\. |
| `TARGET_ACTIVITY` | 100 (composite) | Calls/connections/coverage index for full 15\. |
| `CEILING_PCT` | 15% | Max bonus as % of salary. **TJ's number to confirm.** |
| Weights | 40 / 30 / 15 / 15 | Retention-weighted by design. |

**Anti-gaming rules:** targets freeze at quarter start (changes apply next quarter only); the conduct gate is hard and cannot be averaged away; agents see only their own score logic, never peers' absolute numbers.

---

## Part 3 — Worked example (illustrative fixture, 15% ceiling, one month)

Five current agents, one month, to show the mechanic end-to-end:

| Agent | A (40) | B (30) | C (15) | D (15) | Raw | Conduct | Final | Bonus |
| :---- | :---- | :---- | :---- | :---- | :---- | :---- | :---- | :---- |
| Lida | 40.00 | 28.12 | 13.50 | 14.25 | 95.88 | 1.00 | 95.88 | **$230.10** |
| Radin | 37.33 | 28.48 | 15.00 | 15.00 | 95.81 | 1.00 | 95.81 | **$229.95** |
| Lara | 24.00 | 27.27 | 11.40 | 13.20 | 75.87 | 1.00 | 75.87 | **$182.09** |
| Mahya | 16.00 | 28.33 | 6.60 | 9.00 | 59.93 | 1.00 | 59.93 | **$112.37** |
| Ali | 10.67 | 24.00 | 6.00 | 10.50 | 51.17 | **0.50** | 25.58 | **$53.72** |

**Total monthly bonus cost: $808.25.** Maximum possible (everyone scores 100, no conduct gate): **$1,117.50/month.** The cost is bounded and predictable — the thing revenue-share never gave you.

Read the story: Lida and Radin land near the top because they retain capital *and* clients *and* stay active. Lara has a weaker capital month. Ali's raw 51 is **halved by a conduct violation** — the gate visibly bites, which is the whole point.

### Why the new model is fairer — real January data

The cap fix, shown on actual January net deposits:

| Agent | Real Net Deposit (Jan) | OLD capital score (uncapped) | NEW capital score (capped /40) |
| :---- | :---- | :---- | :---- |
| Lida | 416,676 | 69.45 | 40.00 |
| Radin | 164,305 | 27.38 | 40.00 |
| Lara | 47,606 | 7.93 | 12.69 |

Under the old model, Lida's single big-deposit month buried everyone. Under the new model, both Lida and Radin reach the capital cap — so they're separated by **retention quality, service, and conduct**, not by who happened to hold the richest clients. That is the bias fix in one table.

---

## Part 4 — Draft OKRs (Retention Desk, H2 2026\)

**Purpose:** Protect and grow the capital of existing clients by keeping them active, engaged, and well-served — without pressuring deposits or impeding withdrawals.

**Objective 1 — Protect retained client capital**

- KR1: Desk-level net deposit retention positive every month.  
- KR2: Client retention rate ≥ 85% (funded clients still active month-over-month).  
- KR3: Monthly capital outflow kept below the quarter's agreed threshold.

**Objective 2 — Keep clients active and engaged**

- KR1: Reactivate ≥ 10% of dormant clients each quarter.  
- KR2: Redeposit rate among active clients ≥ target.  
- KR3: Contact coverage ≥ 95% of assigned book.

**Objective 3 — Deliver high-quality, compliant service**

- KR1: QA/quality score ≥ 90%.  
- KR2: Zero substantiated conduct violations (no withdrawal impediment, no deposit pressure).  
- KR3: First-response time within the agreed SLA.

**Objective 4 — Maintain service activity standards**

- KR1: \~60 outbound calls/day, 20–25 connections/day (per the signed job description).  
- KR2: All client interactions logged in CRM within 24 hours.  
- KR3: Schedule adherence ≥ 95%.

Each objective maps to one scoring pillar: O1 → Retained Capital, O2 → Reactivation, O3 → Conduct gate \+ Retention, O4 → Service Activity. The OKRs are *what good looks like*; the formula is *how it's measured and paid*. Bracketed targets are set from the team's real distribution once Ares's data arrives.

---

## Part 5 — What's decided, what's pending

**Decided (acting-COO recommendation):**

- One corrected retention formula for **both** back-pay (Jan–June) and going forward — the old formula is too flawed to bless retroactively, and these bonuses were never paid or promised on it.  
- Show old-vs-new side by side for transparency.  
- Bonus \= % of salary, conduct-gated, cost-bounded.

**Pending:**

- **Ares (tomorrow):** Feb–June per-agent data — retained capital, active vs churned clients, reactivations, real call activity. (January already exists.)  
- **TJ:** confirm the ceiling % (15% working value).  
- **Yasi:** approve the four-pillar weighting and targets once the real distribution is visible.

---

*PROVISIONAL — illustrative figures. No authorized payout is represented until data is complete and TJ signs off.*  
