import type { ClinicBriefOutput, MissingQuestion } from "./extraction";

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

export type PatientCase = {
  id: string;
  title: string;
  mode: CaseMode;
  status: CaseStatus;
  consentedAt?: string;
  anonymousUserId?: string;
  createdAt: string;
  updatedAt?: string;
};

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

export type SourcePreview = {
  id: string;
  sourceId: string;
  sourceType: DocumentType;
  documentId: string;
  snippet: string;
  confidence: number;
  parser: "pdf" | "image" | "text" | "fixture";
  needsManualFallback: boolean;
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

export type Medication = {
  id: string;
  caseId: string;
  name: string;
  dose?: string;
  frequency?: string;
  startDate?: string;
  endDate?: string;
  status?: string;
  sourceFactIds?: string[];
};

export type SymptomLog = {
  id: string;
  caseId: string;
  symptom: string;
  date?: string;
  severity?: number;
  notes?: string;
};

export type Appointment = {
  id: string;
  caseId: string;
  date?: string;
  type: string;
  clinician?: string;
  goal?: string;
  questions?: MissingQuestion[];
};

export type AppointmentBrief = {
  id: string;
  caseId: string;
  briefType: BriefType;
  title: string;
  briefJson: ClinicBriefOutput;
  markdown: string;
  pdfUrl?: string;
  createdAt: string;
};

export type RehearsalMessage = {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  createdAt: string;
};

export type RehearsalSession = {
  id: string;
  caseId: string;
  mode: string;
  messages: RehearsalMessage[];
  createdAt: string;
};

export type ClinicCaseSnapshot = PatientCase & {
  consentAccepted: boolean;
  documents: HealthDocument[];
  sourcePreviews: SourcePreview[];
  facts: ExtractedFact[];
  questions: MissingQuestion[];
  timeline: TimelineEvent[];
  medications: Medication[];
  symptoms: SymptomLog[];
  appointments: Appointment[];
  briefs: AppointmentBrief[];
  rehearsals: RehearsalSession[];
  deletedAt?: string;
};

export type DeleteCaseReceipt = {
  status: CaseStatus;
  deleted: boolean;
  recordsMarkedDeleted: number;
  filesRemoved: number;
  storageAction: "synthetic_fixture_no_private_files" | "deleted_db_rows_and_requested_private_file_cleanup" | "mark_deleted_until_storage_is_configured" | "case_not_found";
};
