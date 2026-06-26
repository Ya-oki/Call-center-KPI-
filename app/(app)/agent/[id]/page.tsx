import { PhasePlaceholder } from "@/app/_components/PhasePlaceholder";

export default function AgentDetailPage({
  params,
}: {
  params: { id: string };
}) {
  return (
    <PhasePlaceholder
      title={`Agent · ${params.id}`}
      audience="manager"
      phase="P3"
    >
      Manager view of a single agent: where they stand, what they&apos;ve done,
      what moves them up, and history (mirrors the prototype Agent View).
    </PhasePlaceholder>
  );
}
