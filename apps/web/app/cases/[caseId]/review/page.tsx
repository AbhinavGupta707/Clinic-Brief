import { preopCase } from "@clinicbrief/fixtures";
import { AppShell } from "../../../../components/app-shell";
import { DemoCta, DemoFlowNav, MissingQuestionList, ReviewFactCard, SectionHeader } from "../../../../components/demo/demo-case-components";

export default async function ReviewPage({ params }: { params: Promise<{ caseId: string }> }) {
  const { caseId } = await params;
  const confirmedCount = preopCase.expectedFacts.filter((fact) => fact.userStatus === "CONFIRMED" || fact.userStatus === "EDITED").length;

  return (
    <AppShell eyebrow={`Case ${caseId}`} title="Review extracted facts">
      <DemoFlowNav current="Review" />

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-md border border-clinic-line bg-white p-4 shadow-soft">
          <p className="text-sm font-semibold text-clinic-primary">Extracted facts</p>
          <p className="mt-2 text-3xl font-semibold text-clinic-ink">{preopCase.expectedFacts.length}</p>
        </div>
        <div className="rounded-md border border-clinic-line bg-white p-4 shadow-soft">
          <p className="text-sm font-semibold text-clinic-primary">Reviewed in demo</p>
          <p className="mt-2 text-3xl font-semibold text-clinic-ink">{confirmedCount}</p>
        </div>
        <div className="rounded-md border border-clinic-line bg-white p-4 shadow-soft">
          <p className="text-sm font-semibold text-clinic-primary">Source documents</p>
          <p className="mt-2 text-3xl font-semibold text-clinic-ink">{preopCase.documents.length}</p>
        </div>
      </div>

      <SectionHeader
        eyebrow="Patient control"
        title="Editable-looking fact cards with confidence and source provenance"
        body="Every fixture fact keeps a visible source, confidence score, and review action. The fields are intentionally UI-only in this demo branch."
      />

      <div className="grid gap-4 lg:grid-cols-2">
        {preopCase.expectedFacts.map((fact) => (
          <ReviewFactCard key={fact.id} fact={fact} />
        ))}
      </div>

      <div className="grid gap-4 rounded-md border border-clinic-line bg-white p-5 shadow-soft">
        <SectionHeader
          eyebrow="Still missing"
          title="Questions ClinicBrief would ask before the brief"
          body="The demo keeps the questions visible so judges can see how the app separates known facts from items to confirm."
        />
        <MissingQuestionList compact />
      </div>

      <div className="flex flex-wrap gap-3">
        <DemoCta href="/cases/sample-preop/timeline">Build timeline</DemoCta>
        <DemoCta href="/demo/preop" secondary>
          Back to documents
        </DemoCta>
      </div>
    </AppShell>
  );
}
