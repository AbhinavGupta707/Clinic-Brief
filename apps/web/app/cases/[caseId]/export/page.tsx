import Link from "next/link";
import { ArrowLeft, FileDown, FileText, ShieldCheck } from "lucide-react";
import { BRIEF_MODE_DEFINITIONS, buildBriefFromReviewedFacts, buildExportBundle, includeReviewedPatternCardsInBrief } from "@clinicbrief/exports";
import type { BriefType } from "@clinicbrief/types";
import { notFound } from "next/navigation";
import { AppShell } from "../../../../components/app-shell";
import { DemoFlowNav, SectionHeader } from "../../../../components/demo/demo-case-components";
import { getClinicRepository } from "../../../../lib/server/clinic-repository";
import { listPatternCards } from "../../../../lib/server/pattern-service";
import { ExportActions } from "./export-actions";

type ExportPageProps = {
  params: Promise<{ caseId: string }>;
  searchParams?: Promise<{ type?: string | string[] }>;
};

export default async function ExportPage({ params, searchParams }: ExportPageProps) {
  const { caseId } = await params;
  const query = searchParams ? await searchParams : {};
  const selectedType = parseBriefType(query.type) ?? "PREOP";
  const repository = await getClinicRepository();
  const record = await repository.getCase(caseId);

  if (!record) {
    notFound();
  }

  const patternCards = listPatternCards(record);
  const savedBrief = record.briefs.find((item) => item.briefType === selectedType);
  const brief = includeReviewedPatternCardsInBrief(
    savedBrief?.briefJson ??
      buildBriefFromReviewedFacts({
      caseTitle: record.title,
      caseMode: record.mode,
      briefType: selectedType,
      facts: record.facts,
      questions: record.questions,
      timeline: record.timeline,
        sourcePreviews: record.sourcePreviews,
        patternCards
      }),
    patternCards
  );
  const bundle = buildExportBundle(brief, selectedType);
  const isDemoCase = caseId === "sample-preop";

  return (
    <AppShell eyebrow={`Case ${caseId}`} title="Export and share">
      {isDemoCase ? <DemoFlowNav current="Export" /> : null}

      <SectionHeader
        eyebrow="Takeaway"
        title="Download a PDF, print from the browser, or keep Markdown"
        body="ClinicBrief now tries server-side PDF generation first. If the renderer is unavailable, the browser print and Markdown outputs stay complete and readable."
      />

      <div className="grid gap-5 lg:grid-cols-[22rem_1fr]">
        <aside className="print:hidden grid content-start gap-4">
          <section className="rounded-[1.25rem] border border-[#EFE2D2] bg-[#FFFDF8] p-5 shadow-[0_10px_28px_rgba(61,47,38,0.08)]">
            <h2 className="flex items-center gap-2 font-semibold text-[#3D2F26]">
              <FileDown size={18} aria-hidden />
              PDF export
            </h2>
            <p className="mt-2 text-sm font-medium leading-6 text-[#8A7A6E]">
              Download the server-generated PDF, or use {bundle.pdfFallback.label.toLowerCase()} if rendering is unavailable.
            </p>
          </section>

          <section className="rounded-[1.25rem] border border-[#EFE2D2] bg-[#FFFDF8] p-5 shadow-[0_10px_28px_rgba(61,47,38,0.08)]">
            <h2 className="flex items-center gap-2 font-semibold text-[#3D2F26]">
              <FileText size={18} aria-hidden />
              Markdown fallback
            </h2>
            <p className="mt-2 text-sm font-medium leading-6 text-[#8A7A6E]">
              The Markdown output is complete and readable if PDF rendering is unavailable during the demo.
            </p>
          </section>

          <section className="rounded-[1.25rem] border border-[#EFE2D2] bg-[#FFFDF8] p-5 shadow-[0_10px_28px_rgba(61,47,38,0.08)]">
            <h2 className="flex items-center gap-2 font-semibold text-[#3D2F26]">
              <ShieldCheck size={18} aria-hidden />
              Share safely
            </h2>
            <p className="mt-2 text-sm font-medium leading-6 text-[#8A7A6E]">{brief.safetyDisclaimer}</p>
          </section>

          <ExportActions caseId={caseId} briefType={selectedType} bundle={bundle} mode={record.mode} sourceCount={brief.sourceCoverage.length} />

          <Link
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-[#E4D8C8] bg-[#FFFDF8] px-5 py-3 font-extrabold text-[#5C4A3E] transition hover:bg-[#F2ECE0]"
            href={`/cases/${caseId}/brief?type=${selectedType}`}
          >
            <ArrowLeft size={18} aria-hidden />
            Back to brief
          </Link>
        </aside>

        <article className="clinic-print-page grid gap-5 rounded-[1.4rem] border border-[#EFE2D2] bg-[#FFFDF8] p-5 shadow-[0_14px_38px_rgba(61,47,38,0.10)]">
          <header className="grid gap-3 border-b border-[#EFE2D2] pb-5">
            <p className="text-sm font-extrabold uppercase tracking-[0.08em] text-[#C8553D]">Printable output</p>
            <h2 className="text-2xl font-semibold text-[#3D2F26]">{brief.title}</h2>
            <p className="text-sm font-medium leading-6 text-[#8A7A6E]">{brief.oneLineReasonForVisit}</p>
          </header>

          <section>
            <h3 className="font-semibold text-[#3D2F26]">90-second story</h3>
            <p className="mt-2 text-sm font-medium leading-6 text-[#8A7A6E]">{brief.ninetySecondStory}</p>
          </section>

          {brief.chronicSections ? (
            <section>
              <h3 className="font-semibold text-[#3D2F26]">Chronic appointment context</h3>
              <ul className="mt-3 grid gap-2 text-sm font-medium leading-6 text-[#8A7A6E]">
                {[
                  ...brief.chronicSections.reportedConfirmedHistory.map((item) => `Reported confirmed history: ${item}`),
                  ...brief.chronicSections.conditionsBeingInvestigated.map((item) => `Being investigated or not yet confirmed: ${item}`),
                  ...brief.chronicSections.baselineSymptomsAndFlares.map((item) => `Baseline, symptom, or flare detail: ${item}`),
                  ...brief.chronicSections.medicationAndTreatmentHistory.map((item) => `Medication or treatment history to review: ${item}`),
                  ...brief.chronicSections.functionalImpact.map((item) => `Functional impact: ${item}`),
                  ...brief.chronicSections.appointmentGoals.map((item) => `Appointment goal or question: ${item}`)
                ].map((item) => (
                  <li key={item} className="rounded-2xl border border-[#EFE2D2] bg-[#FFFDF8] p-3">
                    {item}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <section>
            <h3 className="font-semibold text-[#3D2F26]">Markdown export</h3>
            <pre className="mt-3 overflow-auto rounded-2xl bg-[#F8F1E7] p-4 text-xs leading-5 text-[#3D2F26]">{bundle.markdown}</pre>
          </section>
        </article>
      </div>
    </AppShell>
  );
}

function parseBriefType(value: string | string[] | undefined): BriefType | null {
  const candidate = Array.isArray(value) ? value[0] : value;
  return BRIEF_MODE_DEFINITIONS.some((mode) => mode.type === candidate) ? (candidate as BriefType) : null;
}
