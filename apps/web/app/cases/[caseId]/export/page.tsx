import { AppShell } from "../../../../components/app-shell";
import { StatusCard } from "../../../../components/status-card";

export default async function ExportPage({ params }: { params: Promise<{ caseId: string }> }) {
  const { caseId } = await params;

  return (
    <AppShell eyebrow={`Case ${caseId}`} title="Export and share">
      <StatusCard title="PDF export">
        <p>Render brief and handoff card as PDF, with Markdown fallback if rendering fails.</p>
      </StatusCard>
    </AppShell>
  );
}
