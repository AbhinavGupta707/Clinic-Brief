import { randomUUID } from "node:crypto";

import { preopCase } from "@clinicbrief/fixtures";
import type { ExtractedFact, HealthDocument, TimelineEvent } from "@clinicbrief/types";
import { describe, expect, it } from "vitest";

import { makeSourcePreview } from "./factories";
import { PrismaClinicRepository } from "./prisma";

type DbRecord = Record<string, unknown>;
type CreateArgs = { data: DbRecord; include?: unknown };
type CreateManyArgs = { data: DbRecord[] };
type FindArgs = { where: DbRecord; include?: unknown };
type UpdateArgs = { where: DbRecord; data: DbRecord; include?: unknown };
type DeleteArgs = { where: DbRecord };
type DeleteManyArgs = { where: DbRecord };

describe("PrismaClinicRepository", () => {
  it("maps Prisma records through the full repository flow without a live database", async () => {
    const repository = new PrismaClinicRepository(createFakePrismaClient());

    const sample = await repository.getCase(preopCase.id);
    expect(sample?.id).toBe(preopCase.id);
    expect(await repository.addDocument(preopCase.id, makeDocument(preopCase.id), makeSourcePreviewFor(makeDocument(preopCase.id)))).toBeNull();

    const created = await repository.createCase({ title: "Synthetic Prisma appointment", mode: "PREOP" });
    const document = makeDocument(created.id);
    const sourcePreview = makeSourcePreviewFor(document);

    const withDocument = await repository.addDocument(created.id, document, sourcePreview);
    expect(withDocument?.status).toBe("INTAKE_STARTED");
    expect(withDocument?.documents[0]?.id).toBe(document.id);
    expect(withDocument?.sourcePreviews[0]?.documentId).toBe(document.id);

    const fact = makeFact(created.id, document.id);
    const extracted = await repository.setExtraction(created.id, [fact], [preopCase.expectedQuestions[0]]);
    expect(extracted?.status).toBe("EXTRACTED");
    expect(extracted?.facts[0]?.displayText).toBe(fact.displayText);
    expect(extracted?.questions[0]?.id).toBe(preopCase.expectedQuestions[0]?.id);

    const updatedFact = await repository.updateFact(created.id, fact.id, {
      displayText: "Edited synthetic Prisma fact",
      userStatus: "EDITED"
    });
    expect(updatedFact?.displayText).toBe("Edited synthetic Prisma fact");
    expect(updatedFact?.userStatus).toBe("EDITED");

    const timelineEvent = makeTimelineEvent(created.id, fact.id);
    const timeline = await repository.replaceTimeline(created.id, [timelineEvent]);
    expect(timeline?.[0]?.sourceFactIds).toEqual([fact.id]);

    const brief = await repository.saveBrief(created.id, {
      briefType: "PREOP",
      title: preopCase.expectedBrief.title,
      briefJson: preopCase.expectedBrief,
      markdown: "# Synthetic Prisma pre-op brief"
    });
    expect(brief?.briefJson.safetyDisclaimer).toContain("does not diagnose");

    const session = await repository.createRehearsalSession(created.id, { mode: "PREOP_NURSE" });
    expect(session?.messages).toHaveLength(0);

    const appended = await repository.appendRehearsalMessage(created.id, session?.id ?? "", {
      id: "msg-synthetic-prisma-answer",
      role: "user",
      content: "Synthetic appointment rehearsal answer.",
      createdAt: "2026-06-19T00:00:00.000Z"
    });
    expect(appended?.messages).toHaveLength(1);

    const receipt = await repository.deleteCase(created.id);
    expect(receipt.deleted).toBe(true);
    expect(receipt.storageAction).toBe("deleted_db_rows_and_requested_private_file_cleanup");
    await expect(repository.getCase(created.id)).resolves.toBeNull();
  });
});

