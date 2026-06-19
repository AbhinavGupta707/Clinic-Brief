import { describe, expect, it } from "vitest";

import { ClinicBriefOutputSchema, ExtractionResultSchema, REQUIRED_DISCLAIMER, RehearsalAgentOutputSchema, getSafetyRedirect } from "./index";

describe("AI extraction contracts", () => {
  it("accepts source-linked extraction output", () => {
    const parsed = ExtractionResultSchema.parse({
      facts: [
        {
          sourceDocId: "doc-source-1",
          category: "SYMPTOM",
          displayText: "Source mentions knee pain after walking.",
          value: { text: "knee pain after walking" },
          confidence: 0.82,
          sourceQuote: "knee pain after walking"
        }
      ],
      questions: []
    });

    expect(parsed.facts[0]?.sourceDocId).toBe("doc-source-1");
  });

  it("redirects prohibited medical advice requests", () => {
    expect(getSafetyRedirect("Should I stop taking this medicine?")).toContain("cannot diagnose or recommend treatment");
  });

  it("accepts rehearsal output that requires user review before updating facts", () => {
    const parsed = RehearsalAgentOutputSchema.parse({
      assistantMessage: "Thank you. Next question: What changed since the last appointment?",
      blocked: false,
      suggestedFactUpdates: [
        {
          type: "missing_question_answer",
          questionId: "question-1",
          requiresUserReview: true,
          proposedDisplayText: "Rehearsal answer captured for: appointment goal"
        }
      ]
    });

    expect(parsed.suggestedFactUpdates?.[0]?.requiresUserReview).toBe(true);
  });

  it("requires generated briefs to include the exact safety disclaimer", () => {
    const parsed = ClinicBriefOutputSchema.parse({
      title: "Pre-op nurse brief",
      oneLineReasonForVisit: "Pre-op appointment prep: Review user-provided notes.",
      ninetySecondStory: "I am preparing for my appointment and want to explain the reviewed facts clearly.",
      keyTimeline: [{ dateLabel: "Date not provided", event: "Reviewed source note mentions appointment preparation." }],
      currentMedications: [],
      allergiesAndImportantNotes: [],
      whatChangedSinceLastAppointment: [],
      questionsForClinician: ["What details should I confirm at the appointment?"],
      openUncertainties: ["Review unconfirmed details before sharing."],
      sourceCoverage: [{ section: "Reviewed facts", sourceCount: 1 }],
      safetyDisclaimer: REQUIRED_DISCLAIMER
    });

    expect(parsed.safetyDisclaimer).toBe(REQUIRED_DISCLAIMER);
  });
});
