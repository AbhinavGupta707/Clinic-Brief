import { beforeEach, describe, expect, it, vi } from "vitest";

import { getClinicRepository } from "../../../lib/server/clinic-repository";
import { POST } from "./route";

vi.mock("../../../lib/server/clinic-repository", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../../lib/server/clinic-repository")>();

  return {
    ...actual,
    getClinicRepository: vi.fn()
  };
});

const mockedGetClinicRepository = vi.mocked(getClinicRepository);

describe("cases route", () => {
  const addDocument = vi.fn();
  const createCase = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    createCase.mockResolvedValue({
      id: "case-created",
      title: "Upcoming appointment brief",
      mode: "GENERAL"
    });
    mockedGetClinicRepository.mockResolvedValue({
      createCase,
      addDocument
    } as unknown as Awaited<ReturnType<typeof getClinicRepository>>);
  });

  it("keeps case creation compatible without an initial source", async () => {
    const response = await POST(makeJsonRequest({ title: "Upcoming appointment brief", mode: "GENERAL", consent: true }));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toEqual({ ok: true, data: { caseId: "case-created" } });
    expect(createCase).toHaveBeenCalledWith({ title: "Upcoming appointment brief", mode: "GENERAL" });
    expect(addDocument).not.toHaveBeenCalled();
  });

  it("stores reviewed story dump text as a source document while creating the case", async () => {
    const response = await POST(
      makeJsonRequest({
        title: "Pre-op appointment",
        mode: "PREOP",
        consent: true,
        initialSource: {
          text: "I am preparing for surgery and want to organize my questions.",
          sourceLabel: "Story dump transcript",
          captureMethod: "browser_speech_transcript",
          userReviewed: true,
          storesAudio: false
        }
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(addDocument).toHaveBeenCalledWith(
      "case-created",
      expect.objectContaining({
        caseId: "case-created",
        type: "VOICE_TRANSCRIPT",
        fileName: "story-dump-reviewed-transcript.txt",
        rawText: "I am preparing for surgery and want to organize my questions.",
        metadata: expect.objectContaining({
          kind: "voice_transcript",
          sourceLabel: "Story dump transcript",
          userReviewed: true,
          storesAudio: false
        })
      }),
      expect.objectContaining({
        sourceType: "VOICE_TRANSCRIPT",
        snippet: "I am preparing for surgery and want to organize my questions.",
        metadata: expect.objectContaining({
          kind: "voice_transcript",
          sourceLabel: "Story dump transcript"
        })
      })
    );
  });

  it("stores finalized guided conversation answers as source material", async () => {
    const response = await POST(
      makeJsonRequest({
        title: "Alex's pre-op brief",
        mode: "PREOP",
        consent: true,
        initialSource: {
          text: "Guided appointment-prep conversation\nQuestion 1: What are you preparing for?\nAnswer 1: A synthetic appointment.",
          sourceLabel: "Guided appointment-prep conversation",
          captureMethod: "typed",
          userReviewed: true,
          storesAudio: false
        }
      })
    );

    expect(response.status).toBe(200);
    expect(addDocument).toHaveBeenCalledWith(
      "case-created",
      expect.objectContaining({
        type: "TEXT_NOTE",
        fileName: "story-dump-text.txt",
        rawText: expect.stringContaining("Guided appointment-prep conversation"),
        metadata: expect.objectContaining({
          kind: "text_note",
          sourceLabel: "Guided appointment-prep conversation",
          userReviewed: true
        })
      }),
      expect.objectContaining({
        snippet: expect.stringContaining("Guided appointment-prep conversation"),
        metadata: expect.objectContaining({
          sourceLabel: "Guided appointment-prep conversation"
        })
      })
    );
  });

  it("rejects unreviewed or audio-storing initial source payloads", async () => {
    const response = await POST(
      makeJsonRequest({
        title: "Unsafe story",
        mode: "GENERAL",
        consent: true,
        initialSource: {
          text: "Do not save this yet.",
          sourceLabel: "Story dump transcript",
          captureMethod: "browser_speech_transcript",
          userReviewed: false,
          storesAudio: true
        }
      })
    );

    expect(response.status).toBe(400);
    expect(createCase).not.toHaveBeenCalled();
    expect(addDocument).not.toHaveBeenCalled();
  });
});

function makeJsonRequest(body: unknown): Request {
  return new Request("http://localhost/api/cases", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
}
