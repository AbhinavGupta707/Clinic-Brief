import Link from "next/link";
import { BarChart3, Database, FileWarning, ShieldCheck, Trash2 } from "lucide-react";
import { AppShell } from "../../components/app-shell";

const privacyPrinciples = [
  {
    icon: ShieldCheck,
    title: "Consent before processing",
    body: "ClinicBrief asks for explicit consent before a user uploads or enters health information. The sample path uses synthetic data by default."
  },
  {
    icon: FileWarning,
    title: "Appointment prep only",
    body: "The product organizes user-provided facts and questions. It does not diagnose, recommend treatment, advise medication changes, or triage urgency."
  },
  {
    icon: Database,
    title: "No model-training claim",
    body: "Prototype copy states that user-provided health information is used to prepare the case brief, not to train ClinicBrief models."
  },
  {
    icon: Trash2,
    title: "Delete anytime",
    body: "The settings page exposes delete-all-data behavior that removes files where possible and marks remaining case records as deleted."
  },
  {
    icon: BarChart3,
    title: "Analytics minimization",
    body: "Novus/Pendo events use mode, counts, confidence bands, and brief type only. Raw health text, source quotes, file names, symptoms, and medication names are filtered."
  }
];

export default function PrivacyPage() {
  return (
    <AppShell eyebrow="Privacy and safety" title="You control what goes into ClinicBrief">
      <div className="grid gap-5 lg:grid-cols-[1fr_22rem]">
        <section className="grid gap-4">
          {privacyPrinciples.map((item) => (
            <article key={item.title} className="grid gap-3 rounded-md border border-clinic-line bg-white p-5 shadow-soft md:grid-cols-[44px_1fr]">
              <div className="flex h-11 w-11 items-center justify-center rounded-md bg-clinic-surface text-clinic-primary">
                <item.icon size={22} aria-hidden />
              </div>
              <div>
                <h2 className="font-semibold text-clinic-ink">{item.title}</h2>
                <p className="mt-2 text-sm leading-6 text-clinic-muted">{item.body}</p>
              </div>
            </article>
          ))}
        </section>

        <aside className="grid content-start gap-4">
          <section className="rounded-md border border-clinic-line bg-white p-5 shadow-soft">
            <h2 className="font-semibold text-clinic-ink">Prototype guidance</h2>
            <p className="mt-2 text-sm leading-6 text-clinic-muted">
              This is a hackathon prototype. Judges should use the synthetic pre-op case first and should not upload real patient data
              they are not comfortable testing.
            </p>
          </section>
          <section className="rounded-md border border-clinic-line bg-white p-5 shadow-soft">
            <h2 className="font-semibold text-clinic-ink">Submission proof</h2>
            <p className="mt-2 text-sm leading-6 text-clinic-muted">
              The Novus proof page shows the event coverage and a sanitized before/after example without exposing medical content.
            </p>
            <Link
              className="mt-4 inline-flex min-h-11 items-center justify-center rounded-md bg-clinic-success px-5 py-3 font-semibold text-white transition hover:bg-emerald-700"
              href="/novus-proof"
            >
              View Novus proof
            </Link>
          </section>
        </aside>
      </div>
    </AppShell>
  );
}
