import Link from "next/link";
import { ArrowRight, FileText, ShieldCheck, Stethoscope } from "lucide-react";
import { preopCase } from "@clinicbrief/fixtures";
import { SafetyDisclaimer } from "../components/safety-disclaimer";

export default function HomePage() {
  return (
    <main id="main-content" className="min-h-screen overflow-x-hidden bg-[#F8F1E7] text-[#3D2F26]">
      <section className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-[var(--section-y)]">
        <nav aria-label="Primary" className="flex items-center justify-between">
          <span className="text-lg font-extrabold text-[#3D2F26]">ClinicBrief</span>
          <Link className="rounded-full px-3 py-2 text-sm font-bold text-[#5C4A3E] hover:bg-[#FFFDF8]" href="/privacy">
            Privacy
          </Link>
        </nav>

        <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div className="grid gap-6">
            <p className="text-sm font-extrabold uppercase tracking-[0.12em] text-[#C8553D]">
              Patient-controlled appointment prep
            </p>
            <h1 className="max-w-4xl text-4xl font-semibold tracking-normal text-[#3D2F26] md:text-6xl">
              Tell your health story once. Bring the right version to every appointment.
            </h1>
            <p className="max-w-2xl text-lg font-medium leading-8 text-[#8A7A6E]">
              ClinicBrief turns scattered notes, documents, medication lists, and appointment context into a clear brief you can review before sharing.
            </p>
            <SafetyDisclaimer />
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#C8553D] px-6 py-3 font-extrabold text-white shadow-[0_10px_22px_rgba(200,85,61,0.28)] transition hover:bg-[#B84B36]"
                href="/cases/new?demo=guided"
              >
                Try now <ArrowRight size={18} aria-hidden />
              </Link>
              <Link
                className="inline-flex min-h-12 items-center justify-center rounded-full border border-[#E4D8C8] bg-[#FFFDF8] px-6 py-3 font-extrabold text-[#5C4A3E] transition hover:bg-[#F2ECE0]"
                href="/cases/new"
              >
                Create my brief
              </Link>
            </div>
          </div>

          <div className="grid gap-4 rounded-[1.4rem] border border-[#EFE2D2] bg-[#FFFDF8] p-5 shadow-[0_18px_44px_rgba(61,47,38,0.10)]">
            <div className="flex items-center justify-between gap-3 border-b border-[#EFE2D2] pb-4">
              <div>
                <p className="text-sm font-extrabold uppercase tracking-[0.08em] text-[#C8553D]">Synthetic pre-op demo</p>
                <h2 className="mt-1 text-xl font-semibold text-[#3D2F26]">Documents to appointment brief</h2>
              </div>
              <ShieldCheck className="shrink-0 text-[#9CAD86]" size={24} aria-hidden />
            </div>

            <div className="grid gap-3">
              {preopCase.documents.slice(0, 3).map((document) => (
                <div key={document.id} className="grid grid-cols-[44px_1fr] gap-3 rounded-2xl border border-[#EFE2D2] bg-[#FFFDF8] p-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#F6DFD2] text-[#C8553D]">
                    <FileText size={21} aria-hidden />
                  </div>
                  <div className="min-w-0">
                    <h3 className="truncate text-sm font-extrabold text-[#3D2F26]">{document.fileName.replace("synthetic-", "")}</h3>
                    <p className="mt-1 line-clamp-2 text-sm font-medium leading-6 text-[#8A7A6E]">{document.rawText}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="grid gap-3 rounded-2xl border border-[#D9E5CF] bg-[#EEF3E8] p-4">
              <div className="flex items-center gap-3">
                <Stethoscope className="text-[#758A5F]" size={21} aria-hidden />
                <h3 className="font-semibold text-[#3D2F26]">{preopCase.expectedBrief.title}</h3>
              </div>
              <p className="text-sm font-medium leading-6 text-[#5C4A3E]">{preopCase.expectedBrief.oneLineReasonForVisit}</p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
