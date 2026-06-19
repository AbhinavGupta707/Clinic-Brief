import { BarChart3, CheckCircle2, ShieldCheck } from "lucide-react";
import { allowedEventPropertyPolicy, novusEventCoverage, sanitizedEventExample } from "@clinicbrief/events";
import { AppShell } from "../../components/app-shell";

export default function NovusProofPage() {
  const hasNovusClientPlaceholder = Boolean(process.env.NEXT_PUBLIC_NOVUS_CLIENT_KEY || process.env.NEXT_PUBLIC_PENDO_API_KEY);

  return (
    <AppShell eyebrow="Submission proof" title="Novus-safe analytics proof">
      <div className="grid gap-5 lg:grid-cols-[1fr_22rem]">
        <section className="grid gap-4 rounded-md border border-clinic-line bg-white p-5 shadow-soft">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-clinic-surface text-clinic-primary">
              <BarChart3 size={22} aria-hidden />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-clinic-ink">Event coverage for the demo funnel</h2>
              <p className="mt-2 text-sm leading-6 text-clinic-muted">
                ClinicBrief tracks product state transitions and counts only. These examples are safe to send to Novus/Pendo because
                they contain no raw health text, medication names, symptom names, source quotes, document names, or identifiers.
              </p>
            </div>
          </div>

          <div className="overflow-auto">
            <table className="w-full min-w-[42rem] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-clinic-line text-clinic-ink">
                  <th className="py-3 pr-4 font-semibold">Event</th>
                  <th className="py-3 pr-4 font-semibold">Purpose</th>
                  <th className="py-3 pr-4 font-semibold">Safe props</th>
                </tr>
              </thead>
              <tbody>
                {novusEventCoverage.map((item) => (
                  <tr key={item.event} className="border-b border-cyan-100 align-top">
                    <td className="py-3 pr-4 font-mono text-xs text-clinic-ink">{item.event}</td>
                    <td className="py-3 pr-4 text-clinic-muted">{item.purpose}</td>
                    <td className="py-3 pr-4">
                      <code className="rounded-md bg-clinic-surface px-2 py-1 text-xs text-clinic-ink">
                        {JSON.stringify(item.safeProps)}
                      </code>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <aside className="grid content-start gap-4">
          <section className="rounded-md border border-clinic-line bg-white p-5 shadow-soft">
            <h2 className="flex items-center gap-2 font-semibold text-clinic-ink">
              <ShieldCheck size={18} aria-hidden />
              Allowlist
            </h2>
            <ul className="mt-3 grid gap-2 text-sm leading-6 text-clinic-muted">
              {allowedEventPropertyPolicy.explicitKeys.map((key) => (
                <li key={key} className="rounded-md border border-cyan-100 bg-clinic-surface p-2 font-mono text-xs text-clinic-ink">
                  {key}
                </li>
              ))}
              <li className="rounded-md border border-cyan-100 bg-clinic-surface p-2 font-mono text-xs text-clinic-ink">
                *{allowedEventPropertyPolicy.countSuffix}
              </li>
            </ul>
          </section>

          <section className="rounded-md border border-clinic-line bg-white p-5 shadow-soft">
            <h2 className="flex items-center gap-2 font-semibold text-clinic-ink">
              <CheckCircle2 size={18} aria-hidden />
              Sanitizer example
            </h2>
            <p className="mt-2 text-sm leading-6 text-clinic-muted">Unsafe keys are dropped before the browser posts the event.</p>
            <pre className="mt-3 overflow-auto rounded-md bg-clinic-surface p-3 text-xs leading-5 text-clinic-ink">
              {JSON.stringify(sanitizedEventExample, null, 2)}
            </pre>
          </section>

          <section className="rounded-md border border-amber-200 bg-amber-50 p-5">
            <h2 className="font-semibold text-amber-900">Novus install status</h2>
            <p className="mt-2 text-sm leading-6 text-amber-900">
              {hasNovusClientPlaceholder
                ? "A public Novus/Pendo key placeholder is present. Confirm the dashboard-generated snippet is installed before taking the screenshot."
                : "No real Novus/Pendo snippet or public key is present in this local build. Install it from the Novus dashboard before taking the screenshot."}
            </p>
          </section>

          <section className="rounded-md border border-clinic-line bg-white p-5 shadow-soft">
            <h2 className="font-semibold text-clinic-ink">Required dashboard settings</h2>
            <ul className="mt-3 grid gap-2 text-sm leading-6 text-clinic-muted">
              <li>Session Replay: maximum privacy, with all inputs and text masked.</li>
              <li>Custom events: route and funnel counts only, using the sanitizer shown here.</li>
              <li>AI Agent Tracking: leave disabled for rehearsal unless prompts and responses are masked before capture.</li>
            </ul>
          </section>

          <section className="rounded-md border border-clinic-line bg-white p-5 shadow-soft">
            <h2 className="font-semibold text-clinic-ink">Screenshot placeholder</h2>
            <p className="mt-2 text-sm leading-6 text-clinic-muted">
              Capture the Novus dashboard after visiting the demo flow on the deployed URL. The screenshot should show this app receiving
              events, not sensitive health text.
            </p>
          </section>
        </aside>
      </div>
    </AppShell>
  );
}
