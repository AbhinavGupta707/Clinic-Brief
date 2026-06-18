import { Events } from "@clinicbrief/events";
import { AppShell } from "../../components/app-shell";

export default function NovusProofPage() {
  return (
    <AppShell eyebrow="Submission proof" title="Novus event proof">
      <div className="rounded-md border border-clinic-line bg-white p-5">
        <p className="text-sm leading-6 text-clinic-muted">
          Wire the Novus install snippet and dashboard screenshot here. The event allowlist below intentionally excludes raw health content.
        </p>
        <pre className="mt-4 overflow-auto rounded-md bg-clinic-surface p-4 text-sm text-clinic-ink">
          {JSON.stringify(Events, null, 2)}
        </pre>
      </div>
    </AppShell>
  );
}
