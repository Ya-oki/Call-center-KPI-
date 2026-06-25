import { PhasePlaceholder } from "@/app/_components/PhasePlaceholder";

export default function SettingsPage() {
  return (
    <PhasePlaceholder title="Settings & Dials" audience="manager" phase="P3">
      Reward dials (payout rate, paid-now/held, outcome vs activity weight,
      withdrawal-impeding penalty, currency) and OKR targets. Saving writes a new
      settings_version so historical results stay reproducible.
    </PhasePlaceholder>
  );
}
