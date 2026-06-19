import { BRIEF_PROMPT, ClinicBriefOutputSchema, REQUIRED_DISCLAIMER, runClinicJson } from "@clinicbrief/ai";
import { buildBriefFromReviewedFacts, includeReviewedPatternCardsInBrief } from "@clinicbrief/exports";
import type { BriefType, ClinicBriefOutput, ClinicCaseSnapshot, ExtractedFact } from "@clinicbrief/types";
import { listPatternCards } from "./pattern-service";

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
    const brief = record.mode === "CHRONIC" ? buildChronicAwareBrief(generated, reviewedFacts, record.questions, appointmentGoal) : generated;
    return includeReviewedPatternCardsInBrief(brief, listPatternCards(record));
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
  const brief = buildBriefFromReviewedFacts({
    caseTitle: record.title,
    caseMode: record.mode,
    briefType,
    facts: reviewedFacts,
    questions: record.questions,
    timeline: record.timeline,
    sourcePreviews: record.sourcePreviews,
    appointmentGoal,
    patternCards: listPatternCards(record)
  });

  return includeReviewedPatternCardsInBrief(record.mode === "CHRONIC" ? buildChronicAwareBrief(brief, reviewedFacts, record.questions, appointmentGoal) : brief, listPatternCards(record));
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
    modeInstructions:
      record.mode === "CHRONIC"
        ? {
            chronicScope:
              "This is a chronic or complex longitudinal appointment-prep brief. Summarize the reviewed timeline, symptoms, medication or treatment history, functional impact, appointment goals, uncertainties, and questions.",
            confirmedVsInvestigated:
              "Keep reviewed user-reported confirmed history separate from reviewed conditions, explanations, or symptoms being investigated. Never present investigated items as diagnoses.",
            factUse:
              "Only use reviewedFacts and timeline events tied to reviewed facts. Missing questions may be listed as questions to ask, not as answered facts.",
            output:
              "When chronic facts are present, include chronicSections with reportedConfirmedHistory, conditionsBeingInvestigated, baselineSymptomsAndFlares, medicationAndTreatmentHistory, functionalImpact, and appointmentGoals. Also keep the main brief fields readable for printing."
          }
        : undefined,
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

function buildChronicAwareBrief(
  brief: ClinicBriefOutput,
  reviewedFacts: ExtractedFact[],
  questions: ClinicCaseSnapshot["questions"],
  appointmentGoal?: string
): ClinicBriefOutput {
  const sections = buildChronicSections(reviewedFacts, questions, appointmentGoal);

  return {
    ...brief,
    oneLineReasonForVisit: ensureIncludes(
      brief.oneLineReasonForVisit,
      appointmentGoal?.trim() ? `Appointment goal: ${appointmentGoal.trim()}` : "Chronic appointment preparation from reviewed facts."
    ),
    allergiesAndImportantNotes: uniqueStrings([
      ...sections.reportedConfirmedHistory.map((item) => `Reported confirmed history: ${item}`),
      ...sections.conditionsBeingInvestigated.map((item) => `Being investigated or not yet confirmed: ${item}`),
      ...brief.allergiesAndImportantNotes
    ]).slice(0, 12),
    whatChangedSinceLastAppointment: uniqueStrings([
      ...brief.whatChangedSinceLastAppointment,
      ...sections.baselineSymptomsAndFlares.map((item) => `Baseline, symptom, or flare detail: ${item}`),
      ...sections.medicationAndTreatmentHistory.map((item) => `Medication or treatment history to review: ${item}`),
      ...sections.functionalImpact.map((item) => `Functional impact: ${item}`)
    ]).slice(0, 10),
    questionsForClinician: uniqueStrings([
      ...sections.appointmentGoals.map((item) => `Appointment goal or question: ${item}`),
      ...brief.questionsForClinician
    ]).slice(0, 12),
    openUncertainties: uniqueStrings([
      ...brief.openUncertainties,
      ...sections.conditionsBeingInvestigated.map((item) => `Confirm how to describe this investigated item: ${item}`)
    ]).slice(0, 12),
    sourceCoverage: uniqueCoverage([{ section: "Chronic reviewed sections", sourceCount: countChronicSections(sections) }, ...brief.sourceCoverage]).slice(0, 10),
    chronicSections: sections
  };
}

