import { buildBriefFromReviewedFacts, buildTimelineFromReviewedFacts, getFactsForGeneratedOutputs } from "@clinicbrief/exports";
import type { BriefType, CaseDashboardState, CaseDashboardWorkflowItem, ClinicCaseSnapshot, DashboardWorkflowState, ExtractedFact, TimelineEvent } from "@clinicbrief/types";
import { listPatternCards } from "../../../lib/server/pattern-service";

export function buildCaseDashboardState(record: ClinicCaseSnapshot): CaseDashboardState {
  const timeline = getDashboardTimeline(record);
  const briefType = getDefaultBriefType(record);
  const brief =
    record.briefs.find((item) => item.briefType === briefType)?.briefJson ??
    buildBriefFromReviewedFacts({
      caseTitle: record.title,
      briefType,
      facts: record.facts,
      questions: record.questions,
      timeline,
      sourcePreviews: record.sourcePreviews
    });
  const usableFacts = getFactsForGeneratedOutputs(record.facts);
  const reviewedFacts = record.facts.filter((fact) => fact.userStatus === "CONFIRMED" || fact.userStatus === "EDITED");
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
  return record.timeline.length > 0 ? record.timeline : buildTimelineFromReviewedFacts(record.id, record.facts);
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
