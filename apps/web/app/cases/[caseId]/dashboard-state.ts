import { buildBriefFromReviewedFacts, buildTimelineFromReviewedFacts } from "@clinicbrief/exports";
import type {
  BriefType,
  CaseDashboardState,
  CaseDashboardWorkflowItem,
  ClinicCaseSnapshot,
  DashboardReviewableItem,
  DashboardWorkflowState,
  ExtractedFact,
  MissingQuestion,
  TimelineEvent
} from "@clinicbrief/types";
import { listPatternCards } from "../../../lib/server/pattern-service";

type ChronicPanelSection = {
  id: string;
  title: string;
  items: DashboardReviewableItem[];
};

export type ChronicLongitudinalDashboardState = {
  appointmentGoal?: string;
  readyForBrief: {
    ready: boolean;
    reviewedFactCount: number;
    href: string;
    reason: string;
  };
  sections: ChronicPanelSection[];
  openQuestions: Array<{
    id: string;
    question: string;
    priority: MissingQuestion["priority"];
    whyItMattersForAppointment: string;
  }>;
  openUncertainties: DashboardReviewableItem[];
  needsReview: DashboardReviewableItem[];
  emptyState?: {
    title: string;
    body: string;
    primaryHref: string;
    primaryLabel: string;
  };
};

export function buildCaseDashboardState(record: ClinicCaseSnapshot): CaseDashboardState {
  const timeline = getDashboardTimeline(record);
  const briefType = getDefaultBriefType(record);
  const reviewedFacts = getReviewedFacts(record.facts);
  const brief =
    record.briefs.find((item) => item.briefType === briefType)?.briefJson ??
    buildBriefFromReviewedFacts({
      caseTitle: record.title,
      caseMode: record.mode,
      briefType,
      facts: reviewedFacts,
      questions: record.questions,
      timeline,
      sourcePreviews: record.sourcePreviews,
      appointmentGoal: findAppointmentGoal(record, reviewedFacts),
      patternCards: listPatternCards(record)
    });
  const factsNeedingReview = record.facts.filter((fact) => fact.userStatus === "UNREVIEWED").length;
  const reviewedPatterns = listPatternCards(record).filter((card) => card.userStatus === "CONFIRMED" || card.userStatus === "EDITED").length;
  const hasSources = record.documents.length > 0 || record.sourcePreviews.length > 0;
  const hasFacts = record.facts.length > 0;
  const hasReviewedFacts = reviewedFacts.length > 0;
  const hasBrief = record.briefs.length > 0;
  const hasTimeline = timeline.length > 0;
  const hasExport = record.status === "EXPORTED" || record.briefs.some((item) => Boolean(item.pdfUrl));

  const workflow: CaseDashboardWorkflowItem[] = [
    {
      id: "intake" as const,
      label: "Add sources",
      state: hasSources ? "done" : "needs_input",
      count: record.sourcePreviews.length || record.documents.length
    },
    {
      id: "extraction" as const,
      label: "Extract facts",
      state: extractionState(hasSources, hasFacts),
      count: record.facts.length
    },
    {
      id: "review" as const,
      label: "Review facts",
      state: reviewState(hasFacts, factsNeedingReview),
      count: factsNeedingReview,
      needsUserReview: factsNeedingReview > 0
    },
    {
      id: "timeline" as const,
      label: "Timeline",
      state: timelineState(hasFacts, hasReviewedFacts, hasTimeline),
      count: timeline.length
    },
    {
      id: "brief" as const,
      label: "Brief",
      state: briefState(hasReviewedFacts || hasTimeline, hasBrief),
      count: record.briefs.length
    },
    {
      id: "export" as const,
      label: "Export",
      state: exportState(hasBrief, hasExport),
      count: hasExport ? 1 : 0
    }
  ];

  return {
    caseId: record.id,
    mode: record.mode,
    generatedAt: new Date().toISOString(),
    workflow,
    counts: {
      documents: record.documents.length,
      sourcePreviews: record.sourcePreviews.length,
      facts: record.facts.length,
      factsNeedingReview,
      reviewedPatterns,
      openQuestions: record.questions.length,
      briefs: record.briefs.length
    },
    nextAction: getNextAction(record.id, workflow),
    whatChangedSinceLastAppointment: brief.whatChangedSinceLastAppointment.slice(0, 4).map((text, index) => ({
      id: `change-${record.id}-${index}`,
      text,
      sourceFactIds: sourceFactIdsForText(text, reviewedFacts),
      sourceDocumentIds: sourceDocumentIdsForText(text, reviewedFacts),
      userReviewed: hasReviewedFacts
    })),
    topPointsToRaise: reviewedFacts.slice(0, 5).map((fact) => ({
      id: fact.id,
      text: fact.displayText,
      sourceFactIds: [fact.id],
      sourceDocumentIds: fact.sourceDocId ? [fact.sourceDocId] : undefined,
      userReviewed: fact.userStatus === "CONFIRMED" || fact.userStatus === "EDITED"
    })),
    openQuestions: record.questions.slice(0, 6).map((question) => ({
      id: question.id,
      question: question.question,
      priority: question.priority,
      answered: false
    })),
    sourceCoverage: [
      {
        section: "Source documents and notes",
        sourceCount: record.sourcePreviews.length || record.documents.length,
        weakOrMissingEvidence: !hasSources
      },
      ...brief.sourceCoverage.slice(0, 5).map((item) => ({
        section: item.section,
        sourceCount: item.sourceCount,
        weakOrMissingEvidence: item.sourceCount === 0
      }))
    ],
    safetyDisclaimerRequired: true
  };
}

