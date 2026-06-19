import type { RehearsalSession } from "@clinicbrief/types";
import { describe, expect, it } from "vitest";

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
  it("asks one safe question at a time", () => {
    const session = makeSession([]);
    const reply = buildRehearsalReply({ message: "I want to mention the timing clearly.", questions, session });

    expect(buildInitialRehearsalMessage(questions)).toContain(questions[0]?.question);
    expect(reply.assistantMessage).toContain(questions[1]?.question);
    expect(reply.suggestedFactUpdates?.[0]?.questionId).toBe("q-1");
  });

  it("redirects unsafe medical advice requests", () => {
    const reply = buildRehearsalReply({ message: "Should I stop taking this medicine?", questions, session: makeSession([]) });

    expect(reply.blocked).toBe(true);
    expect(reply.assistantMessage).toContain("cannot diagnose or recommend treatment");
    expect(reply.suggestedFactUpdates).toBeUndefined();
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
