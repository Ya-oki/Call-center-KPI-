/**
 * Conduct flag ingestion (H2, SOT §10).
 *
 * Notes describe conduct; they must NEVER identify a client. PII guard at the
 * door: reject any note containing a 5+-digit run or a phone-like pattern.
 */

import type { ConductFlag } from "@/lib/engine/types";

const DIGIT_RUN = /\b[0-9]{5,}\b/;
const PHONE_LIKE = /\+?[0-9][0-9\s\-()]{7,}/;

export class ConductNoteRejected extends Error {}

/** Validate + accept flags; throws ConductNoteRejected on a PII-bearing note. */
export function ingestConductFlags(flags: ConductFlag[]): ConductFlag[] {
  for (const f of flags) {
    if (f.note !== undefined && (DIGIT_RUN.test(f.note) || PHONE_LIKE.test(f.note))) {
      throw new ConductNoteRejected(
        `Conduct note rejected — looks like it identifies a client (digits/phone): "${f.note}"`,
      );
    }
  }
  return flags;
}
