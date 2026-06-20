import { AppShell } from "../../../components/app-shell";
import { NewCaseForm } from "./_components/new-case-form";

export default async function NewCasePage({ searchParams }: { searchParams: Promise<{ demo?: string }> }) {
  const params = await searchParams;

  return (
    <AppShell eyebrow="Guided appointment prep" title="Create your appointment pack">
      <NewCaseForm guidedDemo={params.demo === "guided"} />
    </AppShell>
  );
}
