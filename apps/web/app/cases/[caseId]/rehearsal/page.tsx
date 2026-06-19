import Link from "next/link";
import { ArrowLeft, Download } from "lucide-react";
import { preopCase } from "@clinicbrief/fixtures";
import { BRIEF_MODE_DEFINITIONS, buildBriefVariant, getBriefModeDefinition } from "@clinicbrief/exports";
import type { BriefType } from "@clinicbrief/types";
import { AppShell } from "../../../../components/app-shell";
import { RehearsalClient } from "./rehearsal-client";

type RehearsalPageProps = {
  params: Promise<{ caseId: string }>;
  searchParams?: Promise<{ type?: string | string[] }>;
};

export default async function RehearsalPage({ params, searchParams }: RehearsalPageProps) {
  const { caseId } = await params;
  const query = searchParams ? await searchParams : {};
  const selectedType = parseBriefType(query.type) ?? "PREOP";
  const mode = getBriefModeDefinition(selectedType);
  const brief = buildBriefVariant(preopCase.expectedBrief, selectedType);

  return (
    <AppShell eyebrow={`Case ${caseId}`} title="Appointment rehearsal">
      <section className="grid gap-4 rounded-md border border-clinic-line bg-white p-5 shadow-soft">
        <div className="flex flex-wrap items-center gap-2 text-sm text-clinic-muted">
          <span className="rounded-md bg-clinic-surface px-3 py-1 font-semibold text-clinic-ink">{mode.label}</span>
          <span>One appointment-prep question at a time</span>
        </div>
        <p className="max-w-3xl text-sm leading-6 text-clinic-muted">
          This mocked rehearsal uses the synthetic case questions only. It helps the user practice wording and redirects diagnosis,
          treatment, medication, surgery, and emergency-advice requests.
        </p>
      </section>

      <RehearsalClient
        briefType={selectedType}
        caseId={caseId}
        questions={preopCase.expectedQuestions}
        story={brief.ninetySecondStory}
      />

      <div className="flex flex-wrap gap-3">
        <Link
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-clinic-line bg-white px-5 py-3 font-semibold text-clinic-ink transition hover:bg-cyan-50"
          href={`/cases/${caseId}/brief?type=${selectedType}`}
        >
          <ArrowLeft size={18} aria-hidden />
          Back to brief
        </Link>
        <Link
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-clinic-success px-5 py-3 font-semibold text-white transition hover:bg-emerald-700"
          href={`/cases/${caseId}/export?type=${selectedType}`}
        >
          <Download size={18} aria-hidden />
          Export
        </Link>
      </div>
    </AppShell>
  );
}

function parseBriefType(value: string | string[] | undefined): BriefType | null {
  const candidate = Array.isArray(value) ? value[0] : value;
  return BRIEF_MODE_DEFINITIONS.some((mode) => mode.type === candidate) ? (candidate as BriefType) : null;
}
