import { preopCase } from "@clinicbrief/fixtures";
import type { AppointmentBrief, ClinicCaseSnapshot, ExtractedFact, HealthDocument, MissingQuestion, SourcePreview } from "@clinicbrief/types";

export function cloneClinicData<T>(value: T): T {
  return structuredClone(value);
}

export function createFixtureFactsForCase(caseId: string, documentId?: string): ExtractedFact[] {
  const now = new Date().toISOString();

  return preopCase.expectedFacts.map((fact) => ({
    ...cloneClinicData(fact),
    id: `${fact.id}-${caseId}`,
    caseId,
    sourceDocId: documentId ?? fact.sourceDocId,
    userStatus: "UNREVIEWED",
    createdAt: now
  }));
}

export function createFixtureQuestions(): MissingQuestion[] {
  return cloneClinicData(preopCase.expectedQuestions);
}

export function makeSourcePreview(input: {
  document: HealthDocument;
  snippet: string;
  confidence: number;
  parser: SourcePreview["parser"];
  needsManualFallback: boolean;
}): SourcePreview {
  const now = new Date().toISOString();

  return {
    id: `source-${input.document.id}`,
    sourceId: input.document.id,
    sourceType: input.document.type,
    documentId: input.document.id,
    snippet: input.snippet,
    confidence: input.confidence,
    parser: input.parser,
    needsManualFallback: input.needsManualFallback,
    metadata: input.document.metadata,
    createdAt: now
  };
}

export function createFixtureRecord(): ClinicCaseSnapshot {
  const sourcePreviews = preopCase.documents.map((document) =>
    makeSourcePreview({
      document,
      snippet: document.rawText ?? "Synthetic fixture source.",
      confidence: 1,
      parser: "fixture",
      needsManualFallback: false
    })
  );
  const createdAt = preopCase.documents[0]?.createdAt ?? new Date().toISOString();
  const brief: AppointmentBrief = {
    id: "brief-sample-preop",
    caseId: preopCase.id,
    briefType: "PREOP",
    title: preopCase.expectedBrief.title,
    briefJson: cloneClinicData(preopCase.expectedBrief),
    markdown: "",
    createdAt
  };

  return {
    id: preopCase.id,
    title: preopCase.title,
    mode: "PREOP",
    status: "EXTRACTED",
    consentAccepted: true,
    consentedAt: createdAt,
    documents: cloneClinicData(preopCase.documents),
    sourcePreviews,
    facts: cloneClinicData(preopCase.expectedFacts),
    questions: cloneClinicData(preopCase.expectedQuestions),
    timeline: cloneClinicData(preopCase.expectedTimeline),
    medications: [],
    symptoms: [],
    appointments: [],
    briefs: [brief],
    rehearsals: [],
    createdAt,
    updatedAt: createdAt
  };
}
