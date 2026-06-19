import { describe, expect, it } from "vitest";
import { Events, isClinicEventName, sanitizeEventProps } from "./index";

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

  it("validates registered event names", () => {
    expect(isClinicEventName(Events.BriefGenerated)).toBe(true);
    expect(isClinicEventName("raw_health_text_sent")).toBe(false);
  });
});
