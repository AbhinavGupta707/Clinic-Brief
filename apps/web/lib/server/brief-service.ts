import { BRIEF_PROMPT, ClinicBriefOutputSchema, REQUIRED_DISCLAIMER, runClinicJson } from "@clinicbrief/ai";
import { buildBriefFromReviewedFacts } from "@clinicbrief/exports";
import type { BriefType, ClinicBriefOutput, ClinicCaseSnapshot, ExtractedFact } from "@clinicbrief/types";

export async function buildAppointmentBrief({
  record,
  briefType,
  appointmentGoal
}: {
  record: ClinicCaseSnapshot;
  briefType: BriefType;
  appointmentGoal?: string;
}): Promise<ClinicBriefOutput> {
  const reviewedFacts = getReviewedFacts(record.facts);

  try {
    const generated = await runClinicJson({
      task: "brief-generation",
      system: BRIEF_PROMPT,
      user: buildBriefUserPrompt({ record, briefType, appointmentGoal, reviewedFacts }),
      schema: ClinicBriefOutputSchema
    });

    assertRejectedFactsExcluded(generated, record.facts);
    return generated;
  } catch {
    return buildDeterministicBrief({ record, briefType, appointmentGoal, reviewedFacts });
  }
}

function buildDeterministicBrief({
  record,
  briefType,
  appointmentGoal,
  reviewedFacts
}: {
  record: ClinicCaseSnapshot;
  briefType: BriefType;
  appointmentGoal?: string;
  reviewedFacts: ExtractedFact[];
}): ClinicBriefOutput {
  return buildBriefFromReviewedFacts({
    caseTitle: record.title,
    briefType,
    facts: reviewedFacts,
    questions: record.questions,
    timeline: record.timeline,
    sourcePreviews: record.sourcePreviews,
    appointmentGoal
  });
}

function buildBriefUserPrompt({
  record,
  briefType,
  appointmentGoal,
  reviewedFacts
}: {
  record: ClinicCaseSnapshot;
  briefType: BriefType;
  appointmentGoal?: string;
  reviewedFacts: ExtractedFact[];
}): string {
  const reviewedFactIds = new Set(reviewedFacts.map((fact) => fact.id));

  return JSON.stringify({
    task: "Generate an appointment-preparation brief. Use reviewed facts only. Do not use rejected or unreviewed facts. Do not diagnose, recommend treatment, advise medication changes, assess urgency, or provide dosing advice.",
    briefType,
    requiredSafetyDisclaimer: REQUIRED_DISCLAIMER,
    caseContext: {
      title: record.title,
      mode: record.mode,
      appointmentGoal: appointmentGoal?.trim()
    },
    reviewedFacts: reviewedFacts.map((fact) => ({
      id: fact.id,
      sourceDocId: fact.sourceDocId,
      category: fact.category,
      displayText: fact.displayText,
      value: fact.value,
      confidence: fact.confidence
    })),
    timeline: record.timeline
      .filter((event) => !event.sourceFactIds || event.sourceFactIds.some((factId) => reviewedFactIds.has(factId)))
      .map((event) => ({
        date: event.date,
        approximateDate: event.approximateDate,
        title: event.title,
        description: event.description
      })),
    missingQuestions: record.questions.map((question) => ({
      id: question.id,
      priority: question.priority,
      question: question.question,
      whyItMattersForAppointment: question.whyItMattersForAppointment,
      answerType: question.answerType
    }))
  });
}

function getReviewedFacts(facts: ExtractedFact[]): ExtractedFact[] {
  return facts.filter((fact) => fact.userStatus === "CONFIRMED" || fact.userStatus === "EDITED");
}

function assertRejectedFactsExcluded(brief: ClinicBriefOutput, facts: ExtractedFact[]): void {
  const serializedBrief = normalizeForComparison(JSON.stringify(brief));
  const rejectedMatches = facts
    .filter((fact) => fact.userStatus === "REJECTED")
    .map((fact) => normalizeForComparison(fact.displayText.replace(/^Source mentions:\s*/i, "")))
    .filter((text) => text.length >= 12)
    .filter((text) => serializedBrief.includes(text));

  if (rejectedMatches.length > 0) {
    throw new Error("Generated brief included a rejected fact.");
  }
}

function normalizeForComparison(value: string): string {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}
