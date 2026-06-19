import { preopCase } from "@clinicbrief/fixtures";
import type { ExtractedFact, HealthDocument, TimelineEvent } from "@clinicbrief/types";
import { describe, expect, it } from "vitest";

import { makeSourcePreview } from "./factories";
import { MemoryClinicRepository } from "./memory";

describe("MemoryClinicRepository", () => {
  it("exposes the synthetic sample case as a full read-only snapshot", async () => {
    const repository = new MemoryClinicRepository();
    const sample = await repository.getCase(preopCase.id);

    expect(sample?.id).toBe(preopCase.id);
    expect(sample?.documents).toHaveLength(preopCase.documents.length);
    expect(sample?.sourcePreviews).toHaveLength(preopCase.documents.length);
    expect(sample?.timeline).toHaveLength(preopCase.expectedTimeline.length);
    expect(sample?.briefs[0]?.briefJson.safetyDisclaimer).toContain("does not diagnose");

    const rejectedWrite = await repository.addDocument(preopCase.id, makeDocument(preopCase.id), makeSourcePreviewFor(makeDocument(preopCase.id)));
    expect(rejectedWrite).toBeNull();
  });

  it("persists case, document, extraction, review, timeline, brief, rehearsal, and delete state", async () => {
    const repository = new MemoryClinicRepository(new Map());
    const created = await repository.createCase({ title: "Synthetic test appointment", mode: "PREOP" });
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
      displayText: "Edited synthetic appointment fact",
      userStatus: "EDITED"
    });
    expect(updatedFact?.userStatus).toBe("EDITED");
    expect(updatedFact?.displayText).toBe("Edited synthetic appointment fact");

    const timelineEvent = makeTimelineEvent(created.id, fact.id);
    const timeline = await repository.replaceTimeline(created.id, [timelineEvent]);
    expect(timeline?.[0]?.sourceFactIds).toEqual([fact.id]);

    const brief = await repository.saveBrief(created.id, {
      briefType: "PREOP",
      title: preopCase.expectedBrief.title,
      briefJson: preopCase.expectedBrief,
      markdown: "# Synthetic pre-op brief"
    });
    expect(brief?.briefJson.safetyDisclaimer).toContain("does not diagnose");

    const session = await repository.createRehearsalSession(created.id, { mode: "PREOP_NURSE" });
    expect(session?.messages).toHaveLength(0);

    const appended = await repository.appendRehearsalMessage(created.id, session?.id ?? "", {
      id: "msg-synthetic-answer",
      role: "user",
      content: "Synthetic answer about what to ask at the appointment.",
      createdAt: "2026-06-19T00:00:00.000Z"
    });
    expect(appended?.messages).toHaveLength(1);

    const receipt = await repository.deleteCase(created.id);
    expect(receipt.deleted).toBe(true);
    expect(receipt.storageAction).toBe("mark_deleted_until_storage_is_configured");
    await expect(repository.getCase(created.id)).resolves.toBeNull();
  });
});

function makeDocument(caseId: string): HealthDocument {
  return {
    id: `doc-${caseId}`,
    caseId,
    type: "TEXT_NOTE",
    fileName: "synthetic-note.txt",
    rawText: "Synthetic note for appointment preparation.",
    createdAt: "2026-06-19T00:00:00.000Z"
  };
}

function makeSourcePreviewFor(document: HealthDocument) {
  return makeSourcePreview({
    document,
    snippet: "Synthetic note for appointment preparation.",
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
    displayText: "Synthetic appointment preparation fact",
    value: { topic: "appointment preparation" },
    confidence: 0.91,
    userStatus: "UNREVIEWED",
    sourceQuote: "Synthetic note",
    createdAt: "2026-06-19T00:00:00.000Z"
  };
}

function makeTimelineEvent(caseId: string, factId: string): TimelineEvent {
  return {
    id: `timeline-${caseId}`,
    caseId,
    approximateDate: "Before appointment",
    type: "NOTE",
    title: "Synthetic appointment context captured",
    description: "The synthetic note was organized as appointment preparation context.",
    sourceFactIds: [factId],
    createdAt: "2026-06-19T00:00:00.000Z"
  };
}
