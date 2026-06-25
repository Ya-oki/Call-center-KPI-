/**
 * Shared placeholder for P0 route stubs. Each view is wired into the App Router
 * now; the real UI (mirroring the prototype's four views + auth) is built in P3.
 */
export function PhasePlaceholder({
  title,
  audience,
  phase,
  children,
}: {
  title: string;
  audience: "manager" | "agent" | "auth";
  phase: string;
  children?: React.ReactNode;
}) {
  return (
    <main style={{ padding: 24, maxWidth: 880, margin: "0 auto" }}>
      <p style={{ color: "var(--muted)", fontSize: 12, letterSpacing: ".04em" }}>
        {audience.toUpperCase()} · BUILT IN {phase}
      </p>
      <h1 style={{ fontSize: 20, marginTop: 4 }}>{title}</h1>
      <div
        style={{
          marginTop: 16,
          padding: 16,
          border: "1px solid var(--line)",
          borderRadius: 12,
          background: "var(--panel)",
          color: "var(--muted)",
        }}
      >
        {children ?? "Scaffolded route. UI arrives in a later build phase."}
      </div>
    </main>
  );
}
