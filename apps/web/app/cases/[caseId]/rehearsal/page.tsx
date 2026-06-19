import Link from "next/link";
import { ArrowLeft, Download } from "lucide-react";
import { BRIEF_MODE_DEFINITIONS, buildBriefFromReviewedFacts, getBriefModeDefinition } from "@clinicbrief/exports";
import type { BriefType, ClinicBriefOutput, MissingQuestion } from "@clinicbrief/types";
import { notFound } from "next/navigation";
import { AppShell } from "../../../../components/app-shell";
import { DemoFlowNav, SectionHeader } from "../../../../components/demo/demo-case-components";
import { getClinicRepository } from "../../../../lib/server/clinic-repository";
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
  const repository = await getClinicRepository();
  const record = await repository.getCase(caseId);

  if (!record) {
    notFound();
  }

  const savedBrief = record.briefs.find((item) => item.briefType === selectedType);
  const brief =
    savedBrief?.briefJson ??
    buildBriefFromReviewedFacts({
      caseTitle: record.title,
      briefType: selectedType,
      facts: record.facts,
      questions: record.questions,
      timeline: record.timeline,
      sourcePreviews: record.sourcePreviews
    });
  const questions = record.questions.length > 0 ? record.questions : fallbackQuestionsFromBrief(caseId, brief);
  const isDemoCase = caseId === "sample-preop";

  return (
    <AppShell eyebrow={`Case ${caseId}`} title="Appointment rehearsal">
      {isDemoCase ? <DemoFlowNav current="Rehearsal" /> : null}

      <SectionHeader
        eyebrow="Practice without advice"
        title="A rehearsal that asks one safe question at a time"
        body="The rehearsal uses missing-context questions only. It helps the user phrase their own history and redirects away from diagnosis, treatment, medication, surgery, and emergency-advice requests."
      />

      <section className="grid gap-4 rounded-md border border-clinic-line bg-white p-5 shadow-soft">
        <div className="flex flex-wrap items-center gap-2 text-sm text-clinic-muted">
          <span className="rounded-md bg-clinic-surface px-3 py-1 font-semibold text-clinic-ink">{mode.label}</span>
          <span>One appointment-prep question at a time</span>
        </div>
        <p className="max-w-3xl text-sm leading-6 text-clinic-muted">
          This rehearsal saves typed practice answers for this case and keeps each response within appointment preparation. Browser speech recognition is optional.
        </p>
      </section>

      <RehearsalClient briefType={selectedType} caseId={caseId} questions={questions} story={brief.ninetySecondStory} />

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

function fallbackQuestionsFromBrief(caseId: string, brief: ClinicBriefOutput): MissingQuestion[] {
  const items = brief.questionsForClinician.length > 0 ? brief.questionsForClinician : ["What is the most important point to make at the appointment?"];

  return items.slice(0, 5).map((question, index) => ({
    id: `brief-question-${caseId}-${index}`,
    priority: index === 0 ? "high" : "medium",
    question,
    whyItMattersForAppointment: "This keeps the rehearsal focused on appointment preparation.",
    answerType: "short_text"
  }));
}