export function getDashboardTimeline(record: ClinicCaseSnapshot): TimelineEvent[] {
  const reviewedFacts = getReviewedFacts(record.facts);
  const reviewedFactIds = new Set(reviewedFacts.map((fact) => fact.id));
  const reviewedTimeline = record.timeline.filter(
    (event) => !event.sourceFactIds || event.sourceFactIds.length === 0 || event.sourceFactIds.some((factId) => reviewedFactIds.has(factId))
  );

  return reviewedTimeline.length > 0 ? reviewedTimeline : buildTimelineFromReviewedFacts(record.id, reviewedFacts);
}

export function getDefaultBriefType(record: ClinicCaseSnapshot): BriefType {
  if (record.mode === "PREOP") {
    return "PREOP";
  }

  if (record.mode === "CARER") {
    return "FAMILY_HANDOFF";
  }

  return "GP";
}

export function buildChronicLongitudinalDashboardState(record: ClinicCaseSnapshot): ChronicLongitudinalDashboardState {
  const reviewedFacts = getReviewedFacts(record.facts);
  const unreviewedFacts = record.facts.filter((fact) => fact.userStatus === "UNREVIEWED" && !isPatternCardFact(fact));
  const reviewedFactIds = new Set(reviewedFacts.map((fact) => fact.id));
  const timeline = getDashboardTimeline(record).filter(
    (event) => event.sourceFactIds && event.sourceFactIds.some((factId) => reviewedFactIds.has(factId))
  );
  const briefType = getDefaultBriefType(record);
  const appointmentGoal = findAppointmentGoal(record, reviewedFacts);
  const hasSources = record.documents.length > 0 || record.sourcePreviews.length > 0;
  const hasFacts = record.facts.length > 0;

  const sections: ChronicPanelSection[] = [
    {
      id: "symptom-change-themes",
      title: "Symptom and change themes",
      items: factsToReviewableItems(
        reviewedFacts.filter((fact) =>
          ["baseline_symptoms", "changed_since_last_appointment"].includes(getChronicFieldId(fact) ?? "") || fact.category === "SYMPTOM"
        )
      ).slice(0, 5)
    },
    {
      id: "timeline-highlights",
      title: "Timeline highlights",
      items: timeline.slice(0, 5).map((event) => ({
        id: event.id,
        text: `${event.date ?? event.approximateDate ?? "Date not provided"}: ${event.description || event.title}`,
        sourceFactIds: event.sourceFactIds,
        userReviewed: true
      }))
    },
    {
      id: "flares-triggers-impact",
      title: "Flares, triggers, and functional impact",
      items: factsToReviewableItems(
        reviewedFacts.filter((fact) =>
          ["flares_or_episodes", "possible_triggers_to_discuss", "functional_impact"].includes(getChronicFieldId(fact) ?? "") || isFunctionalImpactFact(fact)
        )
      ).slice(0, 6)
    },
    {
      id: "medications-allergies-notes",
      title: "Medications, allergies, and important notes",
      items: factsToReviewableItems(
        reviewedFacts.filter((fact) => ["MEDICATION", "ALLERGY", "HISTORY_ITEM", "TEST_RESULT", "PROCEDURE"].includes(fact.category))
      ).slice(0, 6)
    }
  ];

  const openQuestions = record.questions.slice(0, 6).map((question) => ({
    id: question.id,
    question: question.question,
    priority: question.priority,
    whyItMattersForAppointment: question.whyItMattersForAppointment
  }));
  const openUncertainties = factsToReviewableItems(
    reviewedFacts.filter((fact) => ["conditions_being_investigated"].includes(getChronicFieldId(fact) ?? ""))
  ).slice(0, 4);

  const needsReview = factsToReviewableItems(unreviewedFacts).slice(0, 6);
  const ready = reviewedFacts.length > 0;

  return {
    appointmentGoal,
    readyForBrief: {
      ready,
      reviewedFactCount: reviewedFacts.length,
      href: ready ? `/cases/${record.id}/brief?type=${briefType}` : hasFacts ? `/cases/${record.id}/review` : `/cases/${record.id}/intake`,
      reason: ready
        ? `${reviewedFacts.length} reviewed ${reviewedFacts.length === 1 ? "fact is" : "facts are"} ready to shape the brief. Rejected facts are excluded and unreviewed facts stay in review.`
        : hasFacts
          ? "Review extracted facts before using them in the chronic appointment brief."
          : "Add notes or documents, then extract facts for review before building a chronic appointment brief."
    },
    sections,
    openQuestions,
    openUncertainties,
    needsReview,
    emptyState: getChronicEmptyState(record.id, hasSources, hasFacts, reviewedFacts.length)
  };
}

