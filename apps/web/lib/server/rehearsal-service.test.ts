import type { RehearsalSession } from "@clinicbrief/types";
import { afterEach, describe, expect, it, vi } from "vitest";

import { buildInitialRehearsalMessage, buildRehearsalReply } from "./rehearsal-service";

const questions = [
  {
    id: "q-1",
    priority: "high" as const,
    question: "What changed since the last appointment?",
    whyItMattersForAppointment: "Keeps the story focused.",
    answerType: "short_text" as const
  },
  {
    id: "q-2",
    priority: "medium" as const,
    question: "What support details do you want to mention?",
    whyItMattersForAppointment: "Captures practical needs.",
    answerType: "short_text" as const
  }
];

describe("rehearsal service", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("asks one safe question at a time with deterministic fallback", async () => {
    const session = makeSession([]);
    const reply = await buildRehearsalReply({ message: "I want to mention the timing clearly.", questions, session });

    expect(buildInitialRehearsalMessage(questions)).toContain(questions[0]?.question);
    expect(reply.assistantMessage).toContain(questions[1]?.question);
    expect(reply.suggestedFactUpdates?.[0]?.questionId).toBe("q-1");
  });

  it("uses mocked Fireworks output for rehearsal replies", async () => {
    vi.stubEnv("FIREWORKS_API_KEY", "test-key");
    vi.stubEnv("FIREWORKS_MODEL", "accounts/fireworks/models/test");
    mockFireworksResponse({
      assistantMessage: "Thanks. What support details do you want to mention?",
      blocked: false,
      suggestedFactUpdates: [
        {
          type: "missing_question_answer",
          questionId: "q-1",
          requiresUserReview: true,
          proposedDisplayText: "Rehearsal answer captured for what changed since the last appointment."
        }
      ]
    });

    const reply = await buildRehearsalReply({ message: "The pain started last month.", questions, session: makeSession([]) });

    expect(reply.blocked).toBe(false);
    expect(reply.assistantMessage).toContain("support details");
    expect(reply.suggestedFactUpdates?.[0]?.requiresUserReview).toBe(true);
  });

  it("redirects unsafe medical advice requests before calling the provider", async () => {
    vi.stubEnv("FIREWORKS_API_KEY", "test-key");
    vi.stubEnv("FIREWORKS_MODEL", "accounts/fireworks/models/test");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const reply = await buildRehearsalReply({ message: "Should I stop taking this medicine?", questions, session: makeSession([]) });

    expect(reply.blocked).toBe(true);
    expect(reply.assistantMessage).toContain("cannot diagnose or recommend treatment");
    expect(reply.suggestedFactUpdates).toBeUndefined();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

function makeSession(messages: RehearsalSession["messages"]): RehearsalSession {
  return {
    id: "session-test",
    caseId: "case-test",
    mode: "PREOP_NURSE",
    messages,
    createdAt: "2026-06-19T00:00:00.000Z"
  };
}

function mockFireworksResponse(content: unknown) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(content) } }] }), { status: 200 }))
  );
}
