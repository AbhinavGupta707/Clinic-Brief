import { createClinicPrismaClient, type PrismaClientLike } from "@clinicbrief/db";
import { preopCase } from "@clinicbrief/fixtures";
import type {
  Appointment,
  AppointmentBrief,
  BriefType,
  ClinicBriefOutput,
  ClinicCaseSnapshot,
  DeleteCaseReceipt,
  ExtractedFact,
  HealthDocument,
  Medication,
  MissingQuestion,
  RehearsalMessage,
  RehearsalSession,
  SourcePreview,
  SymptomLog,
  TimelineEvent
} from "@clinicbrief/types";

import { createFixtureRecord } from "./factories";
import type { ClinicRepository, CreateCaseInput, CreateRehearsalSessionInput, SaveBriefInput, UpdateFactInput } from "./types";

type Delegate = {
  create(args: Record<string, unknown>): Promise<unknown>;
  createMany(args: Record<string, unknown>): Promise<unknown>;
  delete(args: Record<string, unknown>): Promise<unknown>;
  deleteMany(args: Record<string, unknown>): Promise<unknown>;
  findUnique(args: Record<string, unknown>): Promise<unknown>;
  update(args: Record<string, unknown>): Promise<unknown>;
};

type PrismaClinicClient = PrismaClientLike & {
  patientCase: Delegate;
  healthDocument: Delegate;
  sourcePreview: Delegate;
  extractedFact: Delegate;
  missingQuestion: Delegate;
  timelineEvent: Delegate;
  appointmentBrief: Delegate;
  rehearsalSession: Delegate;
};

const caseInclude = {
  documents: true,
  sourcePreviews: true,
  facts: true,
  questions: true,
  timeline: true,
  medications: true,
  symptoms: true,
  appointments: true,
  briefs: true,
  rehearsals: true
};

export async function createPrismaClinicRepository(): Promise<ClinicRepository> {
  const prisma = (await createClinicPrismaClient()) as PrismaClinicClient;
  return new PrismaClinicRepository(prisma);
}

export class PrismaClinicRepository implements ClinicRepository {
  readonly backend = "prisma" as const;

  constructor(private readonly prisma: PrismaClinicClient) {}

  async createCase(input: CreateCaseInput): Promise<ClinicCaseSnapshot> {
    const consentedAt = input.consentedAt ?? new Date().toISOString();
    const record = await this.prisma.patientCase.create({
      data: {
        title: input.title,
        mode: input.mode,
        status: "CONSENTED",
        consentedAt: new Date(consentedAt),
        anonymousUserId: input.anonymousUserId
      },
      include: caseInclude
    });

    return mapCaseRecord(record);
  }

  async getCase(caseId: string): Promise<ClinicCaseSnapshot | null> {
    if (caseId === preopCase.id) {
      return createFixtureRecord();
    }

    const record = await this.prisma.patientCase.findUnique({
      where: { id: caseId },
      include: caseInclude
    });

    return record ? mapCaseRecord(record) : null;
  }

  async addDocument(caseId: string, document: HealthDocument, sourcePreview: SourcePreview): Promise<ClinicCaseSnapshot | null> {
    const record = await this.getWritableCase(caseId);

    if (!record) {
      return null;
    }

    await this.prisma.healthDocument.create({
      data: {
        id: document.id,
        caseId,
        type: document.type,
        fileName: document.fileName,
        fileUrl: document.fileUrl,
        rawText: document.rawText,
        sourceHash: document.sourceHash,
        createdAt: toDate(document.createdAt)
      }
    });
    await this.prisma.sourcePreview.create({
      data: {
        id: sourcePreview.id,
        caseId,
        sourceId: sourcePreview.sourceId,
        sourceType: sourcePreview.sourceType,
        documentId: sourcePreview.documentId,
        snippet: sourcePreview.snippet,
        confidence: sourcePreview.confidence,
        parser: sourcePreview.parser,
        needsManualFallback: sourcePreview.needsManualFallback,
        createdAt: toDate(sourcePreview.createdAt)
      }
    });
    await this.prisma.patientCase.update({
      where: { id: caseId },
      data: { status: "INTAKE_STARTED" }
    });

    return this.getCase(caseId);
  }

