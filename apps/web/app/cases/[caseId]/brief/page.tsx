import { preopCase } from "@clinicbrief/fixtures";
import { AppShell } from "../../../../components/app-shell";

export default async function BriefPage({ params }: { params: Promise<{ caseId: string }> }) {
  const { caseId } = await params;
  const brief = preopCase.expectedBrief;

  return (
    <AppShell eyebrow={`Case ${caseId}`} title={brief.title}>
      <article className="grid gap-5 rounded-md border border-clinic-line bg-white p-5">
        <p className="text-lg font-semibold text-clinic-ink">{brief.oneLineReasonForVisit}</p>
        <section>
          <h2 className="font-semibold text-clinic-ink">90-second story</h2>
          <p className="mt-2 leading-7 text-clinic-muted">{brief.ninetySecondStory}</p>
        </section>
        <section>
          <h2 className="font-semibold text-clinic-ink">Questions for clinician</h2>
          <ul className="mt-2 list-inside list-disc text-clinic-muted">
            {brief.questionsForClinician.map((question) => (
              <li key={question}>{question}</li>
            ))}
          </ul>
        </section>
      </article>
    </AppShell>
  );
}
