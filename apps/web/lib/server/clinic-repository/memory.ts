import { preopCase } from "@clinicbrief/fixtures";
import type { AppointmentBrief, ClinicCaseSnapshot, DeleteCaseReceipt, ExtractedFact, HealthDocument, MissingQuestion, RehearsalMessage, RehearsalSession, SourcePreview, TimelineEvent } from "@clinicbrief/types";

import { cloneClinicData, createFixtureRecord } from "./factories";
import type { ClinicRepository, CreateCaseInput, CreateRehearsalSessionInput, SaveBriefInput, UpdateFactInput } from "./types";

declare global {
  // eslint-disable-next-line no-var
  var clinicBriefCaseStore: Map<string, ClinicCaseSnapshot> | undefined;
}

const store = globalThis.clinicBriefCaseStore ?? new Map<string, ClinicCaseSnapshot>();
globalThis.clinicBriefCaseStore = store;

export function createMemoryClinicRepository(): ClinicRepository {
  return new MemoryClinicRepository(store);
}

export class MemoryClinicRepository implements ClinicRepository {
  readonly backend = "memory" as const;

  constructor(private readonly cases: Map<string, ClinicCaseSnapshot> = new Map<string, ClinicCaseSnapshot>()) {}

  async createCase(input: CreateCaseInput): Promise<ClinicCaseSnapshot> {
    const now = new Date().toISOString();
    const consentedAt = input.consentedAt ?? now;
    const record: ClinicCaseSnapshot = {
      id: crypto.randomUUID(),
      title: input.title,
      mode: input.mode,
      status: "CONSENTED",
      consentAccepted: true,
      consentedAt,
      anonymousUserId: input.anonymousUserId,
      documents: [],
      sourcePreviews: [],
      facts: [],
      questions: [],
      timeline: [],
      medications: [],
      symptoms: [],
      appointments: [],
      briefs: [],
      rehearsals: [],
      createdAt: now,
      updatedAt: now
    };

    this.cases.set(record.id, record);
    return cloneClinicData(record);
  }

  async getCase(caseId: string): Promise<ClinicCaseSnapshot | null> {
    if (caseId === preopCase.id) {
      return createFixtureRecord();
    }

    const record = this.cases.get(caseId);
    return record ? cloneClinicData(record) : null;
  }

  async addDocument(caseId: string, document: HealthDocument, sourcePreview: SourcePreview): Promise<ClinicCaseSnapshot | null> {
    const record = this.getWritableCase(caseId);

    if (!record) {
      return null;
    }

    record.documents = [cloneClinicData(document), ...record.documents];
    record.sourcePreviews = [cloneClinicData(sourcePreview), ...record.sourcePreviews];
    record.status = "INTAKE_STARTED";
    record.updatedAt = new Date().toISOString();
    return cloneClinicData(record);
  }

  async setExtraction(caseId: string, facts: ExtractedFact[], questions: MissingQuestion[]): Promise<ClinicCaseSnapshot | null> {
    const record = this.getWritableCase(caseId);

    if (!record) {
      return null;
    }

    record.facts = cloneClinicData(facts);
    record.questions = cloneClinicData(questions);
    record.status = "EXTRACTED";
    record.updatedAt = new Date().toISOString();
    return cloneClinicData(record);
  }

  async updateFact(caseId: string, factId: string, input: UpdateFactInput): Promise<ExtractedFact | null> {
    const record = this.getWritableCase(caseId);

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

    record.status = "REVIEWED";
    record.updatedAt = new Date().toISOString();
    return cloneClinicData(fact);
  }

  async replaceTimeline(caseId: string, events: TimelineEvent[]): Promise<TimelineEvent[] | null> {
    const record = this.getWritableCase(caseId);

    if (!record) {
      return null;
    }

    record.timeline = cloneClinicData(events);
    record.updatedAt = new Date().toISOString();
    return cloneClinicData(record.timeline);
  }

  async saveBrief(caseId: string, input: SaveBriefInput): Promise<AppointmentBrief | null> {
    const record = this.getWritableCase(caseId);

    if (!record) {
      return null;
    }

    const now = new Date().toISOString();
    const brief: AppointmentBrief = {
      id: input.id ?? crypto.randomUUID(),
      caseId,
      briefType: input.briefType,
      title: input.title,
      briefJson: cloneClinicData(input.briefJson),
      markdown: input.markdown,
      pdfUrl: input.pdfUrl,
      createdAt: now
    };

    record.briefs = [brief, ...record.briefs.filter((item) => item.id !== brief.id)];
    record.status = "BRIEF_GENERATED";
    record.updatedAt = now;
    return cloneClinicData(brief);
  }

  async createRehearsalSession(caseId: string, input: CreateRehearsalSessionInput): Promise<RehearsalSession | null> {
    const record = this.getWritableCase(caseId);

    if (!record) {
      return null;
    }

    const now = new Date().toISOString();
    const session: RehearsalSession = {
      id: input.id ?? crypto.randomUUID(),
      caseId,
      mode: input.mode,
      messages: cloneClinicData(input.messages ?? []),
      createdAt: now
    };

    record.rehearsals = [session, ...record.rehearsals.filter((item) => item.id !== session.id)];
    record.updatedAt = now;
    return cloneClinicData(session);
  }

  async appendRehearsalMessage(caseId: string, sessionId: string, message: RehearsalMessage): Promise<RehearsalSession | null> {
    const record = this.getWritableCase(caseId);

    if (!record) {
      return null;
    }

    const session = record.rehearsals.find((item) => item.id === sessionId);

    if (!session) {
      return null;
    }

    session.messages = [...session.messages, cloneClinicData(message)];
    record.updatedAt = new Date().toISOString();
    return cloneClinicData(session);
  }

  async deleteCase(caseId: string): Promise<DeleteCaseReceipt> {
    if (caseId === preopCase.id) {
      return {
        status: "DELETED",
        deleted: true,
        recordsMarkedDeleted: 0,
        filesRemoved: 0,
        storageAction: "synthetic_fixture_no_private_files"
      };
    }

    const record = this.cases.get(caseId);

    if (!record) {
      return {
        status: "DELETED",
        deleted: false,
        recordsMarkedDeleted: 0,
        filesRemoved: 0,
        storageAction: "case_not_found"
      };
    }

    record.status = "DELETED";
    record.deletedAt = new Date().toISOString();
    record.updatedAt = record.deletedAt;
    this.cases.delete(caseId);

    return {
      status: "DELETED",
      deleted: true,
      recordsMarkedDeleted: 1,
      filesRemoved: 0,
      storageAction: "mark_deleted_until_storage_is_configured"
    };
  }

  private getWritableCase(caseId: string): ClinicCaseSnapshot | null {
    if (caseId === preopCase.id) {
      return null;
    }

    const record = this.cases.get(caseId);

    if (!record || !record.consentAccepted || record.status === "DELETED") {
      return null;
    }

    return record;
  }
}
