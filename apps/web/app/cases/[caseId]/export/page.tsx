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
          <section className="rounded-md border border-clinic-line bg-white p-5 shadow-soft">
            <h2 className="flex items-center gap-2 font-semibold text-clinic-ink">
              <FileDown size={18} aria-hidden />
              PDF export
            </h2>
            <p className="mt-2 text-sm leading-6 text-clinic-muted">
              Download the server-generated PDF, or use {bundle.pdfFallback.label.toLowerCase()} if rendering is unavailable.
            </p>
          </section>

          <section className="rounded-md border border-clinic-line bg-white p-5 shadow-soft">
            <h2 className="flex items-center gap-2 font-semibold text-clinic-ink">
              <FileText size={18} aria-hidden />
              Markdown fallback
            </h2>
            <p className="mt-2 text-sm leading-6 text-clinic-muted">
              The Markdown output is complete and readable if PDF rendering is unavailable during the demo.
            </p>
          </section>

          <section className="rounded-md border border-clinic-line bg-white p-5 shadow-soft">
            <h2 className="flex items-center gap-2 font-semibold text-clinic-ink">
              <ShieldCheck size={18} aria-hidden />
              Share safely
            </h2>
            <p className="mt-2 text-sm leading-6 text-clinic-muted">{brief.safetyDisclaimer}</p>
          </section>

          <ExportActions caseId={caseId} briefType={selectedType} bundle={bundle} mode={record.mode} sourceCount={brief.sourceCoverage.length} />

          <Link
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-clinic-line bg-white px-5 py-3 font-semibold text-clinic-ink transition hover:bg-cyan-50"
            href={`/cases/${caseId}/brief?type=${selectedType}`}
          >
            <ArrowLeft size={18} aria-hidden />
            Back to brief
          </Link>
        </aside>

        <article className="clinic-print-page grid gap-5 rounded-md border border-clinic-line bg-white p-5 shadow-soft">
          <header className="grid gap-3 border-b border-clinic-line pb-5">
            <p className="text-sm font-semibold uppercase tracking-[0.08em] text-clinic-primary">Printable output</p>
            <h2 className="text-2xl font-semibold text-clinic-ink">{brief.title}</h2>
            <p className="text-sm leading-6 text-clinic-muted">{brief.oneLineReasonForVisit}</p>
          </header>

          <section>
            <h3 className="font-semibold text-clinic-ink">90-second story</h3>
            <p className="mt-2 text-sm leading-6 text-clinic-muted">{brief.ninetySecondStory}</p>
          </section>

          {brief.chronicSections ? (
            <section>
              <h3 className="font-semibold text-clinic-ink">Chronic appointment context</h3>
              <ul className="mt-3 grid gap-2 text-sm leading-6 text-clinic-muted">
                {[
                  ...brief.chronicSections.reportedConfirmedHistory.map((item) => `Reported confirmed history: ${item}`),
                  ...brief.chronicSections.conditionsBeingInvestigated.map((item) => `Being investigated or not yet confirmed: ${item}`),
                  ...brief.chronicSections.baselineSymptomsAndFlares.map((item) => `Baseline, symptom, or flare detail: ${item}`),
                  ...brief.chronicSections.medicationAndTreatmentHistory.map((item) => `Medication or treatment history to review: ${item}`),
                  ...brief.chronicSections.functionalImpact.map((item) => `Functional impact: ${item}`),
                  ...brief.chronicSections.appointmentGoals.map((item) => `Appointment goal or question: ${item}`)
                ].map((item) => (
                  <li key={item} className="rounded-md border border-cyan-100 bg-white p-3">
                    {item}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <section>
            <h3 className="font-semibold text-clinic-ink">Markdown export</h3>
            <pre className="mt-3 overflow-auto rounded-md bg-clinic-surface p-4 text-xs leading-5 text-clinic-ink">{bundle.markdown}</pre>
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
