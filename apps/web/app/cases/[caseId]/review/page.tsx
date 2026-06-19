import { preopCase } from "@clinicbrief/fixtures";
import { AppShell } from "../../../../components/app-shell";
import { DemoFlowNav, SectionHeader } from "../../../../components/demo/demo-case-components";
import { ReviewClient } from "./_components/review-client";

export default async function ReviewPage({ params }: { params: Promise<{ caseId: string }> }) {
  const { caseId } = await params;
  const isDemoCase = caseId === preopCase.id;

  return (
    <AppShell eyebrow={`Case ${caseId}`} title="Review extracted facts">
      {isDemoCase ? <DemoFlowNav current="Review" /> : null}

      {isDemoCase ? (
        <div className="grid gap-4 md:grid-cols-3">
          <MetricCard label="Extracted facts" value={preopCase.expectedFacts.length} />
          <MetricCard label="Missing questions" value={preopCase.expectedQuestions.length} />
          <MetricCard label="Source documents" value={preopCase.documents.length} />
        </div>
      ) : null}

      <SectionHeader
        eyebrow={isDemoCase ? "Patient control" : "Fact review"}
        title="Confirm, edit, or reject facts before they appear in a brief"
        body="ClinicBrief keeps confidence, source provenance, and review state visible so the user controls what is shared."
      />

      <ReviewClient caseId={caseId} />
    </AppShell>
  );
}

function MetricCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-clinic-line bg-white p-4 shadow-soft">
      <p className="text-sm font-semibold text-clinic-primary">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-clinic-ink">{value}</p>
    </div>
  );
}