function extractionState(hasSources: boolean, hasFacts: boolean): DashboardWorkflowState {
  if (hasFacts) {
    return "done";
  }

  return hasSources ? "ready" : "blocked";
}

function reviewState(hasFacts: boolean, factsNeedingReview: number): DashboardWorkflowState {
  if (!hasFacts) {
    return "blocked";
  }

  return factsNeedingReview > 0 ? "needs_input" : "done";
}

function timelineState(hasFacts: boolean, hasReviewedFacts: boolean, hasTimeline: boolean): DashboardWorkflowState {
  if (hasTimeline) {
    return "done";
  }

  if (hasReviewedFacts) {
    return "ready";
  }

  return hasFacts ? "needs_input" : "blocked";
}

function briefState(canBuildBrief: boolean, hasBrief: boolean): DashboardWorkflowState {
  if (hasBrief) {
    return "done";
  }

  return canBuildBrief ? "ready" : "blocked";
}

function exportState(hasBrief: boolean, hasExport: boolean): DashboardWorkflowState {
  if (hasExport) {
    return "done";
  }

  return hasBrief ? "ready" : "blocked";
}

function getReviewedFacts(facts: ExtractedFact[]): ExtractedFact[] {
  return facts.filter((fact) => (fact.userStatus === "CONFIRMED" || fact.userStatus === "EDITED") && !isPatternCardFact(fact));
}

