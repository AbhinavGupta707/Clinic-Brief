import { preopCase } from "@clinicbrief/fixtures";
import { AppShell } from "../../../../components/app-shell";

export default async function TimelinePage({ params }: { params: Promise<{ caseId: string }> }) {
  const { caseId } = await params;

  return (
    <AppShell eyebrow={`Case ${caseId}`} title="Timeline">
      <ol className="grid gap-3">
        {preopCase.expectedTimeline.map((event) => (
          <li key={event.id} className="rounded-md border border-clinic-line bg-white p-4">
            <p className="text-sm font-semibold text-clinic-primary">{event.approximateDate ?? event.date ?? "Date unknown"}</p>
            <h2 className="mt-1 font-semibold text-clinic-ink">{event.title}</h2>
            <p className="mt-1 text-sm leading-6 text-clinic-muted">{event.description}</p>
          </li>
        ))}
      </ol>
    </AppShell>
  );
}
