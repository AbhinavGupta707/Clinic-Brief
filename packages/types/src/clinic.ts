export type CaseMode = "PREOP" | "CHRONIC" | "CARER" | "GENERAL";

export type CaseStatus =
  | "CREATED"
  | "CONSENTED"
  | "INTAKE_STARTED"
  | "EXTRACTED"
  | "REVIEWED"
  | "BRIEF_GENERATED"
  | "EXPORTED"
  | "DELETED";

export type DocumentType = "PDF" | "IMAGE" | "TEXT_NOTE" | "VOICE_TRANSCRIPT" | "SAMPLE";

export type FactCategory =
  | "MEDICATION"
  | "ALLERGY"
  | "SYMPTOM"
  | "APPOINTMENT"
  | "TEST_RESULT"
  | "PROCEDURE"
  | "HISTORY_ITEM"
  | "QUESTION"
  | "CONTACT";

export type ReviewStatus = "UNREVIEWED" | "CONFIRMED" | "EDITED" | "REJECTED";

export type TimelineEventType = "SYMPTOM_CHANGE" | "MEDICATION_CHANGE" | "APPOINTMENT" | "TEST" | "PROCEDURE" | "NOTE";

export type BriefType = "GP" | "CONSULTANT" | "PREOP" | "FAMILY_HANDOFF" | "NINETY_SECOND_STORY";

export type HealthDocument = {
  id: string;
  caseId: string;
  type: DocumentType;
  fileName: string;
  fileUrl?: string;
  rawText?: string;
  sourceHash?: string;
  createdAt: string;
};

export type ExtractedFact = {
  id: string;
  caseId: string;
  sourceDocId?: string;
  category: FactCategory;
  displayText: string;
  value: Record<string, unknown>;
  confidence: number;
  userStatus: ReviewStatus;
  sourceQuote?: string;
  createdAt: string;
};

export type TimelineEvent = {
  id: string;
  caseId: string;
  date?: string;
  approximateDate?: string;
  type: TimelineEventType;
  title: string;
  description: string;
  sourceFactIds?: string[];
  createdAt: string;
};
