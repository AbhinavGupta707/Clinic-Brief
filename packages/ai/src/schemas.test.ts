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
      questions: [],
      allowedCategories: ["SYMPTOM"]
    });

    expect(parsed.facts[0]?.sourceDocId).toBe("doc-source-1");
    expect(parsed).not.toHaveProperty("allowedCategories");
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

  it("accepts chronic-specific questions and brief sections", () => {
    const questionResult = ExtractionResultSchema.parse({
      facts: [],
      questions: [
        {
          id: "chronic-q-1",
          priority: "high",
          question: "Which history items have already been confirmed by a clinician?",
          whyItMattersForAppointment: "Confirmed history should be separate from conditions being investigated.",
          answerType: "short_text",
          chronicFieldId: "reported_confirmed_history"
        }
      ]
    });

    const brief = ClinicBriefOutputSchema.parse({
      title: "Chronic appointment brief",
      oneLineReasonForVisit: "Chronic appointment prep from reviewed user-provided facts.",
      ninetySecondStory: "I want to explain the reviewed timeline, symptoms, and questions clearly.",
      keyTimeline: [{ dateLabel: "Date not provided", event: "Reviewed chronic history note." }],
      currentMedications: [],
      allergiesAndImportantNotes: ["Reported confirmed history: clinician-confirmed asthma."],
      whatChangedSinceLastAppointment: ["Functional impact: fewer full work days."],
      questionsForClinician: ["What should I clarify about the symptoms being investigated?"],
      openUncertainties: ["Confirm wording for investigated conditions before sharing."],
      sourceCoverage: [{ section: "Reviewed facts", sourceCount: 2 }],
      chronicSections: {
        reportedConfirmedHistory: ["Clinician-confirmed asthma."],
        conditionsBeingInvestigated: ["Possible migraine being assessed."],
        baselineSymptomsAndFlares: ["Baseline fatigue most days."],
        medicationAndTreatmentHistory: ["Tried physiotherapy."],
        functionalImpact: ["Fewer full work days."],
        appointmentGoals: ["Clarify next appointment questions."]
      },
      safetyDisclaimer: REQUIRED_DISCLAIMER
    });

    expect(questionResult.questions[0]?.chronicFieldId).toBe("reported_confirmed_history");
    expect(brief.chronicSections?.conditionsBeingInvestigated[0]).toContain("Possible migraine");
  });
});
