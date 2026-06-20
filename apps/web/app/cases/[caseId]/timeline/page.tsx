import { buildBriefFromReviewedFacts, buildTimelineFromReviewedFacts } from "@clinicbrief/exports";
import { notFound } from "next/navigation";
import { AppShell } from "../../../../components/app-shell";
import { Chip, DemoCta, DemoFlowNav, SectionHeader } from "../../../../components/demo/demo-case-components";
import { getClinicRepository } from "../../../../lib/server/clinic-repository";
import { listPatternCards } from "../../../../lib/server/pattern-service";
import { PatternReviewPanel } from "./pattern-review-panel";
import { TimelineFilterList } from "./timeline-filter-list";

export default async function TimelinePage({ params }: { params: Promise<{ caseId: string }> }) {
  const { caseId } = await params;
  const repository = await getClinicRepository();
  const record = await repository.getCase(caseId);

  if (!record) {
    notFound();
  }

  const timeline = record.timeline.length > 0 ? record.timeline : buildTimelineFromReviewedFacts(caseId, record.facts);
  const brief = buildBriefFromReviewedFacts({
    caseTitle: record.title,
    briefType: record.mode === "PREOP" ? "PREOP" : "GP",
    facts: record.facts,
    questions: record.questions,
    timeline,
    sourcePreviews: record.sourcePreviews
  });
  const isDemoCase = caseId === "sample-preop";
  const patternCards = listPatternCards(record);

  return (
    <AppShell eyebrow={`Case ${caseId}`} title="Timeline">
      {isDemoCase ? <DemoFlowNav current="Timeline" /> : null}

      <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        <section className="grid content-start gap-4">
          <SectionHeader
            eyebrow="Chronological story"
            title="From scattered notes to a pre-op timeline"
            body="Events are grouped in a patient-readable order with source-backed summaries, not clinical interpretation."
          />

          <TimelineFilterList timeline={timeline} />
        </section>

        <aside className="grid content-start gap-4">
          <PatternReviewPanel caseId={caseId} initialPatternCards={patternCards} />

          <section className="rounded-[1.25rem] border border-[#EFE2D2] bg-[#FFFDF8] p-5 shadow-[0_10px_28px_rgba(61,47,38,0.08)]">
            <div className="flex flex-wrap items-center gap-2">
              <Chip tone="primary">What changed</Chip>
              <Chip>Since last appointment</Chip>
            </div>
            <h2 className="mt-4 text-xl font-semibold text-[#3D2F26]">Ready for the next conversation</h2>
            <ul className="mt-4 grid gap-3 text-sm font-medium leading-6 text-[#8A7A6E]">
              {brief.whatChangedSinceLastAppointment.map((item) => (
                <li key={item} className="rounded-2xl border border-[#EFE2D2] bg-[#F8F1E7] p-3">
                  {item}
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-[1.25rem] border border-[#EFE2D2] bg-[#FFFDF8] p-5 shadow-[0_10px_28px_rgba(61,47,38,0.08)]">
            <h2 className="text-xl font-semibold text-[#3D2F26]">Open uncertainties</h2>
            <ul className="mt-4 grid gap-2">
              {brief.openUncertainties.map((item) => (
                <li key={item}>
                  <Chip tone="warning">{item}</Chip>
                </li>
              ))}
            </ul>
          </section>
        </aside>
      </div>

      <div className="flex flex-wrap gap-3">
        <DemoCta href={`/cases/${caseId}/brief`}>Generate one-page brief</DemoCta>
        <DemoCta href={`/cases/${caseId}/review`} secondary>
          Back to review
        </DemoCta>
      </div>
    </AppShell>
  );
}
