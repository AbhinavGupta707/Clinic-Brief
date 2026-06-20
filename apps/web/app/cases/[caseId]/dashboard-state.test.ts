import type { ClinicCaseSnapshot, ExtractedFact, HealthDocument, MissingQuestion, SourcePreview } from "@clinicbrief/types";
import { describe, expect, it } from "vitest";

import { buildCaseDashboardState, buildChronicLongitudinalDashboardState } from "./dashboard-state";

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

describe("chronic longitudinal dashboard state", () => {
  it("uses confirmed and edited chronic facts in strong summary sections", () => {
    const state = buildChronicLongitudinalDashboardState(
      makeRecord({
        mode: "CHRONIC",
        facts: [
          makeFact({
            id: "fact-symptom",
            userStatus: "CONFIRMED",
            displayText: "User-reported baseline symptom pattern: Fatigue is present most mornings",
            value: { text: "Fatigue is present most mornings", chronicFieldId: "baseline_symptoms" }
          }),
          makeFact({
            id: "fact-impact",
            userStatus: "EDITED",
            displayText: "User-reported functional impact: Fewer full work days during flares",
            value: { text: "Fewer full work days during flares", chronicFieldId: "functional_impact" }
          }),
          makeFact({
            id: "fact-medication",
            userStatus: "CONFIRMED",
            category: "MEDICATION",
            displayText: "User-reported medication or treatment history: Tried physiotherapy exercises",
            value: { text: "Tried physiotherapy exercises", chronicFieldId: "current_medications_and_treatments_tried" }
          }),
          makeFact({
            id: "fact-investigated",
            userStatus: "CONFIRMED",
            category: "HISTORY_ITEM",
            displayText: "User-reported condition or symptom being investigated, not confirmed by ClinicBrief: Possible migraine is being investigated",
            value: { text: "Possible migraine is being investigated", chronicFieldId: "conditions_being_investigated" }
          })
        ]
      })
    );

    expect(sectionTexts(state, "symptom-change-themes")).toContain("Fatigue is present most mornings");
    expect(sectionTexts(state, "flares-triggers-impact")).toContain("Fewer full work days during flares");
    expect(sectionTexts(state, "medications-allergies-notes")).toContain("Tried physiotherapy exercises");
    expect(state.openUncertainties.map((item) => item.text)).toContain("Possible migraine is being investigated");
    expect(state.readyForBrief.ready).toBe(true);
  });

  it("excludes rejected facts and keeps unreviewed facts in a separate needs-review area", () => {
    const state = buildChronicLongitudinalDashboardState(
      makeRecord({
        mode: "CHRONIC",
        facts: [
          makeFact({
            id: "fact-confirmed",
            userStatus: "CONFIRMED",
            displayText: "User-reported change since last appointment: Walking tolerance is shorter",
            value: { text: "Walking tolerance is shorter", chronicFieldId: "changed_since_last_appointment" }
          }),
          makeFact({
            id: "fact-unreviewed",
            userStatus: "UNREVIEWED",
            displayText: "User-reported possible trigger or pattern to discuss: Symptoms seem worse after long days",
            value: { text: "Symptoms seem worse after long days", chronicFieldId: "possible_triggers_to_discuss" }
          }),
          makeFact({
            id: "fact-rejected",
            userStatus: "REJECTED",
            displayText: "Rejected claim that must not appear",
            value: { text: "Rejected claim that must not appear", chronicFieldId: "baseline_symptoms" }
          })
        ]
      })
    );

    const serializedSections = JSON.stringify(state.sections);
    expect(serializedSections).toContain("Walking tolerance is shorter");
    expect(serializedSections).not.toContain("Symptoms seem worse after long days");
    expect(serializedSections).not.toContain("Rejected claim that must not appear");
    expect(state.needsReview.map((item) => item.text)).toContain("Symptoms seem worse after long days");
    expect(JSON.stringify(state.needsReview)).not.toContain("Rejected claim that must not appear");
  });

  it("routes empty chronic cases to intake and sourced cases without reviewed facts to review", () => {
    const emptyState = buildChronicLongitudinalDashboardState(makeRecord({ mode: "CHRONIC" }));

    expect(emptyState.readyForBrief.ready).toBe(false);
    expect(emptyState.emptyState).toMatchObject({
      primaryHref: "/cases/case-dashboard/intake",
      primaryLabel: "Add intake notes"
    });

    const reviewState = buildChronicLongitudinalDashboardState(
      makeRecord({
        mode: "CHRONIC",
        documents: [makeDocument()],
        sourcePreviews: [makeSourcePreview()],
        facts: [makeFact({ userStatus: "UNREVIEWED" })]
      })
    );

    expect(reviewState.readyForBrief.ready).toBe(false);
    expect(reviewState.readyForBrief.href).toBe("/cases/case-dashboard/review");
    expect(reviewState.emptyState?.primaryLabel).toBe("Review facts");
  });

  it("summarizes reviewed timeline highlights and open questions", () => {
    const state = buildChronicLongitudinalDashboardState(
      makeRecord({
        mode: "CHRONIC",
        facts: [
          makeFact({
            id: "fact-change",
            userStatus: "CONFIRMED",
            displayText: "User-reported change since last appointment: Symptoms changed after the last review",
            value: { text: "Symptoms changed after the last review", chronicFieldId: "changed_since_last_appointment" }
          })
        ],
        timeline: [
          {
            id: "timeline-reviewed",
            caseId: "case-dashboard",
            approximateDate: "May 2026",
            type: "SYMPTOM_CHANGE",
            title: "Reviewed change captured",
            description: "Symptoms changed after the last review",
            sourceFactIds: ["fact-change"],
            createdAt: now
          },
          {
            id: "timeline-unreviewed",
            caseId: "case-dashboard",
            approximateDate: "June 2026",
            type: "NOTE",
            title: "Unreviewed timeline item",
            description: "Unreviewed detail should not appear",
            sourceFactIds: ["fact-unreviewed"],
            createdAt: now
          }
        ],
        questions: [
          makeQuestion({
            id: "question-impact",
            question: "What does a worse episode stop you from doing?",
            whyItMattersForAppointment: "It gives the clinician a concrete functional example.",
            chronicFieldId: "functional_impact"
          })
        ]
      })
    );

    expect(sectionTexts(state, "timeline-highlights")).toContain("May 2026: Symptoms changed after the last review");
    expect(JSON.stringify(state.sections)).not.toContain("Unreviewed detail should not appear");
    expect(state.openQuestions).toMatchObject([
      {
        id: "question-impact",
        question: "What does a worse episode stop you from doing?"
      }
    ]);
  });
});

function sectionTexts(state: ReturnType<typeof buildChronicLongitudinalDashboardState>, sectionId: string): string[] {
  return state.sections.find((section) => section.id === sectionId)?.items.map((item) => item.text) ?? [];
}

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
