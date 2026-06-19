import { AppShell } from "../../../../components/app-shell";
import { IntakeClient } from "./_components/intake-client";

export default async function IntakePage({ params }: { params: Promise<{ caseId: string }> }) {
  const { caseId } = await params;

  return (
    <AppShell eyebrow={`Case ${caseId}`} title="Guided intake">
      <IntakeClient caseId={caseId} />
    </AppShell>
  );
}