function getChronicEmptyState(caseId: string, hasSources: boolean, hasFacts: boolean, reviewedFactCount: number): ChronicLongitudinalDashboardState["emptyState"] {
  if (reviewedFactCount > 0) {
    return undefined;
  }

  if (!hasSources) {
    return {
      title: "Start the ongoing history",
      body: "Add notes, a document, or a guided intake answer so ClinicBrief can extract facts for you to review.",
      primaryHref: `/cases/${caseId}/intake`,
      primaryLabel: "Add intake notes"
    };
  }

  if (!hasFacts) {
    return {
      title: "Extract facts for review",
      body: "Sources are present. Extract appointment-prep facts, then confirm or edit the items that should shape this dashboard.",
      primaryHref: `/cases/${caseId}/intake#extract`,
      primaryLabel: "Extract facts"
    };
  }

  return {
    title: "Review facts first",
    body: "The longitudinal view only uses confirmed or edited facts. Review the extracted items before building a strong summary.",
    primaryHref: `/cases/${caseId}/review`,
    primaryLabel: "Review facts"
  };
}

function factsToReviewableItems(facts: ExtractedFact[]): DashboardReviewableItem[] {
  return uniqueFacts(facts).map((fact) => ({
    id: fact.id,
    text: cleanFactText(fact.displayText),
    sourceFactIds: [fact.id],
    sourceDocumentIds: fact.sourceDocId ? [fact.sourceDocId] : undefined,
    userReviewed: fact.userStatus === "CONFIRMED" || fact.userStatus === "EDITED"
  }));
}

function uniqueFacts(facts: ExtractedFact[]): ExtractedFact[] {
  const seen = new Set<string>();
  const result: ExtractedFact[] = [];

  for (const fact of facts) {
    const key = normalize(cleanFactText(fact.displayText));

    if (!key || seen.has(key)) {
      continue;
    }

    seen.add(key);
    result.push(fact);
  }

  return result;
}

function findAppointmentGoal(record: ClinicCaseSnapshot, reviewedFacts: ExtractedFact[]): string | undefined {
  const goalFact = reviewedFacts.find((fact) => {
    const chronicFieldId = getChronicFieldId(fact);
    return chronicFieldId === "questions_for_clinician" || fact.category === "APPOINTMENT" || isAppointmentGoalText(fact.displayText);
  });

  const factGoal = goalFact ? factValueString(goalFact, ["goal", "appointmentGoal", "question", "text"]) ?? cleanFactText(goalFact.displayText) : undefined;
  const appointmentGoal = record.appointments.map((appointment) => appointment.goal).find((goal): goal is string => Boolean(goal?.trim()));

  return cleanOptionalString(factGoal) ?? cleanOptionalString(appointmentGoal);
}

function getChronicFieldId(fact: ExtractedFact): MissingQuestion["chronicFieldId"] | undefined {
  const value = fact.value.chronicFieldId;

  if (typeof value === "string" && isChronicFieldId(value)) {
    return value;
  }

  return inferChronicField(fact);
}

function inferChronicField(fact: ExtractedFact): MissingQuestion["chronicFieldId"] | undefined {
  const text = normalize(cleanFactText(fact.displayText));

  if (/being investigated|not confirmed|possible|suspected|rule out|unconfirmed/.test(text)) {
    return "conditions_being_investigated";
  }

  if (/confirmed history|diagnosed|diagnosis|history of|known|longstanding/.test(text)) {
    return "reported_confirmed_history";
  }

  if (/flare|episode|baseline|symptom|fatigue|pain|mobility|worse after|changed|change|since last/.test(text)) {
    return "baseline_symptoms";
  }

  if (/medication|medicine|treatment|therapy|physio|tried/.test(text)) {
    return "current_medications_and_treatments_tried";
  }

  if (/trigger|after|worse with|linked to|pattern/.test(text)) {
    return "possible_triggers_to_discuss";
  }

  if (/work|study|sleep|daily|function|impact|caring|mobility|walk/.test(text)) {
    return "functional_impact";
  }

  if (/question|ask|appointment goal|purpose/.test(text) || fact.category === "QUESTION") {
    return "questions_for_clinician";
  }

  return undefined;
}