function createFakePrismaClient() {
  const state = {
    cases: new Map<string, DbRecord>(),
    documents: [] as DbRecord[],
    sourcePreviews: [] as DbRecord[],
    facts: [] as DbRecord[],
    questions: [] as DbRecord[],
    timeline: [] as DbRecord[],
    briefs: [] as DbRecord[],
    rehearsals: [] as DbRecord[]
  };

  function hydrateCase(id: string): DbRecord | null {
    const record = state.cases.get(id);

    if (!record) {
      return null;
    }

    return {
      ...record,
      documents: state.documents.filter((item) => item.caseId === id),
      sourcePreviews: state.sourcePreviews.filter((item) => item.caseId === id),
      facts: state.facts.filter((item) => item.caseId === id),
      questions: state.questions.filter((item) => item.caseId === id),
      timeline: state.timeline.filter((item) => item.caseId === id),
      medications: [],
      symptoms: [],
      appointments: [],
      briefs: state.briefs.filter((item) => item.caseId === id),
      rehearsals: state.rehearsals.filter((item) => item.caseId === id)
    };
  }

  function upsertCase(data: DbRecord): DbRecord {
    const id = String(data.id ?? randomUUID());
    const current = state.cases.get(id);
    const record = {
      id,
      createdAt: current?.createdAt ?? new Date("2026-06-19T00:00:00.000Z"),
      updatedAt: new Date("2026-06-19T00:00:00.000Z"),
      ...current,
      ...data
    };
    state.cases.set(id, record);
    return record;
  }

  function cascadeDelete(caseId: string) {
    state.cases.delete(caseId);
    state.documents = state.documents.filter((item) => item.caseId !== caseId);
    state.sourcePreviews = state.sourcePreviews.filter((item) => item.caseId !== caseId);
    state.facts = state.facts.filter((item) => item.caseId !== caseId);
    state.questions = state.questions.filter((item) => item.caseId !== caseId);
    state.timeline = state.timeline.filter((item) => item.caseId !== caseId);
    state.briefs = state.briefs.filter((item) => item.caseId !== caseId);
    state.rehearsals = state.rehearsals.filter((item) => item.caseId !== caseId);
  }

  return {
    $connect: async () => undefined,
    $disconnect: async () => undefined,
    patientCase: {
      create: async ({ data }: CreateArgs) => hydrateCase(String(upsertCase(data).id)),
      findUnique: async ({ where }: FindArgs) => hydrateCase(String(where.id)),
      update: async ({ where, data }: UpdateArgs) => hydrateCase(String(upsertCase({ id: where.id, ...data }).id)),
      delete: async ({ where }: DeleteArgs) => {
        const record = hydrateCase(String(where.id));
        cascadeDelete(String(where.id));
        return record;
      },
      createMany: async () => ({ count: 0 }),
      deleteMany: async () => ({ count: 0 })
    },
    healthDocument: makeCollectionDelegate(state.documents, (items) => {
      state.documents = items;
    }),
    sourcePreview: makeCollectionDelegate(state.sourcePreviews, (items) => {
      state.sourcePreviews = items;
    }),
    extractedFact: makeCollectionDelegate(state.facts, (items) => {
      state.facts = items;
    }),
    missingQuestion: makeCollectionDelegate(state.questions, (items) => {
      state.questions = items;
    }),
    timelineEvent: makeCollectionDelegate(state.timeline, (items) => {
      state.timeline = items;
    }),
    appointmentBrief: makeCollectionDelegate(state.briefs, (items) => {
      state.briefs = items;
    }),
    rehearsalSession: makeCollectionDelegate(state.rehearsals, (items) => {
      state.rehearsals = items;
    })
  };
}

function makeCollectionDelegate(items: DbRecord[], replaceItems: (items: DbRecord[]) => void) {
  const readItems = () => items;
  const writeItems = (nextItems: DbRecord[]) => {
    items = nextItems;
    replaceItems(nextItems);
  };

  return {
    create: async ({ data }: CreateArgs) => {
      const record = {
        createdAt: new Date("2026-06-19T00:00:00.000Z"),
        ...data,
        id: data.id ?? randomUUID()
      };
      writeItems([...readItems(), record]);
      return record;
    },
    createMany: async ({ data }: CreateManyArgs) => {
      writeItems([...readItems(), ...data]);
      return { count: data.length };
    },
    delete: async ({ where }: DeleteArgs) => {
      const record = readItems().find((item) => item.id === where.id) ?? null;
      writeItems(readItems().filter((item) => item.id !== where.id));
      return record;
    },
    deleteMany: async ({ where }: DeleteManyArgs) => {
      const before = readItems().length;
      writeItems(readItems().filter((item) => !matchesWhere(item, where)));
      return { count: before - readItems().length };
    },
    findUnique: async ({ where }: FindArgs) => readItems().find((item) => item.id === where.id) ?? null,
    update: async ({ where, data }: UpdateArgs) => {
      const record = readItems().find((item) => item.id === where.id);

      if (!record) {
        throw new Error(`Missing fake Prisma record ${String(where.id)}`);
      }

      const updated = { ...record, ...data };
      writeItems(readItems().map((item) => (item.id === where.id ? updated : item)));
      return updated;
    }
  };
}

function matchesWhere(record: DbRecord, where: DbRecord): boolean {
  return Object.entries(where).every(([key, value]) => record[key] === value);
}

function makeDocument(caseId: string): HealthDocument {
  return {
    id: `doc-${caseId}`,
    caseId,
    type: "TEXT_NOTE",
    fileName: "synthetic-prisma-note.txt",
    rawText: "Synthetic Prisma note for appointment preparation.",
    createdAt: "2026-06-19T00:00:00.000Z"
  };
}

function makeSourcePreviewFor(document: HealthDocument) {
  return makeSourcePreview({
    document,
    snippet: "Synthetic Prisma note for appointment preparation.",
    confidence: 0.98,
    parser: "text",
    needsManualFallback: false
  });
}

function makeFact(caseId: string, sourceDocId: string): ExtractedFact {
  return {
    id: `fact-${caseId}`,
    caseId,
    sourceDocId,
    category: "APPOINTMENT",
    displayText: "Synthetic Prisma appointment preparation fact",
    value: { topic: "appointment preparation" },
    confidence: 0.91,
    userStatus: "UNREVIEWED",
    sourceQuote: "Synthetic Prisma note",
    createdAt: "2026-06-19T00:00:00.000Z"
  };
}

function makeTimelineEvent(caseId: string, factId: string): TimelineEvent {
  return {
    id: `timeline-${caseId}`,
    caseId,
    approximateDate: "Before appointment",
    type: "NOTE",
    title: "Synthetic Prisma appointment context captured",
    description: "The synthetic note was organized as appointment preparation context.",
    sourceFactIds: [factId],
    createdAt: "2026-06-19T00:00:00.000Z"
  };
}
