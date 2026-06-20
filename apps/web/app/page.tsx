import Link from "next/link";
import { ArrowRight, FileText, ShieldCheck, Stethoscope } from "lucide-react";
import { preopCase } from "@clinicbrief/fixtures";
import { SafetyDisclaimer } from "../components/safety-disclaimer";

export default function HomePage() {
  return (
    <main id="main-content" className="min-h-screen bg-clinic-surface">
      <section className="mx-auto grid w-[min(100%-2rem,72rem)] gap-10 py-[var(--section-y)]">
        <nav aria-label="Primary" className="flex items-center justify-between">
          <span className="text-lg font-semibold text-clinic-ink">ClinicBrief</span>
          <Link className="rounded-md px-3 py-2 text-sm font-medium text-clinic-ink hover:bg-white" href="/privacy">
            Privacy
          </Link>
        </nav>

        <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div className="grid gap-6">
            <p className="text-sm font-semibold uppercase tracking-[0.08em] text-clinic-primary">
              Patient-controlled appointment prep
            </p>
            <h1 className="max-w-4xl text-4xl font-semibold tracking-normal text-clinic-ink md:text-6xl">
              Tell your health story once. Bring the right version to every appointment.
            </h1>
            <p className="max-w-2xl text-lg leading-8 text-clinic-muted">
              ClinicBrief turns scattered notes, documents, medication lists, and appointment context into a clear brief you can review before sharing.
            </p>
            <SafetyDisclaimer />
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-clinic-success px-5 py-3 font-semibold text-white transition hover:bg-emerald-700"
                href="/demo/preop"
              >
                Try sample pre-op case <ArrowRight size={18} aria-hidden />
              </Link>
              <Link
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-clinic-primary bg-white px-5 py-3 font-semibold text-clinic-primary transition hover:bg-cyan-50"
                href="/cases/new?demo=guided"
              >
                Try guided demo
              </Link>
              <Link
                className="inline-flex min-h-11 items-center justify-center rounded-md border border-clinic-line bg-white px-5 py-3 font-semibold text-clinic-ink transition hover:bg-cyan-50"
                href="/cases/new"
              >
                Create my brief
              </Link>
            </div>
          </div>

          <div className="grid gap-4 rounded-md border border-clinic-line bg-white p-5 shadow-soft">
            <div className="flex items-center justify-between gap-3 border-b border-cyan-100 pb-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.08em] text-clinic-primary">Synthetic pre-op demo</p>
                <h2 className="mt-1 text-xl font-semibold text-clinic-ink">Documents to appointment brief</h2>
              </div>
              <ShieldCheck className="shrink-0 text-clinic-success" size={24} aria-hidden />
            </div>

            <div className="grid gap-3">
              {preopCase.documents.slice(0, 3).map((document) => (
                <div key={document.id} className="grid grid-cols-[44px_1fr] gap-3 rounded-md border border-cyan-100 p-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-md bg-clinic-surface text-clinic-primary">
                    <FileText size={21} aria-hidden />
                  </div>
                  <div className="min-w-0">
                    <h3 className="truncate text-sm font-semibold text-clinic-ink">{document.fileName.replace("synthetic-", "")}</h3>
                    <p className="mt-1 line-clamp-2 text-sm leading-6 text-clinic-muted">{document.rawText}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="grid gap-3 rounded-md border border-cyan-100 bg-clinic-surface p-4">
              <div className="flex items-center gap-3">
                <Stethoscope className="text-clinic-primary" size={21} aria-hidden />
                <h3 className="font-semibold text-clinic-ink">{preopCase.expectedBrief.title}</h3>
              </div>
              <p className="text-sm leading-6 text-clinic-muted">{preopCase.expectedBrief.oneLineReasonForVisit}</p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
