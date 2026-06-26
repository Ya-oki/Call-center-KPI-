# Retention Desk — Reward & Performance System
### Design Blueprint v1 · Opo Call Center (Account-Management / Retention Desk)
**Status:** Draft for sign-off · **Owner:** Yasi · **Date:** 2026-06-24

> One line: *The desk collectively earns a share of the net revenue its clients generate. Each person's slice is set by what they verifiably did. Part is paid now; part matures over the next quarter to prove the client actually stayed.*

---

## 1. Goal

Design a **fair, automatic, transparent** reward and performance system for a retention desk whose agents **do not convert clients** — they service, retain, and grow already-deposited clients via calls, WhatsApp, email and messaging. The system must:

- Reconstruct deserved rewards for **Jan–Jun 2026** (the disputed legacy period) — **Job 1, backtest/true-up**.
- Run forward on a **rolling 3-month cycle** with OKRs → plan → KPIs — **Job 2**.
- Be **sophisticated underneath** (it accounts for attribution, maturity, gaming, conduct) and **simple on the surface** (one statement an agent with no maths can read and trust).

## 2. Confirmed design inputs (your four decisions)

| Decision | Choice | Consequence |
|---|---|---|
| Value metric | **Net company revenue** | Reward tracks real desk P&L, not deposits. Avoids the conflict trap. Requires per-client revenue data. |
| Book model | **Pooled / dynamic assignment** | No individual ownership → **pool + contribution-share** model, not personal-book commission. |
| Backtest scope | **Jan–Jun 2026 (~6 mo)** | Six monthly cohorts of differing maturity → must normalize maturity. |
| Data access | **Mix of export + manual** | Engine ingests one **normalized input table** that can be filled partly by export, partly by hand. |

## 3. The operating model

### 3.1 Desk Revenue Pool
For each cohort window (a quarter), the desk earns a pool:

```
Pool = Net_Desk_Revenue × PayoutRate
```

- **Net_Desk_Revenue** = net company revenue from the clients the desk serviced in the window. Components to confirm with Finance: spread markup + commissions + swap/financing income, **net of** bonuses/credits, chargebacks/reversals, and (decision point) any A-book rebates. *B-book note below.*
- **PayoutRate** = a single dial (e.g., a single-digit to low-double-digit %). **Not set here** — it is a budget decision; the engine treats it as a parameter so you can model 2–3 envelopes before committing.

### 3.2 Contribution Score (how the pool splits)
Each agent *i* gets a score; their payout is their share of total score:

```
Payout_i = Pool × ( Score_i / Σ Score )

Score_i = Conduct_i × ( wO · OutcomeIndex_i  +  wA · ActivityIndex_i )
```

- **OutcomeIndex** (suggested weight wO ≈ 0.65): retention + value outcomes on the clients this agent serviced — client survival, net revenue retained/grown, reactivations. This is *what happened*.
- **ActivityIndex** (wA ≈ 0.35): qualified, quality-weighted servicing — meaningful touchpoints, coverage of assigned clients, responsiveness/SLA. This is *what they did* — it rewards effort on clients that haven't yet paid off and stops the score from being pure luck.
- **Conduct** (0–1 gate, defaults to 1): drops below 1 for complaints, compliance breaches, mis-selling flags, or **data-hygiene failures**. A serious breach can zero the score. This is the anti-harm spine.
- All indices are normalized **0–1 against desk peers/targets**, which is what makes a pooled/dynamic book fair — you're scored on relative contribution, not on whose clients you happened to touch.

### 3.3 Why this resolves your two hardest problems
- **Book fairness** — nobody owns a lucky book; everyone draws from one pool by contribution.
- **Attribution under dynamic assignment** — revenue is credited to *servicing during the window*, blended across whoever touched the client, so "who owns this client" never has to be answered.

## 4. Maturity & the 3-month longevity rule

Retention value is only visible with time, and your backtest months have unequal maturity (January has 6 months of proof; June has ~0). Two mechanisms handle this:

1. **Pay only from realized revenue.** The pool is built from revenue *actually earned to date*. Later-maturing cohorts are **trued up** as their revenue lands. Maturity therefore affects *pool size fairly* (you can't pay what hasn't been earned) but **not** relative shares — because every agent inside the same cohort faces the same maturity, the share split is maturity-neutral.
2. **Holdback / clawback** (forward system, suggested defaults):
   - **60% paid at quarter close** — the earned-now portion.
   - **40% held, released one quarter later** if the cohort's clients survive and revenue doesn't reverse. Forfeited/clawed back on churn, chargeback, or bonus-abuse reversal.
   - This directly encodes "wait 3 months to see if the client is real," and it protects the desk from paying for vanity retention.

> Agent-facing framing of the holdback is critical for morale — see §8.

## 5. Anti-gaming guardrails (every metric has a paired defense)

| Incentive risk | Guardrail built into the model |
|---|---|
| Spam calls to inflate activity | Touchpoints must be **quality-weighted** (min duration / outcome-tagged); raw counts capped. |
| Pushing clients to over-deposit / reload | We pay on **net revenue, not deposits**; bonuses excluded; conduct gate penalizes withdrawal-regret & complaints. |
| Cherry-picking high-value clients (pooled book) | **Coverage** sub-metric rewards servicing assigned/low-touch clients; orphaned-client penalty. |
| Revenue from client losses (if B-book) | **Conduct gate + responsible-trading flags**; explicit decision on whether client trading P&L is included in Net_Desk_Revenue (§9). |
| Dirty agent→client mapping | Data-hygiene is part of the **conduct gate**; unmapped activity doesn't score. |

