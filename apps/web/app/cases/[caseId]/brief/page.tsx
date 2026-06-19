import { preopCase } from "@clinicbrief/fixtures";
import { AppShell } from "../../../../components/app-shell";
import { BriefPreview, BriefSection, Chip, DemoCta, DemoFlowNav, SectionHeader } from "../../../../components/demo/demo-case-components";

export default async function BriefPage({ params }: { params: Promise<{ caseId: string }> }) {
  const { caseId } = await params;
  const brief = preopCase.expectedBrief;

  return (
    <AppShell eyebrow={`Case ${caseId}`} title={brief.title}>
      <DemoFlowNav current="Brief" />

      <SectionHeader
        eyebrow="Clinician-readable draft"
        title="One-page pre-op brief, story, and questions"
        body="This page is meant to feel printable and reviewable by the patient before sharing. It labels uncertainties instead of filling gaps with advice."
      />

      <BriefPreview />

      <article className="grid gap-5 rounded-md border border-clinic-line bg-white p-5 shadow-soft">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-cyan-100 pb-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.08em] text-clinic-primary">Tell my story in 90 seconds</p>
            <h2 className="mt-1 text-2xl font-semibold text-clinic-ink">Practice script</h2>
          </div>
          <Chip tone="success">Safe appointment prep</Chip>
        </div>
        <p className="text-base leading-8 text-clinic-muted">{brief.ninetySecondStory}</p>
      </article>

      <div className="grid gap-4 lg:grid-cols-2">
        <BriefSection title="Questions for clinician">
          <ul className="grid gap-3 text-sm leading-6 text-clinic-muted">
            {brief.questionsForClinician.map((question) => (
              <li key={question} className="rounded-md border border-cyan-100 bg-clinic-surface p-3">
                {question}
              </li>
            ))}
          </ul>
        </BriefSection>

        <BriefSection title="Allergies and important notes">
          <ul className="grid gap-3 text-sm leading-6 text-clinic-muted">
            {brief.allergiesAndImportantNotes.map((note) => (
              <li key={note} className="rounded-md border border-cyan-100 bg-white p-3">
                {note}
              </li>
            ))}
          </ul>
        </BriefSection>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <BriefSection title="Open uncertainties">
          <div className="flex flex-wrap gap-2">
            {brief.openUncertainties.map((item) => (
              <Chip key={item} tone="warning">
                {item}
              </Chip>
            ))}
          </div>
        </BriefSection>

        <BriefSection title="Source coverage">
          <ul className="grid gap-2 text-sm leading-6 text-clinic-muted">
            {brief.sourceCoverage.map((coverage) => (
              <li key={coverage.section} className="flex items-center justify-between gap-3 rounded-md border border-cyan-100 p-3">
                <span>{coverage.section}</span>
                <Chip tone="primary">{coverage.sourceCount} source{coverage.sourceCount === 1 ? "" : "s"}</Chip>
              </li>
            ))}
          </ul>
        </BriefSection>
      </div>

      <div className="rounded-md border border-clinic-line bg-white p-4 text-sm leading-6 text-clinic-muted shadow-soft">
        <strong className="font-semibold text-clinic-ink">Required safety copy. </strong>
        {brief.safetyDisclaimer}
      </div>

      <div className="flex flex-wrap gap-3">
        <DemoCta href="/cases/sample-preop/rehearsal">Practice appointment answers</DemoCta>
        <DemoCta href="/cases/sample-preop/timeline" secondary>
          Back to timeline
        </DemoCta>
      </div>
    </AppShell>
  );
}
