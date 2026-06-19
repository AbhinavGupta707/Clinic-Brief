import { BarChart3, Database, ShieldCheck, Trash2 } from "lucide-react";
import { AppShell } from "../../../../components/app-shell";
import { DeleteCasePanel } from "./delete-case-panel";

export default async function SettingsPage({ params }: { params: Promise<{ caseId: string }> }) {
  const { caseId } = await params;

  return (
    <AppShell eyebrow={`Case ${caseId}`} title="Privacy controls">
      <div className="grid gap-5 lg:grid-cols-[1fr_22rem]">
        <section className="grid gap-4 rounded-md border border-clinic-line bg-white p-5 shadow-soft">
          <h2 className="text-xl font-semibold text-clinic-ink">Case data controls</h2>
          <p className="max-w-3xl text-sm leading-6 text-clinic-muted">
            ClinicBrief is designed around explicit consent, minimal retention, and user-controlled deletion. This prototype uses the
            same boundary the production Supabase implementation would use: delete files where possible, then consistently mark any
            remaining case records as deleted.
          </p>

          <div className="grid gap-3 md:grid-cols-3">
            {[
              {
                icon: ShieldCheck,
                title: "Consent",
                body: "Health notes are processed only after the consent step."
              },
              {
                icon: Database,
                title: "Retention",
                body: "Synthetic data is used by default. Real data should be deleted after testing."
              },
              {
                icon: BarChart3,
                title: "Analytics",
                body: "Novus receives counts and types only, never raw health content."
              }
            ].map((item) => (
              <article key={item.title} className="rounded-md border border-cyan-100 bg-clinic-surface p-4">
                <item.icon className="text-clinic-primary" size={22} aria-hidden />
                <h3 className="mt-3 font-semibold text-clinic-ink">{item.title}</h3>
                <p className="mt-2 text-sm leading-6 text-clinic-muted">{item.body}</p>
              </article>
            ))}
          </div>
        </section>

        <aside className="grid content-start gap-4">
          <section className="rounded-md border border-red-200 bg-white p-5 shadow-soft">
            <h2 className="flex items-center gap-2 font-semibold text-red-800">
              <Trash2 size={18} aria-hidden />
              Delete all case data
            </h2>
            <p className="mt-2 text-sm leading-6 text-clinic-muted">
              The demo endpoint returns a deletion receipt so judges can see the intended production behavior.
            </p>
            <DeleteCasePanel caseId={caseId} />
          </section>
        </aside>
      </div>
    </AppShell>
  );
}
