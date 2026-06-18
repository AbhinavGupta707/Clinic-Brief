import { AppShell } from "../../../../components/app-shell";
import { StatusCard } from "../../../../components/status-card";

export default async function RehearsalPage({ params }: { params: Promise<{ caseId: string }> }) {
  const { caseId } = await params;

  return (
    <AppShell eyebrow={`Case ${caseId}`} title="Appointment rehearsal">
      <StatusCard title="Next implementation">
        <p>One-question-at-a-time rehearsal chat with safety refusal, optional speech input, and user-approved fact updates.</p>
      </StatusCard>
    </AppShell>
  );
}