function isChronicFieldId(value: string): value is NonNullable<MissingQuestion["chronicFieldId"]> {
  return [
    "reported_confirmed_history",
    "conditions_being_investigated",
    "baseline_symptoms",
    "flares_or_episodes",
    "current_medications_and_treatments_tried",
    "functional_impact",
    "possible_triggers_to_discuss",
    "changed_since_last_appointment",
    "questions_for_clinician"
  ].includes(value);
}

function isFunctionalImpactFact(fact: ExtractedFact): boolean {
  return /function|impact|walking|walk|work|sleep|daily|school|care|mobility/i.test(fact.displayText);
}

function isAppointmentGoalText(value: string): boolean {
  return /appointment goal|appointment purpose|question for clinician|main concern|want to ask/i.test(value);
}

function factValueString(fact: ExtractedFact, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = fact.value[key];

    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return undefined;
}

function cleanOptionalString(value: string | undefined): string | undefined {
  const cleaned = value?.trim();
  return cleaned ? cleaned : undefined;
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

function isPatternCardFact(fact: ExtractedFact): boolean {
  return fact.value.kind === "pattern_card";
}

function getNextAction(caseId: string, workflow: CaseDashboardState["workflow"]): CaseDashboardState["nextAction"] {
  const byId = Object.fromEntries(workflow.map((item) => [item.id, item]));

  if (byId.intake.state !== "done") {
    return {
      id: "intake",
      label: "Add notes or documents",
      href: `/cases/${caseId}/intake`,
      reason: "Start by adding the information ClinicBrief should organize."
    };
  }

  if (byId.extraction.state === "ready") {
    return {
      id: "extraction",
      label: "Extract facts for review",
      href: `/cases/${caseId}/intake#extract`,
      reason: "Sources are ready. Extract appointment-prep facts before reviewing them."
    };
  }

  if (byId.review.state === "needs_input") {
    return {
      id: "review",
      label: "Review extracted facts",
      href: `/cases/${caseId}/review`,
      reason: "Confirm, edit, or reject facts before they shape the brief."
    };
  }

  if (byId.timeline.state === "ready") {
    return {
      id: "timeline",
      label: "Build timeline",
      href: `/cases/${caseId}/timeline`,
      reason: "Reviewed facts can now be checked as a chronological appointment story."
    };
  }

  if (byId.brief.state === "ready") {
    return {
      id: "brief",
      label: "Generate appointment brief",
      href: `/cases/${caseId}/brief`,
      reason: "The case has enough reviewed information for a clinician-readable draft."
    };
  }

  if (byId.export.state === "ready") {
    return {
      id: "export",
      label: "Export or rehearse",
      href: `/cases/${caseId}/export`,
      reason: "Your brief is ready to download, print, copy, or practice."
    };
  }

  return {
    id: "brief",
    label: "Open brief",
    href: `/cases/${caseId}/brief`,
    reason: "The main appointment-prep materials are available."
  };
}

function sourceFactIdsForText(text: string, facts: ExtractedFact[]): string[] | undefined {
  const normalizedText = normalize(text);
  const matches = facts.filter((fact) => normalizedText.includes(normalize(fact.displayText)) || normalize(fact.displayText).includes(normalizedText));
  return matches.length > 0 ? matches.map((fact) => fact.id) : undefined;
}

function sourceDocumentIdsForText(text: string, facts: ExtractedFact[]): string[] | undefined {
  const matches = sourceFactIdsForText(text, facts);

  if (!matches) {
    return undefined;
  }

  const sourceIds = facts.filter((fact) => matches.includes(fact.id)).map((fact) => fact.sourceDocId).filter(Boolean) as string[];
  return sourceIds.length > 0 ? Array.from(new Set(sourceIds)) : undefined;
}

function normalize(value: string): string {
  return value.toLowerCase().replaceAll(/[^a-z0-9]+/g, " ").trim();
}
