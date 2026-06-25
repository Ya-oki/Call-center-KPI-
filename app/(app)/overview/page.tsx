import { PhasePlaceholder } from "@/app/_components/PhasePlaceholder";

export default function OverviewPage() {
  return (
    <PhasePlaceholder title="Desk Overview" audience="manager" phase="P3">
      Net desk revenue, reward pool, active-client retention, paid-now/held
      split, revenue-by-month, and OKR progress (mirrors the prototype Overview).
    </PhasePlaceholder>
  );
}
