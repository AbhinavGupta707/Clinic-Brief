import { BarChart3, CheckCircle2, ShieldCheck } from "lucide-react";
import { allowedEventPropertyPolicy, novusEventCoverage, sanitizedEventExample } from "@clinicbrief/events";
import { AppShell } from "../../components/app-shell";

export default function NovusProofPage() {
  const hasNovusClientKey = Boolean(process.env.NEXT_PUBLIC_NOVUS_CLIENT_KEY || process.env.NEXT_PUBLIC_PENDO_API_KEY);

  return (
    <AppShell eyebrow="Submission proof" title="Novus-safe analytics proof">
      <div className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,22rem)]">
        <section className="grid min-w-0 gap-4 rounded-[1.25rem] border border-[#EFE2D2] bg-[#FFFDF8] p-5 shadow-[0_10px_28px_rgba(61,47,38,0.08)]">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#F6DFD2] text-[#C8553D]">
              <BarChart3 size={22} aria-hidden />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-[#3D2F26]">Event coverage for the demo funnel</h2>
              <p className="mt-2 text-sm font-medium leading-6 text-[#8A7A6E]">
                ClinicBrief tracks product state transitions and counts only. These examples are safe to send to Novus/Pendo because
                they contain no raw health text, medication names, symptom names, source quotes, document names, or identifiers.
              </p>
            </div>
          </div>

          <div className="overflow-auto">
            <table className="w-full min-w-[42rem] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-[#EFE2D2] text-[#3D2F26]">
                  <th className="py-3 pr-4 font-semibold">Event</th>
                  <th className="py-3 pr-4 font-semibold">Purpose</th>
                  <th className="py-3 pr-4 font-semibold">Safe props</th>
                </tr>
              </thead>
              <tbody>
                {novusEventCoverage.map((item) => (
                  <tr key={item.event} className="border-b border-[#EFE2D2] align-top">
                    <td className="py-3 pr-4 font-mono text-xs text-[#3D2F26]">{item.event}</td>
                    <td className="py-3 pr-4 font-medium text-[#8A7A6E]">{item.purpose}</td>
                    <td className="py-3 pr-4">
                      <code className="rounded-xl bg-[#F8F1E7] px-2 py-1 text-xs text-[#3D2F26]">
                        {JSON.stringify(item.safeProps)}
                      </code>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <aside className="grid min-w-0 content-start gap-4">
          <section className="rounded-[1.25rem] border border-[#EFE2D2] bg-[#FFFDF8] p-5 shadow-[0_10px_28px_rgba(61,47,38,0.08)]">
            <h2 className="flex items-center gap-2 font-semibold text-[#3D2F26]">
              <ShieldCheck size={18} aria-hidden />
              Allowlist
            </h2>
            <ul className="mt-3 grid gap-2 text-sm leading-6 text-[#8A7A6E]">
              {allowedEventPropertyPolicy.explicitKeys.map((key) => (
                <li key={key} className="rounded-xl border border-[#EFE2D2] bg-[#F8F1E7] p-2 font-mono text-xs text-[#3D2F26]">
                  {key}
                </li>
              ))}
              <li className="rounded-xl border border-[#EFE2D2] bg-[#F8F1E7] p-2 font-mono text-xs text-[#3D2F26]">
                *{allowedEventPropertyPolicy.countSuffix}
              </li>
            </ul>
          </section>

          <section className="rounded-[1.25rem] border border-[#EFE2D2] bg-[#FFFDF8] p-5 shadow-[0_10px_28px_rgba(61,47,38,0.08)]">
            <h2 className="flex items-center gap-2 font-semibold text-[#3D2F26]">
              <CheckCircle2 size={18} aria-hidden />
              Sanitizer example
            </h2>
            <p className="mt-2 text-sm font-medium leading-6 text-[#8A7A6E]">Unsafe keys are dropped before the browser posts the event.</p>
            <pre className="mt-3 max-w-full overflow-auto whitespace-pre-wrap break-words rounded-2xl bg-[#F8F1E7] p-3 text-xs leading-5 text-[#3D2F26]">
              {JSON.stringify(sanitizedEventExample, null, 2)}
            </pre>
          </section>

          <section className="rounded-[1.25rem] border border-[#F0C8BE] bg-[#FFF0EA] p-5">
            <h2 className="font-semibold text-[#B84B36]">Novus install status</h2>
            <p className="mt-2 text-sm font-medium leading-6 text-[#5C4A3E]">
              {hasNovusClientKey
                ? "A public Novus/Pendo client key is present. The root layout loads the Pendo agent with an anonymous visitor id and forwards sanitized custom events only."
                : "No real Novus/Pendo public client key is present in this build. Connect GitHub in Novus, merge the generated install PR or set the dashboard-provided public key in Vercel, then rerun the demo."}
            </p>
          </section>

          <section className="rounded-[1.25rem] border border-[#EFE2D2] bg-[#FFFDF8] p-5 shadow-[0_10px_28px_rgba(61,47,38,0.08)]">
            <h2 className="font-semibold text-[#3D2F26]">Required dashboard settings</h2>
            <ul className="mt-3 grid gap-2 text-sm font-medium leading-6 text-[#8A7A6E]">
              <li>GitHub install: use the official Novus dashboard flow and merge the generated install PR if Novus creates one.</li>
              <li>Session Replay: maximum privacy, with all inputs and text masked.</li>
              <li>Custom events: route and funnel counts only, using the sanitizer shown here.</li>
              <li>AI Agent Tracking: rehearsal events use masked lifecycle tokens only, never prompts, responses, messages, or case ids.</li>
            </ul>
          </section>

          <section className="rounded-[1.25rem] border border-[#EFE2D2] bg-[#FFFDF8] p-5 shadow-[0_10px_28px_rgba(61,47,38,0.08)]">
            <h2 className="font-semibold text-[#3D2F26]">Screenshot placeholder</h2>
            <p className="mt-2 text-sm font-medium leading-6 text-[#8A7A6E]">
              Capture the Novus dashboard after visiting the demo flow on the deployed URL. The screenshot should show this app receiving
              events, not sensitive health text.
            </p>
          </section>
        </aside>
      </div>
    </AppShell>
  );
}
