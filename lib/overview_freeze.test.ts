/**
 * /overview FREEZE GUARD — the merge gate for the H1 statement of record.
 *
 * The team actively uses https://call-center-kpi.vercel.app/overview as the H1
 * back-pay statement. Any change to that page mid-review is a business problem.
 * This test pins the exact content of the /overview page and every component it
 * renders. If any of them changes, this test fails — forcing a deliberate,
 * reviewed decision to re-pin (which for a frozen page should not happen).
 *
 * To intentionally change /overview later: update the page, then update the
 * pinned hash here in the SAME commit, and note it in the PR.
 */

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const FROZEN: Record<string, string> = {
  "app/(app)/overview/page.tsx":
    "fae672fccecc6b19c14cd5895aa7db7cf92f1a9c7e9eb8a36737be97d89a741c",
  "app/(app)/overview/ModeToggle.tsx":
    "f61f2a99be409045db7efe0ebcef98374909dc0846edc3d3d02a7dda23483efa",
};

function sha256(file: string): string {
  const buf = readFileSync(path.join(process.cwd(), file));
  return createHash("sha256").update(buf).digest("hex");
}

describe("/overview is frozen (H1 statement of record)", () => {
  for (const [file, expected] of Object.entries(FROZEN)) {
    it(`${file} is unchanged`, () => {
      expect(sha256(file)).toBe(expected);
    });
  }
});
