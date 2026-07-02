# Data Request — Monthly Per-Client Capital Export

**To:** Ares (CRM data owner) · **From:** Yasi (COO) · **Re:** H2 compensation engine, concentration & risk overlay (SOT §7)

## What we need

A **monthly export**, one row **per funded client, per manager, per month**, with exactly these columns:

| Column | Meaning | Notes |
|---|---|---|
| `manager_alias` | Manager stage name | **Stage alias only, never the real name.** Must match the `Manager_Report_H1_2026` aliases exactly (e.g. Lida, Radin, Lara). |
| `month` | Reporting month | Same format as existing reports (e.g. `Jul` or `2026-07`). |
| `client_reference` | Per-client identifier | Raw CRM ID is acceptable — our ingestion pseudonymizes it to an opaque `C-xxxxxxxx` on arrival. **Even better: hash it on your side** so raw IDs never leave the CRM. |
| `net_deposit_usd` | Client net deposit for the month | Deposit − withdrawal, USD. |
| `floating_pl_usd` | Client floating P/L | Signed; negative = floating losses. |

## Purpose

Enables the **concentration cap** and **book-risk review** in the H2 compensation engine (SOT §7): capping any single client's contribution to the capital pillar, and flagging books carrying outsized floating losses for conduct review.

## Explicit exclusions (do NOT include)

- ❌ No client **names**
- ❌ No **phone numbers**
- ❌ No **emails**
- ❌ No **free-text comments** or notes of any kind

The engine needs only the five columns above. Any client-identifying content is unnecessary and will be rejected at ingestion.

## Join key

`manager_alias` is the join key to the existing `Manager_Report_H1_2026` / `Manager_Retention_H1_2026` feeds. Aliases must match those files **exactly** (same spelling/casing) or the rows won't join.

## Cadence

- **Monthly**, delivered on the **first business day**, covering the **prior calendar month**.
- Same delivery channel as the existing manager reports.

## Why aliases + pseudonymized client refs

This desk's compensation data is confidential and this export will feed an automated engine. Keeping the export to aliases + opaque client references (no names/phones/emails/comments) keeps client PII out of the compensation pipeline entirely, by design.

---
*Once this feed is live and targets are recalibrated on real distribution, `concentration_cap_enabled` flips on and the H2 overlay activates. Until then the engine falls back to the aggregate capital path (current behavior).*
