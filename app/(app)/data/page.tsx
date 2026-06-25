import { PhasePlaceholder } from "@/app/_components/PhasePlaceholder";

export default function DataPage() {
  return (
    <PhasePlaceholder title="Data & Upload" audience="manager" phase="P2 / P3">
      Manager uploads the clients + activity CSVs, downloads blank templates,
      sees the per-row validation report, and exports results. Upserts are
      idempotent by primary key (mirrors the prototype Data view).
    </PhasePlaceholder>
  );
}
