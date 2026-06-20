import type { AppointmentBrief, BriefType, CaseMode, ClinicCaseSnapshot, DeleteCaseReceipt, DocumentType, ExtractedFact, HealthDocument, RehearsalSession, SourcePreview, TimelineEvent } from "./clinic";
import type { MissingQuestion, RehearsalMode, RehearsalSuggestedFactUpdate } from "./extraction";
import type { GuidedIntakeCaptureMethod, PatternCard } from "./live-flow";
import type { RuntimeReadiness } from "./runtime";

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

export type CreateCaseInitialSource = {
  text: string;
  sourceLabel?: string;
  captureMethod: Extract<GuidedIntakeCaptureMethod, "typed" | "pasted" | "browser_speech_transcript">;
  userReviewed: true;
  storesAudio: false;
};

export type CreateCaseWithInitialSourceRequest = CreateCaseRequest & {
  initialSource?: CreateCaseInitialSource;
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

export type ListPatternCardsResponse = {
  patternCards: PatternCard[];
};

export type GeneratePatternCardsResponse = {
  patternCards: PatternCard[];
};

export type UpdatePatternCardRequest = {
  suggestedBriefText?: string;
  userStatus: PatternCard["userStatus"];
};

export type UpdatePatternCardResponse = {
  patternCard: PatternCard;
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
  mode: RehearsalMode;
};

export type RehearsalMessageResponse = {
  sessionId: string;
  session: RehearsalSession;
  assistantMessage: string;
  blocked?: boolean;
  suggestedFactUpdates?: RehearsalSuggestedFactUpdate[];
};

export type DeleteCaseResponse = DeleteCaseReceipt;

export type SystemReadinessResponse = RuntimeReadiness;
