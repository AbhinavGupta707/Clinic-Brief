import { AppShell } from "../../../components/app-shell";
import { NewCaseForm } from "./_components/new-case-form";

export default function NewCasePage() {
  return (
    <AppShell eyebrow="Consent required" title="Create a case">
      <NewCaseForm />
    </AppShell>
  );
}