  async setExtraction(caseId: string, facts: ExtractedFact[], questions: MissingQuestion[]): Promise<ClinicCaseSnapshot | null> {
    const record = await this.getWritableCase(caseId);

    if (!record) {
      return null;
    }

    await this.prisma.extractedFact.deleteMany({ where: { caseId } });
    await this.prisma.missingQuestion.deleteMany({ where: { caseId } });
    await this.prisma.extractedFact.createMany({
      data: facts.map((fact) => ({
        id: fact.id,
        caseId,
        sourceDocId: fact.sourceDocId,
        category: fact.category,
        displayText: fact.displayText,
        value: fact.value,
        confidence: fact.confidence,
        userStatus: fact.userStatus,
        sourceQuote: fact.sourceQuote,
        createdAt: toDate(fact.createdAt)
      }))
    });
    await this.prisma.missingQuestion.createMany({
      data: questions.map((question) => ({
        id: question.id,
        caseId,
        priority: question.priority,
        question: question.question,
        whyItMattersForAppointment: question.whyItMattersForAppointment,
        answerType: question.answerType
      }))
    });
    await this.prisma.patientCase.update({
      where: { id: caseId },
      data: { status: "EXTRACTED" }
    });

    return this.getCase(caseId);
  }

  async updateFact(caseId: string, factId: string, input: UpdateFactInput): Promise<ExtractedFact | null> {
    const record = await this.getWritableCase(caseId);

    if (!record) {
      return null;
    }

    const fact = await this.prisma.extractedFact.update({
      where: { id: factId },
      data: {
        userStatus: input.userStatus,
        ...(input.displayText?.trim() ? { displayText: input.displayText.trim() } : {})
      }
    });
    await this.prisma.patientCase.update({
      where: { id: caseId },
      data: { status: "REVIEWED" }
    });

    return mapFact(fact);
  }

  async replaceTimeline(caseId: string, events: TimelineEvent[]): Promise<TimelineEvent[] | null> {
    const record = await this.getWritableCase(caseId);

    if (!record) {
      return null;
    }

    await this.prisma.timelineEvent.deleteMany({ where: { caseId } });
    await this.prisma.timelineEvent.createMany({
      data: events.map((event) => ({
        id: event.id,
        caseId,
        date: event.date ? new Date(event.date) : undefined,
        approximateDate: event.approximateDate,
        type: event.type,
        title: event.title,
        description: event.description,
        sourceFactIds: event.sourceFactIds,
        createdAt: toDate(event.createdAt)
      }))
    });
    await this.prisma.patientCase.update({
      where: { id: caseId },
      data: {}
    });
    const refreshed = await this.getCase(caseId);
    return refreshed?.timeline ?? null;
  }

  async saveBrief(caseId: string, input: SaveBriefInput): Promise<AppointmentBrief | null> {
    const record = await this.getWritableCase(caseId);

    if (!record) {
      return null;
    }

    const id = input.id ?? crypto.randomUUID();
    await this.prisma.appointmentBrief.deleteMany({ where: { id } });
    const brief = await this.prisma.appointmentBrief.create({
      data: {
        id,
        caseId,
        briefType: input.briefType,
        title: input.title,
        briefJson: input.briefJson,
        markdown: input.markdown,
        pdfUrl: input.pdfUrl
      }
    });
    await this.prisma.patientCase.update({
      where: { id: caseId },
      data: { status: "BRIEF_GENERATED" }
    });

    return mapBrief(brief);
  }

  async createRehearsalSession(caseId: string, input: CreateRehearsalSessionInput): Promise<RehearsalSession | null> {
    const record = await this.getWritableCase(caseId);

    if (!record) {
      return null;
    }

    const session = await this.prisma.rehearsalSession.create({
      data: {
        id: input.id ?? crypto.randomUUID(),
        caseId,
        mode: input.mode,
        messages: input.messages ?? []
      }
    });

    return mapRehearsal(session);
  }

