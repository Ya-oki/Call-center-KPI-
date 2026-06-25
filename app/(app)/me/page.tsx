import { PhasePlaceholder } from "@/app/_components/PhasePlaceholder";

export default function MePage() {
  return (
    <PhasePlaceholder title="My Reward" audience="agent" phase="P3">
      The agent&apos;s own self-serve view (read-only, RLS-scoped to self): one
      payout number, three drivers, paid-now/held split, &quot;what moves you
      up&quot;, plus the verbatim How-it-works + Withdrawals policy.
    </PhasePlaceholder>
  );
}
