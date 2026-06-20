import Link from "next/link";
import { ClipboardList, Download, FileText, MessageSquareText } from "lucide-react";
import { BRIEF_MODE_DEFINITIONS, briefToMarkdown, buildBriefFromReviewedFacts, getBriefModeDefinition, includeReviewedPatternCardsInBrief } from "@clinicbrief/exports";
import type { BriefType } from "@clinicbrief/types";
import { notFound } from "next/navigation";
import { AppShell } from "../../../../components/app-shell";
import { Chip, DemoFlowNav, SectionHeader } from "../../../../components/demo/demo-case-components";
import { getClinicRepository } from "../../../../lib/server/clinic-repository";
import { listPatternCards } from "../../../../lib/server/pattern-service";
import { BriefEventTracker } from "./brief-event-tracker";
import { BriefReadbackControls } from "./readback-controls";

type BriefPageProps = {
  params: Promise<{ caseId: string }>;
  searchParams?: Promise<{ type?: string | string[] }>;
};

export default async function BriefPage({ params, searchParams }: BriefPageProps) {
  const { caseId } = await params;
  const query = searchParams ? await searchParams : {};
  const selectedType = parseBriefType(query.type) ?? "PREOP";
  const mode = getBriefModeDefinition(selectedType);
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
  const markdown = briefToMarkdown(brief);
  const isDemoCase = caseId === "sample-preop";

  return (
    <AppShell eyebrow={`Case ${caseId}`} title={brief.title}>
      <BriefEventTracker briefType={selectedType} factCount={record.facts.length} mode={record.mode} sourceCount={brief.sourceCoverage.length} />
      {isDemoCase ? <DemoFlowNav current="Brief" /> : null}

      <SectionHeader
        eyebrow="Clinician-readable draft"
        title="One-page brief, handoff card, and 90-second story"
        body="The brief is printable and patient-reviewed. It labels uncertainties instead of filling gaps with advice."
      />

      <nav aria-label="Brief modes" className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
        {BRIEF_MODE_DEFINITIONS.map((item) => {
          const isSelected = item.type === selectedType;
          return (
            <Link
              key={item.type}
              aria-current={isSelected ? "page" : undefined}
              className={`flex min-h-11 items-center justify-center rounded-full border px-3 py-2 text-center text-sm font-extrabold transition ${
                isSelected ? "border-[#C8553D] bg-[#C8553D] text-white" : "border-[#E4D8C8] bg-[#FFFDF8] text-[#5C4A3E] hover:bg-[#F2ECE0]"
              }`}
              href={`/cases/${caseId}/brief?type=${item.type}`}
            >
              {item.shortLabel}
            </Link>
          );
        })}
      </nav>

      <div className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,22rem)]">
        <article className="clinic-print-page grid min-w-0 gap-5 rounded-[1.4rem] border border-[#EFE2D2] bg-[#FFFDF8] p-5 shadow-[0_14px_38px_rgba(61,47,38,0.10)]">
          <header className="grid gap-3 border-b border-[#EFE2D2] pb-5">
            <div className="flex flex-wrap items-center gap-2 text-sm text-[#8A7A6E]">
              <Chip tone="success">Patient-reviewed draft</Chip>
              <span className="rounded-full bg-[#F8F1E7] px-3 py-1 font-semibold text-[#3D2F26]">{mode.label}</span>
              <span>{mode.audience}</span>
            </div>
            <p className="text-lg font-semibold leading-7 text-[#3D2F26]">{brief.oneLineReasonForVisit}</p>
            <p className="text-sm font-medium leading-6 text-[#8A7A6E]">{mode.purpose}</p>
          </header>

          <OutputBriefSection title="90-second story" icon={MessageSquareText}>
            <p>{brief.ninetySecondStory}</p>
          </OutputBriefSection>

          <BriefReadbackControls briefType={selectedType} mode={record.mode} text={brief.ninetySecondStory} />

          <OutputBriefSection title="Key timeline" icon={ClipboardList}>
            <ul className="grid gap-3">
              {brief.keyTimeline.map((item) => (
                <li key={`${item.dateLabel}-${item.event}`} className="grid gap-1 rounded-2xl border border-[#EFE2D2] bg-[#F8F1E7] p-3">
                  <span className="text-sm font-semibold text-[#3D2F26]">{item.dateLabel}</span>
                  <span>{item.event}</span>
                </li>
              ))}
            </ul>
          </OutputBriefSection>

          <div className="grid gap-5 md:grid-cols-2">
            <OutputBriefSection title="What changed" icon={FileText}>
              <BulletList items={brief.whatChangedSinceLastAppointment} />
            </OutputBriefSection>
            <OutputBriefSection title="Open uncertainties" icon={FileText}>
              <BulletList items={brief.openUncertainties} />
            </OutputBriefSection>
          </div>

          {brief.chronicSections ? (
            <OutputBriefSection title="Chronic appointment context" icon={ClipboardList}>
              <BulletList
                items={[
                  ...brief.chronicSections.reportedConfirmedHistory.map((item) => `Reported confirmed history: ${item}`),
                  ...brief.chronicSections.conditionsBeingInvestigated.map((item) => `Being investigated or not yet confirmed: ${item}`),
                  ...brief.chronicSections.baselineSymptomsAndFlares.map((item) => `Baseline, symptom, or flare detail: ${item}`),
                  ...brief.chronicSections.medicationAndTreatmentHistory.map((item) => `Medication or treatment history to review: ${item}`),
                  ...brief.chronicSections.functionalImpact.map((item) => `Functional impact: ${item}`),
                  ...brief.chronicSections.appointmentGoals.map((item) => `Appointment goal or question: ${item}`)
                ]}
              />
            </OutputBriefSection>
          ) : null}

          <div className="grid gap-5 md:grid-cols-2">
            <OutputBriefSection title="Allergies and important notes" icon={FileText}>
              <BulletList items={brief.allergiesAndImportantNotes} />
            </OutputBriefSection>
            <OutputBriefSection id="questions" title="Questions for clinician" icon={ClipboardList}>
              <BulletList items={brief.questionsForClinician} />
            </OutputBriefSection>
          </div>

          <section className="rounded-2xl border border-[#EFE2D2] bg-[#F8F1E7] p-4">
            <h2 className="text-sm font-extrabold uppercase tracking-[0.08em] text-[#C8553D]">Required safety note</h2>
            <p className="mt-2 text-sm font-medium leading-6 text-[#8A7A6E]">{brief.safetyDisclaimer}</p>
          </section>
        </article>

        <aside className="grid min-w-0 content-start gap-4">
          <section className="min-w-0 rounded-[1.25rem] border border-[#EFE2D2] bg-[#FFFDF8] p-5 shadow-[0_10px_28px_rgba(61,47,38,0.08)]">
            <h2 className="font-semibold text-[#3D2F26]">Handoff card</h2>
            <dl className="mt-4 grid gap-3 text-sm">
              <div>
                <dt className="font-semibold text-[#3D2F26]">Tell the same story</dt>
                <dd className="mt-1 break-words font-medium leading-6 text-[#8A7A6E]">{brief.ninetySecondStory}</dd>
              </div>
              <div>
                <dt className="font-semibold text-[#3D2F26]">Keep consistent</dt>
                <dd className="mt-1 break-words font-medium leading-6 text-[#8A7A6E]">{brief.openUncertainties.slice(0, 3).join(", ")}</dd>
              </div>
              <div>
                <dt className="font-semibold text-[#3D2F26]">Sources checked</dt>
                <dd className="mt-1 break-words font-medium leading-6 text-[#8A7A6E]">
                  {brief.sourceCoverage.map((item) => `${item.section} (${item.sourceCount})`).join(", ")}
                </dd>
              </div>
            </dl>
          </section>

          <section className="min-w-0 rounded-[1.25rem] border border-[#EFE2D2] bg-[#FFFDF8] p-5 shadow-[0_10px_28px_rgba(61,47,38,0.08)]">
            <h2 className="font-semibold text-[#3D2F26]">Markdown fallback</h2>
            <p className="mt-2 text-sm font-medium leading-6 text-[#8A7A6E]">
              The export package can produce this readable Markdown even when PDF rendering is unavailable.
            </p>
            <pre className="mt-4 max-h-64 max-w-full overflow-auto whitespace-pre-wrap break-words rounded-2xl bg-[#F8F1E7] p-4 text-xs leading-5 text-[#3D2F26]">{markdown}</pre>
          </section>

          <div className="grid gap-3">
            <Link
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[#9CAD86] px-5 py-3 font-extrabold text-white transition hover:bg-[#879974]"
              href={`/cases/${caseId}/export?type=${selectedType}`}
            >
              <Download size={18} aria-hidden />
              Export
            </Link>
            <Link
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-[#E4D8C8] bg-[#FFFDF8] px-5 py-3 font-extrabold text-[#5C4A3E] transition hover:bg-[#F2ECE0]"
              href={`/cases/${caseId}/rehearsal?type=${selectedType}`}
            >
              <MessageSquareText size={18} aria-hidden />
              Rehearse
            </Link>
          </div>
        </aside>
      </div>
    </AppShell>
  );
}

function parseBriefType(value: string | string[] | undefined): BriefType | null {
  const candidate = Array.isArray(value) ? value[0] : value;
  return BRIEF_MODE_DEFINITIONS.some((mode) => mode.type === candidate) ? (candidate as BriefType) : null;
}

function OutputBriefSection({
  id,
  title,
  icon: Icon,
  children
}: {
  id?: string;
  title: string;
  icon: typeof FileText;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-6">
      <h2 className="flex items-center gap-2 font-semibold text-[#3D2F26]">
        <Icon size={18} aria-hidden />
        {title}
      </h2>
      <div className="mt-3 text-sm font-medium leading-6 text-[#8A7A6E]">{children}</div>
    </section>
  );
}

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="grid gap-2">
      {items.map((item) => (
        <li key={item} className="rounded-2xl border border-[#EFE2D2] bg-[#FFFDF8] p-3">
          {item}
        </li>
      ))}
    </ul>
  );
}