  async appendRehearsalMessage(caseId: string, sessionId: string, message: RehearsalMessage): Promise<RehearsalSession | null> {
    const record = await this.getWritableCase(caseId);

    if (!record) {
      return null;
    }

    const current = await this.prisma.rehearsalSession.findUnique({ where: { id: sessionId } });

    if (!current) {
      return null;
    }

    const session = mapRehearsal(current);
    const updated = await this.prisma.rehearsalSession.update({
      where: { id: sessionId },
      data: { messages: [...session.messages, message] }
    });

    return mapRehearsal(updated);
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

    const record = await this.prisma.patientCase.findUnique({ where: { id: caseId } });

    if (!record) {
      return {
        status: "DELETED",
        deleted: false,
        recordsMarkedDeleted: 0,
        filesRemoved: 0,
        storageAction: "case_not_found"
      };
    }

    await this.prisma.patientCase.delete({ where: { id: caseId } });

    return {
      status: "DELETED",
      deleted: true,
      recordsMarkedDeleted: 1,
      filesRemoved: 0,
      storageAction: "deleted_db_rows_and_requested_private_file_cleanup"
    };
  }

  private async getWritableCase(caseId: string): Promise<ClinicCaseSnapshot | null> {
    if (caseId === preopCase.id) {
      return null;
    }

    const record = await this.getCase(caseId);

    if (!record || !record.consentAccepted || record.status === "DELETED") {
      return null;
    }

    return record;
  }
}

function mapCaseRecord(raw: unknown): ClinicCaseSnapshot {
  const record = raw as Record<string, unknown>;
  const consentedAt = toIso(record.consentedAt);

  return {
    id: String(record.id),
    title: String(record.title),
    mode: record.mode as ClinicCaseSnapshot["mode"],
    status: record.status as ClinicCaseSnapshot["status"],
    consentAccepted: Boolean(consentedAt),
    consentedAt,
    anonymousUserId: optionalString(record.anonymousUserId),
    documents: asArray(record.documents).map(mapDocument),
    sourcePreviews: asArray(record.sourcePreviews).map(mapSourcePreview),
    facts: asArray(record.facts).map(mapFact),
    questions: asArray(record.questions).map(mapQuestion),
    timeline: asArray(record.timeline).map(mapTimelineEvent),
    medications: asArray(record.medications).map(mapMedication),
    symptoms: asArray(record.symptoms).map(mapSymptom),
    appointments: asArray(record.appointments).map(mapAppointment),
    briefs: asArray(record.briefs).map(mapBrief),
    rehearsals: asArray(record.rehearsals).map(mapRehearsal),
    createdAt: toIso(record.createdAt) ?? new Date().toISOString(),
    updatedAt: toIso(record.updatedAt)
  };
}

function mapDocument(raw: unknown): HealthDocument {
  const document = raw as Record<string, unknown>;

  return {
    id: String(document.id),
    caseId: String(document.caseId),
    type: document.type as HealthDocument["type"],
    fileName: String(document.fileName),
    fileUrl: optionalString(document.fileUrl),
    rawText: optionalString(document.rawText),
    sourceHash: optionalString(document.sourceHash),
    createdAt: toIso(document.createdAt) ?? new Date().toISOString()
  };
}

function mapSourcePreview(raw: unknown): SourcePreview {
  const source = raw as Record<string, unknown>;

  return {
    id: String(source.id),
    sourceId: String(source.sourceId),
    sourceType: source.sourceType as SourcePreview["sourceType"],
    documentId: String(source.documentId),
    snippet: String(source.snippet),
    confidence: Number(source.confidence),
    parser: asParser(source.parser),
    needsManualFallback: Boolean(source.needsManualFallback),
    createdAt: toIso(source.createdAt) ?? new Date().toISOString()
  };
}

function mapFact(raw: unknown): ExtractedFact {
  const fact = raw as Record<string, unknown>;

  return {
    id: String(fact.id),
    caseId: String(fact.caseId),
    sourceDocId: optionalString(fact.sourceDocId),
    category: fact.category as ExtractedFact["category"],
    displayText: String(fact.displayText),
    value: asRecord(fact.value),
    confidence: Number(fact.confidence),
    userStatus: fact.userStatus as ExtractedFact["userStatus"],
    sourceQuote: optionalString(fact.sourceQuote),
    createdAt: toIso(fact.createdAt) ?? new Date().toISOString()
  };
}

