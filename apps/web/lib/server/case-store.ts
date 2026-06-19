import { preopCase } from "@clinicbrief/fixtures";
import type { CaseMode, CaseStatus, ExtractedFact, HealthDocument, MissingQuestion, SourcePreview } from "@clinicbrief/types";

type CaseRecord = {
  id: string;
  title: string;
  mode: CaseMode;
  status: CaseStatus;
  consentAccepted: boolean;
  documents: HealthDocument[];
  sourcePreviews: SourcePreview[];
  facts: ExtractedFact[];
  questions: MissingQuestion[];
  createdAt: string;
};

declare global {
  // eslint-disable-next-line no-var
  var clinicBriefCaseStore: Map<string, CaseRecord> | undefined;
}

const store = globalThis.clinicBriefCaseStore ?? new Map<string, CaseRecord>();
globalThis.clinicBriefCaseStore = store;

export function createCase(input: { title: string; mode: CaseMode }): CaseRecord {
  const now = new Date().toISOString();
  const id = crypto.randomUUID();
  const record: CaseRecord = {
    id,
    title: input.title,
    mode: input.mode,
    status: "CONSENTED",
    consentAccepted: true,
    documents: [],
    sourcePreviews: [],
    facts: [],
    questions: [],
    createdAt: now
  };

  store.set(id, record);
  return record;
}

export function getCase(caseId: string): CaseRecord | null {
  if (caseId === preopCase.id) {
    return createFixtureRecord();
  }

  return store.get(caseId) ?? null;
}

export function addDocument(caseId: string, document: HealthDocument, sourcePreview: SourcePreview): CaseRecord | null {
  const record = store.get(caseId);

  if (!record || !record.consentAccepted) {
    return null;
  }

  record.documents = [document, ...record.documents];
  record.sourcePreviews = [sourcePreview, ...record.sourcePreviews];
  record.status = "INTAKE_STARTED";
  return record;
}

export function setExtraction(caseId: string, facts: ExtractedFact[], questions: MissingQuestion[]): CaseRecord | null {
  const record = store.get(caseId);

  if (!record) {
    return null;
  }

  record.facts = facts;
  record.questions = questions;
  record.status = "EXTRACTED";
  return record;
}

export function updateFact(caseId: string, factId: string, input: { displayText?: string; userStatus: ExtractedFact["userStatus"] }): ExtractedFact | null {
  const record = store.get(caseId);

  if (!record) {
    return null;
  }

  const fact = record.facts.find((item) => item.id === factId);

  if (!fact) {
    return null;
  }

  fact.userStatus = input.userStatus;

  if (input.displayText?.trim()) {
    fact.displayText = input.displayText.trim();
  }

  return fact;
}

export function createFixtureFactsForCase(caseId: string, documentId?: string): ExtractedFact[] {
  const now = new Date().toISOString();

  return preopCase.expectedFacts.map((fact) => ({
    ...fact,
    id: `${fact.id}-${caseId}`,
    caseId,
    sourceDocId: documentId ?? fact.sourceDocId,
    userStatus: "UNREVIEWED",
    createdAt: now
  }));
}

export function createFixtureQuestions(): MissingQuestion[] {
  return preopCase.expectedQuestions;
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
    createdAt: now
  };
}

function createFixtureRecord(): CaseRecord {
  const sourcePreviews = preopCase.documents.map((document) =>
    makeSourcePreview({
      document,
      snippet: document.rawText ?? "Synthetic fixture source.",
      confidence: 1,
      parser: "fixture",
      needsManualFallback: false
    })
  );

  return {
    id: preopCase.id,
    title: preopCase.title,
    mode: "PREOP",
    status: "EXTRACTED",
    consentAccepted: true,
    documents: preopCase.documents,
    sourcePreviews,
    facts: preopCase.expectedFacts,
    questions: preopCase.expectedQuestions,
    createdAt: preopCase.documents[0]?.createdAt ?? new Date().toISOString()
  };
}
