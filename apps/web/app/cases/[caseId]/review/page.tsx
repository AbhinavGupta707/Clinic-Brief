import { AppShell } from "../../../../components/app-shell";
import { ReviewClient } from "./_components/review-client";

export default async function ReviewPage({ params }: { params: Promise<{ caseId: string }> }) {
  const { caseId } = await params;

  return (
    <AppShell eyebrow={`Case ${caseId}`} title="Review extracted facts">
      <ReviewClient caseId={caseId} />
    </AppShell>
  );
}
