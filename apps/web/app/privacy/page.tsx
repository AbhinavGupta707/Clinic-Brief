import { AppShell } from "../../components/app-shell";

export default function PrivacyPage() {
  return (
    <AppShell eyebrow="Privacy and safety" title="You control what goes into ClinicBrief">
      <div className="grid gap-4 md:grid-cols-2">
        {[
          ["Consent first", "ClinicBrief must collect explicit consent before uploads or health note processing."],
          ["Minimal analytics", "Novus events track funnel counts and states, not raw health content."],
          ["Delete anytime", "The MVP includes a delete-all-data flow for case records and private files."],
          ["No medical advice", "The product organizes information for appointments and refuses diagnosis or treatment requests."]
        ].map(([title, body]) => (
          <article key={title} className="rounded-md border border-clinic-line bg-white p-5">
            <h2 className="font-semibold text-clinic-ink">{title}</h2>
            <p className="mt-2 text-sm leading-6 text-clinic-muted">{body}</p>
          </article>
        ))}
      </div>
    </AppShell>
  );
}
