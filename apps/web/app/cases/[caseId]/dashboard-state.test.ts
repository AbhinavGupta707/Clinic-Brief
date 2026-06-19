import type { ClinicCaseSnapshot, ExtractedFact, HealthDocument, MissingQuestion, SourcePreview } from "@clinicbrief/types";
import { describe, expect, it } from "vitest";

import { buildCaseDashboardState } from "./dashboard-state";

const now = "2026-06-19T00:00:00.000Z";

describe("case dashboard state", () => {
  it("sends a new consented case to intake", () => {
    const state = buildCaseDashboardState(makeRecord());

    expect(state.workflow.find((item) => item.id === "intake")?.state).toBe("needs_input");
    expect(state.nextAction).toMatchObject({
      id: "intake",
      href: "/cases/case-dashboard/intake"
    });
    expect(state.safetyDisclaimerRequired).toBe(true);
  });

  it("sends sourced cases without extraction to fact extraction", () => {
    const state = buildCaseDashboardState(
      makeRecord({
        documents: [makeDocument()],
        sourcePreviews: [makeSourcePreview()]
      })
    );

    expect(state.workflow.find((item) => item.id === "extraction")?.state).toBe("ready");
    expect(state.nextAction.id).toBe("extraction");
  });

  it("prioritizes user review when facts need review", () => {
    const state = buildCaseDashboardState(
      makeRecord({
        documents: [makeDocument()],
        sourcePreviews: [makeSourcePreview()],
        facts: [makeFact({ userStatus: "UNREVIEWED" }), makeFact({ id: "fact-confirmed", userStatus: "CONFIRMED" })],
        questions: [makeQuestion()]
      })
    );

    expect(state.counts.factsNeedingReview).toBe(1);
    expect(state.nextAction).toMatchObject({
      id: "review",
      href: "/cases/case-dashboard/review"
    });
    expect(state.openQuestions).toHaveLength(1);
  });

  it("surfaces reviewed points and moves complete cases toward export", () => {
    const state = buildCaseDashboardState(
      makeRecord({
        status: "BRIEF_GENERATED",
        documents: [makeDocument()],
        sourcePreviews: [makeSourcePreview()],
        facts: [makeFact({ userStatus: "CONFIRMED" })],
        briefs: [
          {
            id: "brief-1",
            caseId: "case-dashboard",
            briefType: "GP",
            title: "GP appointment brief",
            briefJson: {
              title: "GP appointment brief",
              oneLineReasonForVisit: "Appointment preparation.",
              ninetySecondStory: "I want to explain the reviewed notes clearly.",
              keyTimeline: [],
              currentMedications: [],
              allergiesAndImportantNotes: [],
              whatChangedSinceLastAppointment: ["Walking pain changed since the last appointment"],
              questionsForClinician: [],
              openUncertainties: [],
              sourceCoverage: [{ section: "Reviewed facts", sourceCount: 1 }],
              safetyDisclaimer:
                "ClinicBrief organizes information you provide so you can prepare for appointments. It does not diagnose, recommend treatment, or replace medical advice. Review everything before sharing it with a clinician."
            },
            markdown: "# GP appointment brief",
            createdAt: now
          }
        ]
      })
    );

    expect(state.topPointsToRaise).toMatchObject([{ text: "Walking pain changed since the last appointment", userReviewed: true }]);
    expect(state.workflow.find((item) => item.id === "brief")?.state).toBe("done");
    expect(state.nextAction.id).toBe("export");
  });
});

function makeRecord(overrides: Partial<ClinicCaseSnapshot> = {}): ClinicCaseSnapshot {
  return {
    id: "case-dashboard",
    title: "Dashboard test case",
    mode: "GENERAL",
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
    updatedAt: now,
    ...overrides
  };
}

function makeDocument(): HealthDocument {
  return {
    id: "doc-1",
    caseId: "case-dashboard",
    type: "TEXT_NOTE",
    fileName: "note.txt",
    rawText: "Walking pain changed since the last appointment.",
    createdAt: now
  };
}

function makeSourcePreview(): SourcePreview {
  return {
    id: "preview-1",
    sourceId: "source-1",
    sourceType: "TEXT_NOTE",
    documentId: "doc-1",
    snippet: "Walking pain changed since the last appointment.",
    confidence: 0.9,
    parser: "text",
    needsManualFallback: false,
    createdAt: now
  };
}

function makeFact(overrides: Partial<ExtractedFact> = {}): ExtractedFact {
  return {
    id: "fact-1",
    caseId: "case-dashboard",
    sourceDocId: "doc-1",
    category: "SYMPTOM",
    displayText: "Walking pain changed since the last appointment",
    value: { text: "walking pain changed" },
    confidence: 0.92,
    userStatus: "UNREVIEWED",
    createdAt: now,
    ...overrides
  };
}

function makeQuestion(overrides: Partial<MissingQuestion> = {}): MissingQuestion {
  return {
    id: "question-1",
    priority: "high",
    question: "What changed since the last appointment?",
    whyItMattersForAppointment: "Keeps the appointment focused.",
    answerType: "short_text",
    ...overrides
  };
}
