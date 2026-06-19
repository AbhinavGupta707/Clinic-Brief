import type { ClinicCaseSnapshot, ExtractedFact, FactCategory, PatternCard, PatternCardKind, PatternCardSafetyLabel, ReviewStatus } from "@clinicbrief/types";

const PATTERN_VALUE_KIND = "pattern_card";
const REVIEWED_STATUSES: ReviewStatus[] = ["CONFIRMED", "EDITED"];
const FORBIDDEN_PATTERN_LANGUAGE = /\b(diagnos(?:e|is|tic)?|cause[sd]?|treat(?:ment)?|medication change|dose|urgent|emergency|triage|risk score)\b/i;

type PatternFactValue = {
  kind: typeof PATTERN_VALUE_KIND;
  patternKind: PatternCardKind;
  title: string;
  summary: string;
  safetyLabel: PatternCardSafetyLabel;
  sourceFactIds: string[];
  sourceDocumentIds?: string[];
};

type PatternCandidate = Omit<PatternFactValue, "kind"> & {
  id: string;
  suggestedBriefText: string;
  confidence: number;
};

export function listPatternCards(record: ClinicCaseSnapshot): PatternCard[] {
  return record.facts.filter(isPatternFact).map(patternFactToCard);
}

export function buildPatternFacts(record: ClinicCaseSnapshot): ExtractedFact[] {
  const existingPatternIds = new Set(record.facts.filter(isPatternFact).map((fact) => fact.id));
  return buildPatternCandidates(record)
    .filter((candidate) => !existingPatternIds.has(candidate.id))
    .map((candidate) => patternCandidateToFact(record.id, candidate));
}

export function buildFactsWithGeneratedPatterns(record: ClinicCaseSnapshot): ExtractedFact[] {
  const generated = buildPatternFacts(record);
  return generated.length > 0 ? [...record.facts, ...generated] : record.facts;
}

export function isPatternFact(fact: ExtractedFact): boolean {
  return fact.value.kind === PATTERN_VALUE_KIND;
}

export function patternFactToCard(fact: ExtractedFact): PatternCard {
  const value = fact.value as Partial<PatternFactValue>;
  const sourceFactIds = Array.isArray(value.sourceFactIds) ? value.sourceFactIds.filter((id): id is string => typeof id === "string") : [];
  const sourceDocumentIds = Array.isArray(value.sourceDocumentIds) ? value.sourceDocumentIds.filter((id): id is string => typeof id === "string") : undefined;

  return {
    id: fact.id,
    caseId: fact.caseId,
    kind: isPatternKind(value.patternKind) ? value.patternKind : "source_gap",
    title: safePatternText(value.title, "Possible pattern to discuss"),
    summary: safePatternText(value.summary, "Reviewed notes may contain a pattern to discuss with a clinician."),
    suggestedBriefText: safePatternText(fact.displayText, "Possible pattern to discuss with a clinician."),
    safetyLabel: isSafetyLabel(value.safetyLabel) ? value.safetyLabel : "possible_pattern_to_discuss",
    userStatus: fact.userStatus,
    requiresUserReview: true,
    sourceFactIds,
    sourceDocumentIds,
    confidence: fact.confidence,
    createdAt: fact.createdAt,
    reviewedAt: REVIEWED_STATUSES.includes(fact.userStatus) ? fact.createdAt : undefined,
    reviewerEditedText: fact.userStatus === "EDITED" ? fact.displayText : undefined
  };
}

function buildPatternCandidates(record: ClinicCaseSnapshot): PatternCandidate[] {
  const facts = record.facts.filter((fact) => REVIEWED_STATUSES.includes(fact.userStatus) && !isPatternFact(fact));
  const candidates: PatternCandidate[] = [];

  addCandidate(candidates, record.id, "repeated_symptom", facts.filter((fact) => fact.category === "SYMPTOM"));
  addCandidate(candidates, record.id, "recent_change", facts.filter(isRecentChangeFact));
  addCandidate(candidates, record.id, "medication_note", facts.filter((fact) => fact.category === "MEDICATION"));
  addCandidate(candidates, record.id, "functional_impact", facts.filter(isFunctionalImpactFact));
  addCandidate(candidates, record.id, "appointment_question", facts.filter((fact) => fact.category === "QUESTION"));

  return candidates.slice(0, 5);
}

