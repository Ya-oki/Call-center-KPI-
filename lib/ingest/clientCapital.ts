/**
 * Per-client capital ingestion (H2, SOT §7).
 *
 * Raw CRM client IDs must NEVER be stored or committed. At ingestion, every
 * `client_ref` is replaced by a stable opaque pseudonym `C-<8 letters>` derived
 * from a deterministic hash — same client → same pseudonym across months, and no
 * digits ever appear, so no raw 5+-digit ID can survive.
 */

import type { ClientCapitalRow } from "@/lib/engine/types";

/** Raw input row as it might arrive from the CRM (client_ref may be a real ID). */
export interface RawClientCapitalRow {
  manager_alias: string;
  month: string;
  client_ref: string;
  net_deposit: number;
  floating_pl: number;
}

const PSEUDONYM_RE = /^C-[a-p]{8}$/;
// 16-letter alphabet (one letter per hash nibble) → output is always all-letters.
const ALPHABET = "abcdefghijklmnop";

/** Stable, non-reversible pseudonym for a raw client reference. */
export function pseudonymizeClientRef(raw: string): string {
  if (PSEUDONYM_RE.test(raw)) return raw; // already pseudonymized — keep stable
  // FNV-1a (32-bit)
  let h = 0x811c9dc5;
  for (let i = 0; i < raw.length; i += 1) {
    h ^= raw.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  h >>>= 0;
  let out = "";
  for (let i = 0; i < 8; i += 1) {
    out += ALPHABET[(h >> (i * 4)) & 0xf];
  }
  return `C-${out}`;
}

/** Pseudonymize a batch of raw rows. The raw client_ref is dropped, never persisted. */
export function ingestClientCapital(rows: RawClientCapitalRow[]): ClientCapitalRow[] {
  return rows.map((r) => ({
    manager_alias: r.manager_alias,
    month: r.month,
    client_ref: pseudonymizeClientRef(r.client_ref),
    net_deposit: r.net_deposit,
    floating_pl: r.floating_pl,
  }));
}
