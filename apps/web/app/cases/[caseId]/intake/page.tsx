import { AppShell } from "../../../../components/app-shell";
import { IntakeClient } from "./_components/intake-client";

export default async function IntakePage({ params }: { params: Promise<{ caseId: string }> }) {
  const { caseId } = await params;

  return (
    <AppShell eyebrow={`Case ${caseId}`} title="Add documents and notes">
      <IntakeClient caseId={caseId} />
    </AppShell>
  );
}
