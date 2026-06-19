import { AppShell } from "../../../../components/app-shell";
import { DemoCta, DemoFlowNav, RehearsalPanel, SectionHeader } from "../../../../components/demo/demo-case-components";

export default async function RehearsalPage({ params }: { params: Promise<{ caseId: string }> }) {
  const { caseId } = await params;

  return (
    <AppShell eyebrow={`Case ${caseId}`} title="Appointment rehearsal">
      <DemoFlowNav current="Rehearsal" />

      <SectionHeader
        eyebrow="Practice without advice"
        title="A pre-op rehearsal that asks one safe question at a time"
        body="The fixture rehearsal uses missing-context questions only. It helps the user phrase their own history and redirects away from diagnosis or medication advice."
      />

      <RehearsalPanel />

      <div className="rounded-md border border-clinic-line bg-white p-4 text-sm leading-6 text-clinic-muted shadow-soft">
        <strong className="font-semibold text-clinic-ink">Safety behavior. </strong>
        If the user asks what condition they have, whether to take or stop medication, or whether something is urgent, ClinicBrief redirects to clinician questions and urgent services where appropriate.
      </div>

      <div className="flex flex-wrap gap-3">
        <DemoCta href="/cases/sample-preop/export">Export brief</DemoCta>
        <DemoCta href="/cases/sample-preop/brief" secondary>
          Back to brief
        </DemoCta>
      </div>
    </AppShell>
  );
}