## 6. OKR → KPI cascade (forward 6 months = 2 quarters)

**North-star metric:** **Net Revenue Retention (NRR)** of the serviced book — the externally-validated right metric for a retention function.

**Desk Objective (illustrative — to tune with you):** *Make the serviced book measurably more durable and valuable each quarter.*

Key Results (desk-level, measurable):
- NRR of serviced book ≥ target%.
- Active-client retention rate (survival past N days) ≥ target%.
- Reactivation of dormant clients ≥ N / quarter.
- Complaint / conduct-flag rate ≤ threshold.

These cascade down to **individual KPIs** (continuous health metrics, *not* the reward formula itself — the formula is §3):
- Coverage (% of assigned clients meaningfully serviced)
- Responsiveness / SLA on inbound
- Quality-weighted touchpoints
- Outcome contribution (retained + grown net revenue)
- Conduct score

> OKRs are set per quarter and reviewed in **brief weekly check-ins**; KPIs are watched continuously. (Standard practice, and it fits the 3-month reward cycle exactly.)

## 7. Job 1 — Backtest / true-up (Jan–Jun 2026)

Method, in plain steps:
1. Rebuild monthly cohorts of serviced clients with their **realized net revenue to date**.
2. Compute each agent's **Contribution Score within each cohort** (maturity-neutral, §4).
3. Pool per cohort = realized net revenue × PayoutRate (model 2–3 PayoutRate envelopes).
4. Allocate pool by score → each agent's **deserved legacy reward**.
5. Produce a per-agent, per-month statement + a one-page total, written and version-stamped for **sign-off** (you have a prior-manager dispute in the background — this must be documented and signed).

## 8. The simple surface (what the agent sees)

A single statement, no maths visible:

```
This quarter the desk earned a reward pool of  ████
You did   18%   of the qualifying work          ┌────────────┐
   • clients you kept & grew      ▇▇▇▇▇▇▇▇        │  €  X,XXX  │  paid now
   • your servicing & coverage    ▇▇▇▇▇            │  €    YYY  │  held → released
   • conduct                      ✓ clean          └────────────┘   next quarter if
                                                                     clients stay
You rank 3rd of 11 this quarter.  Here are the 2 things that move you up.
```

Sophisticated engine, kindergarten-clear output. "Simple but not easy."

## 9. Red team — what could make this wrong

- **Data integrity is the whole ballgame.** If CRM agent→client mapping lacks reliable **timestamps** for assignment/reassignment, time-windowed attribution is unauditable. *Detect early:* sample 10 clients, trace their assignment history end-to-end before trusting any number.
- **B-book conflict.** If the desk's net revenue includes clients' trading losses, you are rewarding agents partly for funded losers. *Hedge:* decide explicitly whether client P&L is in/out of Net_Desk_Revenue; keep the conduct gate strict; document the rationale.
- **PayoutRate set blind.** Without a revenue baseline you can over- or under-commit the pool. *Hedge:* set the rate only after the backtest reveals the realized-revenue base; model 3 envelopes first.
- **Holdback morale risk.** Agents may read the 40% hold as "withheld pay." *Hedge:* present as "matured reward," show the held amount explicitly, and let Job 1 pay out a clean lump that builds trust before the hold mechanic goes live.
- **Legal.** Retroactive comp change with a live dispute → the Job 1 method and Job 2 plan should be **written, signed, and dated**.

## 10. Falsifiability / how we know it's working

- **Leading signal of failure:** activity climbs but NRR/retention doesn't → agents are gaming the activity index; re-weight.
- **Fairness test:** re-run the split with activity weight set to 0 and to 1; if rankings swing wildly, the weights are doing too much work — recalibrate.
- **Trust test:** can a randomly chosen agent re-derive their own number from the statement in under two minutes? If not, the surface isn't simple enough.

## 11. Data contract (the input table the engine needs)

One normalized table (CSV), fillable by export + manual. Minimum fields:

**Per client × month**
- client_id · assigned_agent_id · assignment_start_date · assignment_end_date (for reassignments)
- account_open_date · client_status (active/dormant/churned)
- deposits · withdrawals · bonus_credit (to exclude) · net_deposit
- **net_company_revenue** (spread + commission + swap, net of reversals) — the key field; confirm reachability
- chargebacks / reversals

**Per agent × month (activity, from Zoho/VoIP + messaging)**
- agent_id · qualified_calls · total_talk_time · whatsapp/email touches · avg_response_time · clients_covered

**Reference**
- agent roster (start dates, for per-agent backtest windows)
- conduct/complaint log

> Where a field can't be exported, the same column is filled manually — the engine doesn't care about the source, only the schema.

## 12. Open decisions before build

1. **PayoutRate envelope(s)** to model (set after backtest reveals revenue base).
2. **B-book question:** is client trading P&L included in Net_Desk_Revenue? (Yes / No / Hybrid)
3. **Holdback split** (default 60/40) and survival window for release.
4. **Index weights** (default wO 0.65 / wA 0.35) and the conduct-gate penalty schedule.
5. **Is `net_company_revenue` reachable per client**, or do we proxy it (e.g., from volume × average markup) until it is?

---
*Engine math is intentionally parameterized — every default above is a dial, not a hardcoded value, so the model can be tuned to your reality without a redesign.*
