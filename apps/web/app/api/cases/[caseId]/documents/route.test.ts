import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ClinicCaseSnapshot, GuidedIntakeSourceMetadata } from "@clinicbrief/types";

import { getClinicRepository } from "../../../../../lib/server/clinic-repository";
import { POST } from "./route";

vi.mock("../../../../../lib/server/clinic-repository", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../../../../lib/server/clinic-repository")>();

  return {
    ...actual,
    getClinicRepository: vi.fn()
  };
});

const mockedGetClinicRepository = vi.mocked(getClinicRepository);

describe("case documents route", () => {
  const addDocument = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockedGetClinicRepository.mockResolvedValue({
      getCase: vi.fn(async () => makeCaseRecord()),
      addDocument
    } as unknown as Awaited<ReturnType<typeof getClinicRepository>>);
  });

  it("stores reviewed browser speech text with no audio metadata", async () => {
    const metadata: GuidedIntakeSourceMetadata = {
      kind: "guided_intake",
      stepId: "story_starter",
      sourceLabel: "Guided intake: story starter",
      captureMethod: "browser_speech_transcript",
      userReviewed: true,
      storesAudio: false,
      browserSpeech: {
        capability: "supported",
        transcriptReviewed: true,
        audioStored: false,
        submittedByUser: true
      }
    };

    const response = await POST(makeJsonRequest({ type: "VOICE_TRANSCRIPT", fileName: "reviewed-transcript.txt", text: "Reviewed appointment story.", metadata }), {
      params: Promise.resolve({ caseId: "case-documents" })
    });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(payload.data.document.type).toBe("VOICE_TRANSCRIPT");
    expect(payload.data.document.rawText).toBe("Reviewed appointment story.");
    expect(payload.data.document.metadata).toEqual(metadata);
    expect(payload.data.sourcePreview.metadata).toEqual(metadata);
    expect(addDocument).toHaveBeenCalledWith(
      "case-documents",
      expect.objectContaining({
        type: "VOICE_TRANSCRIPT",
        metadata
      }),
      expect.objectContaining({
        metadata
      })
    );
  });

  it("rejects speech metadata that is not reviewed or claims audio storage", async () => {
    const metadata = {
      kind: "voice_transcript",
      sourceLabel: "Unsafe transcript",
      userReviewed: false,
      storesAudio: true,
      browserSpeech: {
        capability: "supported",
        transcriptReviewed: false,
        audioStored: false,
        submittedByUser: false
      }
    };

    const response = await POST(makeJsonRequest({ type: "VOICE_TRANSCRIPT", text: "Do not store this yet.", metadata }), {
      params: Promise.resolve({ caseId: "case-documents" })
    });
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.ok).toBe(false);
    expect(addDocument).not.toHaveBeenCalled();
  });
});

function makeJsonRequest(body: unknown): Request {
  return new Request("http://localhost/api/cases/case-documents/documents", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
}

function makeCaseRecord(): ClinicCaseSnapshot {
  const now = "2026-06-19T00:00:00.000Z";

  return {
    id: "case-documents",
    title: "Documents test case",
    mode: "PREOP",
    status: "CONSENTED",
    consentAccepted: true,
    consentedAt: now,
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
}
