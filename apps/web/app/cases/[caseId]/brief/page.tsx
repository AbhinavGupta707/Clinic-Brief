import Link from "next/link";
import { ClipboardList, Download, FileText, MessageSquareText } from "lucide-react";
import { preopCase } from "@clinicbrief/fixtures";
import { BRIEF_MODE_DEFINITIONS, briefToMarkdown, buildBriefVariant, getBriefModeDefinition } from "@clinicbrief/exports";
import type { BriefType } from "@clinicbrief/types";
import { AppShell } from "../../../../components/app-shell";
import { Chip, DemoFlowNav, SectionHeader } from "../../../../components/demo/demo-case-components";

type BriefPageProps = {
  params: Promise<{ caseId: string }>;
  searchParams?: Promise<{ type?: string | string[] }>;
};

export default async function BriefPage({ params, searchParams }: BriefPageProps) {
  const { caseId } = await params;
  const query = searchParams ? await searchParams : {};
  const selectedType = parseBriefType(query.type) ?? "PREOP";
  const mode = getBriefModeDefinition(selectedType);
  const brief = buildBriefVariant(preopCase.expectedBrief, selectedType);
  const markdown = briefToMarkdown(brief);
  const isDemoCase = caseId === preopCase.id;

  return (
    <AppShell eyebrow={`Case ${caseId}`} title={brief.title}>
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
              className={`flex min-h-11 items-center justify-center rounded-md border px-3 py-2 text-center text-sm font-semibold transition ${
                isSelected ? "border-clinic-primary bg-clinic-primary text-white" : "border-clinic-line bg-white text-clinic-ink hover:bg-cyan-50"
              }`}
              href={`/cases/${caseId}/brief?type=${item.type}`}
            >
              {item.shortLabel}
            </Link>
          );
        })}
      </nav>

      <div className="grid gap-5 lg:grid-cols-[1fr_22rem]">
        <article className="clinic-print-page grid gap-5 rounded-md border border-clinic-line bg-white p-5 shadow-soft">
          <header className="grid gap-3 border-b border-clinic-line pb-5">
            <div className="flex flex-wrap items-center gap-2 text-sm text-clinic-muted">
              <Chip tone="success">Patient-reviewed draft</Chip>
              <span className="rounded-md bg-clinic-surface px-3 py-1 font-semibold text-clinic-ink">{mode.label}</span>
              <span>{mode.audience}</span>
            </div>
            <p className="text-lg font-semibold leading-7 text-clinic-ink">{brief.oneLineReasonForVisit}</p>
            <p className="text-sm leading-6 text-clinic-muted">{mode.purpose}</p>
          </header>

          <OutputBriefSection title="90-second story" icon={MessageSquareText}>
            <p>{brief.ninetySecondStory}</p>
          </OutputBriefSection>

          <OutputBriefSection title="Key timeline" icon={ClipboardList}>
            <ul className="grid gap-3">
              {brief.keyTimeline.map((item) => (
                <li key={`${item.dateLabel}-${item.event}`} className="grid gap-1 rounded-md border border-cyan-100 bg-cyan-50/40 p-3">
                  <span className="text-sm font-semibold text-clinic-ink">{item.dateLabel}</span>
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

          <div className="grid gap-5 md:grid-cols-2">
            <OutputBriefSection title="Allergies and important notes" icon={FileText}>
              <BulletList items={brief.allergiesAndImportantNotes} />
            </OutputBriefSection>
            <OutputBriefSection title="Questions for clinician" icon={ClipboardList}>
              <BulletList items={brief.questionsForClinician} />
            </OutputBriefSection>
          </div>

          <section className="rounded-md border border-clinic-line bg-clinic-surface p-4">
            <h2 className="text-sm font-semibold uppercase tracking-[0.08em] text-clinic-primary">Required safety note</h2>
            <p className="mt-2 text-sm leading-6 text-clinic-muted">{brief.safetyDisclaimer}</p>
          </section>
        </article>

        <aside className="grid content-start gap-4">
          <section className="rounded-md border border-clinic-line bg-white p-5 shadow-soft">
            <h2 className="font-semibold text-clinic-ink">Handoff card</h2>
            <dl className="mt-4 grid gap-3 text-sm">
              <div>
                <dt className="font-semibold text-clinic-ink">Tell the same story</dt>
                <dd className="mt-1 leading-6 text-clinic-muted">{brief.ninetySecondStory}</dd>
              </div>
              <div>
                <dt className="font-semibold text-clinic-ink">Keep consistent</dt>
                <dd className="mt-1 leading-6 text-clinic-muted">{brief.openUncertainties.slice(0, 3).join(", ")}</dd>
              </div>
              <div>
                <dt className="font-semibold text-clinic-ink">Sources checked</dt>
                <dd className="mt-1 leading-6 text-clinic-muted">
                  {brief.sourceCoverage.map((item) => `${item.section} (${item.sourceCount})`).join(", ")}
                </dd>
              </div>
            </dl>
          </section>

          <section className="rounded-md border border-clinic-line bg-white p-5 shadow-soft">
            <h2 className="font-semibold text-clinic-ink">Markdown fallback</h2>
            <p className="mt-2 text-sm leading-6 text-clinic-muted">
              The export package can produce this readable Markdown even when PDF rendering is unavailable.
            </p>
            <pre className="mt-4 max-h-64 overflow-auto rounded-md bg-clinic-surface p-4 text-xs leading-5 text-clinic-ink">{markdown}</pre>
          </section>

          <div className="grid gap-3">
            <Link
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-clinic-success px-5 py-3 font-semibold text-white transition hover:bg-emerald-700"
              href={`/cases/${caseId}/export?type=${selectedType}`}
            >
              <Download size={18} aria-hidden />
              Export
            </Link>
            <Link
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-clinic-line bg-white px-5 py-3 font-semibold text-clinic-ink transition hover:bg-cyan-50"
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
  title,
  icon: Icon,
  children
}: {
  title: string;
  icon: typeof FileText;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="flex items-center gap-2 font-semibold text-clinic-ink">
        <Icon size={18} aria-hidden />
        {title}
      </h2>
      <div className="mt-3 text-sm leading-6 text-clinic-muted">{children}</div>
    </section>
  );
}

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="grid gap-2">
      {items.map((item) => (
        <li key={item} className="rounded-md border border-cyan-100 bg-white p-3">
          {item}
        </li>
      ))}
    </ul>
  );
}
