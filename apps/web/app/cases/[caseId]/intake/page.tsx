import { AppShell } from "../../../../components/app-shell";
import { StatusCard } from "../../../../components/status-card";

export default async function IntakePage({ params }: { params: Promise<{ caseId: string }> }) {
  const { caseId } = await params;

  return (
    <AppShell eyebrow={`Case ${caseId}`} title="Add documents and notes">
      <div className="grid gap-4 md:grid-cols-2">
        <StatusCard title="Upload">
          <p>PDF/image upload boundary. Add Supabase private storage and parser wiring here.</p>
        </StatusCard>
        <StatusCard title="Paste">
          <p>Manual text fallback is required for scanned PDFs, OCR failures, and fast demos.</p>
        </StatusCard>
      </div>
    </AppShell>
  );
}
