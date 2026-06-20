import { describe, expect, it } from "vitest";
import { Events, isClinicEventName, sanitizeEventProps, trackAgentEvent } from "./index";

describe("sanitizeEventProps", () => {
  it("keeps only allowed mode, brief type, confidence band, and count properties", () => {
    expect(
      sanitizeEventProps({
        mode: "PREOP",
        briefType: "PREOP",
        documentCount: 3,
        factCount: 12,
        confidenceBand: "mixed",
        rawText: "filtered",
        medicationName: "filtered",
        symptomName: "filtered",
        fileName: "filtered",
        rehearsalPrompt: "Should I stop this medication?",
        assistantResponse: "Filtered answer text",
        messageText: "Filtered rehearsal message",
        voiceTranscript: "Filtered transcript",
        caseId: "case-123"
      })
    ).toEqual({
      mode: "PREOP",
      briefType: "PREOP",
      documentCount: 3,
      factCount: 12,
      confidenceBand: "mixed"
    });
  });

  it("rejects non-numeric count values", () => {
    expect(sanitizeEventProps({ documentCount: "3", answeredQuestionCount: -1 })).toEqual({});
  });

  it("filters raw guided-flow health content while keeping counts", () => {
    expect(
      sanitizeEventProps({
        mode: "GENERAL",
        sourceCount: 2,
        questionCount: 4,
        answeredQuestionCount: 3,
        firstName: "Alex",
        rawAnswerText: "I have symptom details that should not go to analytics.",
        medicationName: "private medicine name",
        symptomName: "private symptom name",
        voiceTranscript: "private browser transcript",
        fileName: "private-referral.pdf"
      })
    ).toEqual({
      mode: "GENERAL",
      sourceCount: 2,
      questionCount: 4,
      answeredQuestionCount: 3
    });
  });

  it("validates registered event names", () => {
    expect(isClinicEventName(Events.BriefGenerated)).toBe(true);
    expect(isClinicEventName(Events.ReadbackStarted)).toBe(true);
    expect(isClinicEventName(Events.PatternCardsGenerated)).toBe(true);
    expect(isClinicEventName("raw_health_text_sent")).toBe(false);
  });

  it("builds masked agent tracking metadata without raw prompt content", () => {
    const metadata = trackAgentEvent("prompt", {
      agentId: "test-agent",
      conversationId: "anonymous-rehearsal",
      messageId: "message-1",
      content: "[rehearsal_answer]"
    });

    expect(metadata).toEqual({
      agentId: "test-agent",
      conversationId: "anonymous-rehearsal",
      messageId: "message-1",
      content: "[rehearsal_answer]"
    });
  });
});
