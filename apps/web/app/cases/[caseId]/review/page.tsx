import { preopCase } from "@clinicbrief/fixtures";
import { AppShell } from "../../../../components/app-shell";

export default async function ReviewPage({ params }: { params: Promise<{ caseId: string }> }) {
  const { caseId } = await params;

  return (
    <AppShell eyebrow={`Case ${caseId}`} title="Review extracted facts">
      <div className="grid gap-3">
        {preopCase.expectedFacts.map((fact) => (
          <article key={fact.id} className="rounded-md border border-clinic-line bg-white p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-semibold text-clinic-ink">{fact.displayText}</h2>
              <span className="rounded-md bg-clinic-surface px-3 py-1 text-sm text-clinic-primary">{Math.round(fact.confidence * 100)}% confidence</span>
            </div>
            <p className="mt-2 text-sm text-clinic-muted">{fact.category}</p>
          </article>
        ))}
      </div>
    </AppShell>
  );
}
