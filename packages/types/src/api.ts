export type ApiError = {
  code: string;
  message: string;
};

export type ApiResponse<T> = {
  ok: boolean;
  data?: T;
  error?: ApiError;
};

export type CreateCaseRequest = {
  title: string;
  mode: CaseMode;
  consent: true;
};

export type CreateCaseResponse = {
  caseId: string;
};

export type AddDocumentRequest = {
  type: Exclude<DocumentType, "SAMPLE">;
  fileName?: string;
  text?: string;
};

export type AddDocumentResponse = {
  document: HealthDocument;
  sourcePreview: SourcePreview;
};

export type ListDocumentsResponse = {
  documents: HealthDocument[];
  sourcePreviews: SourcePreview[];
};

export type ExtractCaseRequest = {
  request?: string;
};

export type ExtractCaseResponse = {
  facts: ExtractedFact[];
  questions: MissingQuestion[];
  source: "fireworks" | "fixture";
  safetyRedirect?: string;
};

export type UpdateFactRequest = {
  displayText?: string;
  userStatus: ExtractedFact["userStatus"];
};

export type UpdateFactResponse = {
  fact: ExtractedFact;
};

import type { CaseMode, DocumentType, ExtractedFact, HealthDocument, SourcePreview } from "./clinic";
import type { MissingQuestion } from "./extraction";
