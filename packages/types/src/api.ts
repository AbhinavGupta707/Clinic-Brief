import type { AppointmentBrief, BriefType, CaseMode, ClinicCaseSnapshot, DeleteCaseReceipt, DocumentType, ExtractedFact, HealthDocument, RehearsalSession, SourcePreview, TimelineEvent } from "./clinic";
import type { MissingQuestion } from "./extraction";

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

export type GetCaseResponse = {
  case: ClinicCaseSnapshot;
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

export type RebuildTimelineResponse = {
  timeline: TimelineEvent[];
};

export type CreateBriefRequest = {
  briefType: BriefType;
  appointmentGoal?: string;
};

export type CreateBriefResponse = {
  briefId: string;
  brief: AppointmentBrief;
};

export type RehearsalMessageRequest = {
  sessionId?: string;
  message: string;
  mode: "PREOP_NURSE" | "CONSULTANT" | "GP";
};

export type RehearsalMessageResponse = {
  sessionId: string;
  session: RehearsalSession;
  assistantMessage: string;
  suggestedFactUpdates?: Array<Record<string, unknown>>;
};

export type DeleteCaseResponse = DeleteCaseReceipt;
