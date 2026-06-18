import { AppShell } from "../../../../components/app-shell";

export default async function SettingsPage({ params }: { params: Promise<{ caseId: string }> }) {
  const { caseId } = await params;

  return (
    <AppShell eyebrow={`Case ${caseId}`} title="Privacy controls">
      <div className="rounded-md border border-clinic-line bg-white p-5">
        <h2 className="font-semibold text-clinic-ink">Delete all case data</h2>
        <p className="mt-2 text-sm leading-6 text-clinic-muted">Delete endpoint and storage cleanup wiring belongs here.</p>
        <button className="mt-4 min-h-11 rounded-md border border-red-200 px-5 py-3 font-semibold text-red-700" type="button">
          Delete case
        </button>
      </div>
    </AppShell>
  );
}