function addCandidate(candidates: PatternCandidate[], caseId: string, kind: PatternCardKind, facts: ExtractedFact[]): void {
  const sourceFacts = facts.slice(0, 4);

  if (sourceFacts.length === 0) {
    return;
  }

  const sourceFactIds = sourceFacts.map((fact) => fact.id);
  const sourceDocumentIds = Array.from(new Set(sourceFacts.map((fact) => fact.sourceDocId).filter((id): id is string => Boolean(id))));
  const title = titleForKind(kind);
  const summary = summaryForKind(kind, sourceFacts.length);
  const suggestedBriefText = `${title}: ${summary}`;

  candidates.push({
    id: `pattern-${caseId}-${kind}-${sourceFactIds.join("-")}`,
    patternKind: kind,
    title,
    summary,
    suggestedBriefText,
    safetyLabel: safetyLabelForKind(kind),
    sourceFactIds,
    sourceDocumentIds: sourceDocumentIds.length > 0 ? sourceDocumentIds : undefined,
    confidence: Math.min(0.95, Math.max(0.55, average(sourceFacts.map((fact) => fact.confidence))))
  });
}

function patternCandidateToFact(caseId: string, candidate: PatternCandidate): ExtractedFact {
  const now = new Date().toISOString();
  const value: PatternFactValue = {
    kind: PATTERN_VALUE_KIND,
    patternKind: candidate.patternKind,
    title: candidate.title,
    summary: candidate.summary,
    safetyLabel: candidate.safetyLabel,
    sourceFactIds: candidate.sourceFactIds,
    sourceDocumentIds: candidate.sourceDocumentIds
  };

  return {
    id: candidate.id,
    caseId,
    sourceDocId: candidate.sourceDocumentIds?.[0],
    category: "HISTORY_ITEM",
    displayText: safePatternText(candidate.suggestedBriefText, "Possible pattern to discuss with a clinician."),
    value,
    confidence: candidate.confidence,
    userStatus: "UNREVIEWED",
    createdAt: now
  };
}

function isRecentChangeFact(fact: ExtractedFact): boolean {
  return /changed|change|worse|new|recent|since last|last appointment/i.test(fact.displayText);
}

function isFunctionalImpactFact(fact: ExtractedFact): boolean {
  return (
    fact.value.chronicFieldId === "functional_impact" ||
    /function|impact|walking|walk|work|sleep|daily|school|care|mobility/i.test(fact.displayText)
  );
}

function titleForKind(kind: PatternCardKind): string {
  const titles: Record<PatternCardKind, string> = {
    repeated_symptom: "Possible repeated symptom pattern to discuss",
    recent_change: "Possible recent change to discuss",
    medication_note: "Medication note to discuss",
    functional_impact: "Functional impact pattern to discuss",
    appointment_question: "Question pattern to discuss",
    source_gap: "Source gap to review"
  };
  return titles[kind];
}

function summaryForKind(kind: PatternCardKind, count: number): string {
  const summaries: Record<PatternCardKind, string> = {
    repeated_symptom: `${count} reviewed symptom ${plural(count, "item")} may be worth raising as a pattern, not a conclusion.`,
    recent_change: `${count} reviewed ${plural(count, "item")} mention changes since earlier notes or appointments.`,
    medication_note: `${count} reviewed medication ${plural(count, "note")} may be useful to confirm at the appointment.`,
    functional_impact: `${count} reviewed ${plural(count, "item")} describe day-to-day impact to discuss with the clinician.`,
    appointment_question: `${count} reviewed question ${plural(count, "item")} can help focus the appointment conversation.`,
    source_gap: "A source gap may need review before it is used in a brief."
  };
  return summaries[kind];
}

function safetyLabelForKind(kind: PatternCardKind): PatternCardSafetyLabel {
  if (kind === "source_gap") {
    return "needs_review";
  }

  return kind === "appointment_question" ? "appointment_hypothesis" : "possible_pattern_to_discuss";
}

function plural(count: number, word: string): string {
  return count === 1 ? word : `${word}s`;
}

function average(values: number[]): number {
  if (values.length === 0) {
    return 0.55;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function safePatternText(text: unknown, fallback: string): string {
  if (typeof text !== "string" || !text.trim() || FORBIDDEN_PATTERN_LANGUAGE.test(text)) {
    return fallback;
  }

  return text.trim();
}

function isPatternKind(value: unknown): value is PatternCardKind {
  return typeof value === "string" && ["repeated_symptom", "recent_change", "medication_note", "functional_impact", "appointment_question", "source_gap"].includes(value);
}

function isSafetyLabel(value: unknown): value is PatternCardSafetyLabel {
  return typeof value === "string" && ["possible_pattern_to_discuss", "seen_in_notes", "needs_review", "appointment_hypothesis"].includes(value);
}

export const patternServiceTestInternals = {
  FORBIDDEN_PATTERN_LANGUAGE
};
