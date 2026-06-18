import { AppShell } from "../../../components/app-shell";

export default function NewCasePage() {
  return (
    <AppShell eyebrow="Consent required" title="Create a case">
      <form className="grid max-w-2xl gap-5 rounded-md border border-clinic-line bg-white p-5">
        <label className="grid gap-2 text-sm font-medium text-clinic-ink">
          Case title
          <input className="min-h-11 rounded-md border border-clinic-line px-3 text-base" name="title" placeholder="Upcoming pre-op appointment" />
        </label>
        <label className="flex gap-3 rounded-md border border-cyan-100 p-4 text-sm leading-6 text-clinic-muted">
          <input className="mt-1 h-5 w-5" type="checkbox" name="consent" required />
          <span>
            I understand this app processes health information I provide. It organizes information for appointment preparation only and does not provide medical advice.
          </span>
        </label>
        <button className="min-h-11 rounded-md bg-clinic-success px-5 py-3 font-semibold text-white" type="submit">
          Continue to intake
        </button>
      </form>
    </AppShell>
  );
}