function mapQuestion(raw: unknown): MissingQuestion {
  const question = raw as Record<string, unknown>;

  return {
    id: String(question.id),
    priority: question.priority as MissingQuestion["priority"],
    question: String(question.question),
    whyItMattersForAppointment: String(question.whyItMattersForAppointment),
    answerType: question.answerType as MissingQuestion["answerType"]
  };
}

function mapTimelineEvent(raw: unknown): TimelineEvent {
  const event = raw as Record<string, unknown>;

  return {
    id: String(event.id),
    caseId: String(event.caseId),
    date: toIso(event.date),
    approximateDate: optionalString(event.approximateDate),
    type: event.type as TimelineEvent["type"],
    title: String(event.title),
    description: String(event.description),
    sourceFactIds: asStringArray(event.sourceFactIds),
    createdAt: toIso(event.createdAt) ?? new Date().toISOString()
  };
}

function mapMedication(raw: unknown): Medication {
  const medication = raw as Record<string, unknown>;

  return {
    id: String(medication.id),
    caseId: String(medication.caseId),
    name: String(medication.name),
    dose: optionalString(medication.dose),
    frequency: optionalString(medication.frequency),
    startDate: toIso(medication.startDate),
    endDate: toIso(medication.endDate),
    status: optionalString(medication.status),
    sourceFactIds: asStringArray(medication.sourceFactIds)
  };
}

function mapSymptom(raw: unknown): SymptomLog {
  const symptom = raw as Record<string, unknown>;

  return {
    id: String(symptom.id),
    caseId: String(symptom.caseId),
    symptom: String(symptom.symptom),
    date: toIso(symptom.date),
    severity: typeof symptom.severity === "number" ? symptom.severity : undefined,
    notes: optionalString(symptom.notes)
  };
}

function mapAppointment(raw: unknown): Appointment {
  const appointment = raw as Record<string, unknown>;

  return {
    id: String(appointment.id),
    caseId: String(appointment.caseId),
    date: toIso(appointment.date),
    type: String(appointment.type),
    clinician: optionalString(appointment.clinician),
    goal: optionalString(appointment.goal),
    questions: Array.isArray(appointment.questions) ? appointment.questions.map(mapQuestion) : undefined
  };
}

function mapBrief(raw: unknown): AppointmentBrief {
  const brief = raw as Record<string, unknown>;

  return {
    id: String(brief.id),
    caseId: String(brief.caseId),
    briefType: brief.briefType as BriefType,
    title: String(brief.title),
    briefJson: brief.briefJson as ClinicBriefOutput,
    markdown: String(brief.markdown),
    pdfUrl: optionalString(brief.pdfUrl),
    createdAt: toIso(brief.createdAt) ?? new Date().toISOString()
  };
}

function mapRehearsal(raw: unknown): RehearsalSession {
  const session = raw as Record<string, unknown>;

  return {
    id: String(session.id),
    caseId: String(session.caseId),
    mode: String(session.mode),
    messages: Array.isArray(session.messages) ? session.messages.map(mapRehearsalMessage) : [],
    createdAt: toIso(session.createdAt) ?? new Date().toISOString()
  };
}

function mapRehearsalMessage(raw: unknown): RehearsalMessage {
  const message = raw as Record<string, unknown>;

  return {
    id: String(message.id),
    role: message.role as RehearsalMessage["role"],
    content: String(message.content),
    createdAt: toIso(message.createdAt) ?? new Date().toISOString()
  };
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function asStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }

  return value.filter((item): item is string => typeof item === "string");
}

function asParser(value: unknown): SourcePreview["parser"] {
  return value === "pdf" || value === "image" || value === "text" || value === "fixture" ? value : "text";
}

function optionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function toIso(value: unknown): string | undefined {
  if (value instanceof Date) {
    return value.toISOString();
  }

  return typeof value === "string" && value.length > 0 ? new Date(value).toISOString() : undefined;
}

function toDate(value: string | undefined): Date | undefined {
  return value ? new Date(value) : undefined;
}
