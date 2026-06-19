import type {
  AppointmentBrief,
  BriefType,
  CaseMode,
  ClinicCaseSnapshot,
  DeleteCaseReceipt,
  ExtractedFact,
  HealthDocument,
  MissingQuestion,
  RehearsalMessage,
  RehearsalSession,
  SourcePreview,
  TimelineEvent
} from "@clinicbrief/types";

export type ClinicRepositoryBackend = "memory" | "prisma";

export type CreateCaseInput = {
  title: string;
  mode: CaseMode;
  consentedAt?: string;
  anonymousUserId?: string;
};

export type UpdateFactInput = {
  displayText?: string;
  userStatus: ExtractedFact["userStatus"];
};

export type SaveBriefInput = {
  id?: string;
  briefType: BriefType;
  title: string;
  briefJson: AppointmentBrief["briefJson"];
  markdown: string;
  pdfUrl?: string;
};

export type CreateRehearsalSessionInput = {
  id?: string;
  mode: string;
  messages?: RehearsalMessage[];
};

export interface ClinicRepository {
  readonly backend: ClinicRepositoryBackend;
  createCase(input: CreateCaseInput): Promise<ClinicCaseSnapshot>;
  getCase(caseId: string): Promise<ClinicCaseSnapshot | null>;
  addDocument(caseId: string, document: HealthDocument, sourcePreview: SourcePreview): Promise<ClinicCaseSnapshot | null>;
  setExtraction(caseId: string, facts: ExtractedFact[], questions: MissingQuestion[]): Promise<ClinicCaseSnapshot | null>;
  updateFact(caseId: string, factId: string, input: UpdateFactInput): Promise<ExtractedFact | null>;
  replaceTimeline(caseId: string, events: TimelineEvent[]): Promise<TimelineEvent[] | null>;
  saveBrief(caseId: string, input: SaveBriefInput): Promise<AppointmentBrief | null>;
  createRehearsalSession(caseId: string, input: CreateRehearsalSessionInput): Promise<RehearsalSession | null>;
  appendRehearsalMessage(caseId: string, sessionId: string, message: RehearsalMessage): Promise<RehearsalSession | null>;
  deleteCase(caseId: string): Promise<DeleteCaseReceipt>;
}
