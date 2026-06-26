import { PhasePlaceholder } from "@/app/_components/PhasePlaceholder";

export default function LoginPage() {
  return (
    <PhasePlaceholder title="Sign in" audience="auth" phase="P3 (Auth + RLS)">
      Supabase Auth (email magic-link or password). Role + agent_id resolve the
      user to manager / agent / auditor and gate every view.
    </PhasePlaceholder>
  );
}
