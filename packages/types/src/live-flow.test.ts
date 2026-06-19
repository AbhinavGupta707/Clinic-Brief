import { expect, expectTypeOf, test } from "vitest";

import {
  BROWSER_SPEECH_PRIVACY_NOTICE,
  CASE_MODES,
  CHRONIC_INTAKE_FIELDS,
  type BrowserSpeechFeatureContract,
  type CaseDashboardState,
  type CaseMode,
  type GuidedIntakeSourceMetadata,
  type HealthDocument,
  type PatternCard
} from "./index";

test("case modes include the chronic live-flow mode", () => {
  expect(CASE_MODES).toContain("CHRONIC");
  expectTypeOf<"CHRONIC">().toMatchTypeOf<CaseMode>();
});

test("guided chronic intake metadata is source-backed and user-reviewed", () => {
  const metadata: GuidedIntakeSourceMetadata = {
    kind: "guided_intake",
    stepId: "story_starter",
    chronicFieldId: "conditions_being_investigated",
    chronicAppointmentFocus: "RHEUMATOLOGY",
    sourceLabel: "Guided intake: health story starter",
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

  const document: HealthDocument = {
    id: "doc-guided-story",
    caseId: "case-chronic",
    type: "VOICE_TRANSCRIPT",
    fileName: "guided-intake-story.txt",
    rawText: "Synthetic user-reviewed transcript.",
    metadata,
    createdAt: "2026-06-19T00:00:00.000Z"
  };

  expect(CHRONIC_INTAKE_FIELDS).toContain("conditions_being_investigated");
  if (document.metadata?.kind !== "guided_intake") {
    throw new Error("Expected guided intake metadata.");
  }
  expect(document.metadata.storesAudio).toBe(false);
});

test("pattern cards are review-first appointment hypotheses", () => {
  const card: PatternCard = {
    id: "pattern-1",
    caseId: "case-chronic",
    kind: "repeated_symptom",
    title: "Possible pattern to discuss",
    summary: "Two reviewed notes mention fatigue after busy days.",
    suggestedBriefText: "User wants to discuss whether fatigue after busy days is important.",
    safetyLabel: "possible_pattern_to_discuss",
    userStatus: "UNREVIEWED",
    requiresUserReview: true,
    sourceFactIds: ["fact-1", "fact-2"],
    confidence: 0.72,
    createdAt: "2026-06-19T00:00:00.000Z"
  };

  expect(card.requiresUserReview).toBe(true);
  expect(card.userStatus).toBe("UNREVIEWED");
  expect(card.safetyLabel).toBe("possible_pattern_to_discuss");
});

test("case dashboard state carries workflow, next action, and safety contract", () => {
  const dashboard: CaseDashboardState = {
    caseId: "case-chronic",
    mode: "CHRONIC",
    generatedAt: "2026-06-19T00:00:00.000Z",
    workflow: [
      { id: "intake", label: "Intake", state: "done" },
      { id: "review", label: "Review facts", state: "needs_input", count: 3, needsUserReview: true }
    ],
    counts: {
      documents: 2,
      sourcePreviews: 2,
      facts: 8,
      factsNeedingReview: 3,
      reviewedPatterns: 0,
      openQuestions: 4,
      briefs: 0
    },
    nextAction: {
      id: "review",
      label: "Review extracted facts",
      href: "/cases/case-chronic/review",
      reason: "Facts need user review before they can be used in a brief."
    },
    whatChangedSinceLastAppointment: [],
    topPointsToRaise: [],
    openQuestions: [{ id: "q-1", question: "What changed recently?", priority: "high", answered: false }],
    sourceCoverage: [{ section: "Timeline", sourceCount: 2, weakOrMissingEvidence: false }],
    safetyDisclaimerRequired: true
  };

  expect(dashboard.nextAction.id).toBe("review");
  expect(dashboard.safetyDisclaimerRequired).toBe(true);
});

test("browser speech contract requires typed fallback and stores no audio", () => {
  const speechToText: BrowserSpeechFeatureContract = {
    mode: "speech_to_text",
    capability: "unknown",
    userTriggered: true,
    typedFallbackRequired: true,
    storesAudio: false,
    serverSideAudioProcessing: false,
    transcriptRequiresReviewBeforeSave: true,
    privacyNotice: BROWSER_SPEECH_PRIVACY_NOTICE
  };

  expect(speechToText.typedFallbackRequired).toBe(true);
  expect(speechToText.storesAudio).toBe(false);
  expect(speechToText.serverSideAudioProcessing).toBe(false);
});