function buildChronicSections(
  reviewedFacts: ExtractedFact[],
  questions: ClinicCaseSnapshot["questions"],
  appointmentGoal?: string
): NonNullable<ClinicBriefOutput["chronicSections"]> {
  const sectioned = {
    reportedConfirmedHistory: [] as string[],
    conditionsBeingInvestigated: [] as string[],
    baselineSymptomsAndFlares: [] as string[],
    medicationAndTreatmentHistory: [] as string[],
    functionalImpact: [] as string[],
    appointmentGoals: appointmentGoal?.trim() ? [appointmentGoal.trim()] : []
  };

  for (const fact of reviewedFacts) {
    const text = cleanFactText(fact.displayText);
    const chronicFieldId = typeof fact.value.chronicFieldId === "string" ? fact.value.chronicFieldId : inferChronicField(fact);

    if (chronicFieldId === "reported_confirmed_history") {
      sectioned.reportedConfirmedHistory.push(text);
    } else if (chronicFieldId === "conditions_being_investigated") {
      sectioned.conditionsBeingInvestigated.push(text);
    } else if (chronicFieldId === "functional_impact") {
      sectioned.functionalImpact.push(text);
    } else if (chronicFieldId === "baseline_symptoms" || chronicFieldId === "flares_or_episodes" || fact.category === "SYMPTOM") {
      sectioned.baselineSymptomsAndFlares.push(text);
    } else if (chronicFieldId === "current_medications_and_treatments_tried" || fact.category === "MEDICATION") {
      sectioned.medicationAndTreatmentHistory.push(text);
    } else if (chronicFieldId === "questions_for_clinician" || fact.category === "QUESTION") {
      sectioned.appointmentGoals.push(text);
    } else if (chronicFieldId === "changed_since_last_appointment" || chronicFieldId === "possible_triggers_to_discuss") {
      sectioned.baselineSymptomsAndFlares.push(text);
    }
  }

  for (const question of questions) {
    if (question.chronicFieldId === "questions_for_clinician") {
      sectioned.appointmentGoals.push(question.question);
    }
  }

  return {
    reportedConfirmedHistory: uniqueStrings(sectioned.reportedConfirmedHistory).slice(0, 10),
    conditionsBeingInvestigated: uniqueStrings(sectioned.conditionsBeingInvestigated).slice(0, 10),
    baselineSymptomsAndFlares: uniqueStrings(sectioned.baselineSymptomsAndFlares).slice(0, 12),
    medicationAndTreatmentHistory: uniqueStrings(sectioned.medicationAndTreatmentHistory).slice(0, 12),
    functionalImpact: uniqueStrings(sectioned.functionalImpact).slice(0, 10),
    appointmentGoals: uniqueStrings(sectioned.appointmentGoals).slice(0, 8)
  };
}

function inferChronicField(fact: ExtractedFact): string | undefined {
  const text = normalizeForComparison(fact.displayText);

  if (/being investigated|not confirmed|possible|suspected|rule out|unconfirmed/.test(text)) {
    return "conditions_being_investigated";
  }

  if (/confirmed history|diagnosed|diagnosis|history of|known|longstanding/.test(text)) {
    return "reported_confirmed_history";
  }

  if (/flare|episode|baseline|symptom|fatigue|pain|mobility|worse after/.test(text)) {
    return "baseline_symptoms";
  }

  if (/medication|medicine|treatment|therapy|physio|tried/.test(text)) {
    return "current_medications_and_treatments_tried";
  }

  if (/work|study|sleep|daily|function|caring|mobility/.test(text)) {
    return "functional_impact";
  }

  if (fact.category === "QUESTION") {
    return "questions_for_clinician";
  }

  return undefined;
}

function cleanFactText(value: string): string {
  return value
    .replace(/^Source mentions:\s*/i, "")
    .replace(/^User-reported confirmed history:\s*/i, "")
    .replace(/^User-reported condition or symptom being investigated, not confirmed by ClinicBrief:\s*/i, "")
    .replace(/^User-reported flare or episode:\s*/i, "")
    .replace(/^User-reported baseline symptom pattern:\s*/i, "")
    .replace(/^User-reported medication or treatment history:\s*/i, "")
    .replace(/^User-reported functional impact:\s*/i, "")
    .replace(/^User-reported possible trigger or pattern to discuss:\s*/i, "")
    .replace(/^User-reported change since last appointment:\s*/i, "")
    .replace(/^User question for clinician:\s*/i, "")
    .trim();
}

function ensureIncludes(value: string, fallback: string): string {
  const normalizedValue = normalizeForComparison(value);
  const normalizedFallback = normalizeForComparison(fallback);
  return normalizedValue.includes(normalizedFallback) ? value : `${value} ${fallback}`.trim();
}

function uniqueStrings(items: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const item of items) {
    const trimmed = item.trim();
    const key = normalizeForComparison(trimmed);

    if (!trimmed || seen.has(key)) {
      continue;
    }

    seen.add(key);
    result.push(trimmed);
  }

  return result;
}

function uniqueCoverage(items: ClinicBriefOutput["sourceCoverage"]): ClinicBriefOutput["sourceCoverage"] {
  const seen = new Set<string>();
  const result: ClinicBriefOutput["sourceCoverage"] = [];

  for (const item of items) {
    const key = normalizeForComparison(item.section);

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    result.push(item);
  }

  return result;
}

function countChronicSections(sections: NonNullable<ClinicBriefOutput["chronicSections"]>): number {
  return Object.values(sections).reduce((sum, items) => sum + items.length, 0);
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
