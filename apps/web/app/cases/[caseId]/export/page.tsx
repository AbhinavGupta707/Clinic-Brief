import { preopCase } from "@clinicbrief/fixtures";
import { AppShell } from "../../../../components/app-shell";
import { DemoCta, DemoFlowNav, ExportFallbackPanel, SectionHeader } from "../../../../components/demo/demo-case-components";

export default async function ExportPage({ params }: { params: Promise<{ caseId: string }> }) {
  const { caseId } = await params;

  return (
    <AppShell eyebrow={`Case ${caseId}`} title="Export and share">
      <DemoFlowNav current="Export" />

      <SectionHeader
        eyebrow="Takeaway"
        title="PDF action with a readable Markdown fallback"
        body="This demo branch leaves actual PDF rendering to another workstream, but judges can still see the final export state and copy-ready fallback."
      />

      <ExportFallbackPanel />

      <div className="rounded-md border border-clinic-line bg-white p-4 text-sm leading-6 text-clinic-muted shadow-soft">
        <strong className="font-semibold text-clinic-ink">Required safety copy. </strong>
        {preopCase.expectedBrief.safetyDisclaimer}
      </div>

      <div className="flex flex-wrap gap-3">
        <DemoCta href="/demo/preop">Restart synthetic demo</DemoCta>
        <DemoCta href="/cases/sample-preop/rehearsal" secondary>
          Back to rehearsal
        </DemoCta>
      </div>
    </AppShell>
  );
}
