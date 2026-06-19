import type { ClinicCaseSnapshot, ExtractedFact } from "@clinicbrief/types";
import { describe, expect, it } from "vitest";

import { buildFactsWithGeneratedPatterns, isPatternFact, listPatternCards, patternFactToCard, patternServiceTestInternals } from "./pattern-service";

describe("pattern-service", () => {
  it("generates review-first PatternCard-shaped facts from reviewed source-backed facts", () => {
    const record = makeRecord({
      facts: [
        makeFact({ id: "symptom-1", category: "SYMPTOM", displayText: "Walking pain changed since the last appointment", userStatus: "CONFIRMED" }),
        makeFact({ id: "symptom-2", category: "SYMPTOM", displayText: "Sleep disruption has been worse recently", userStatus: "EDITED" }),
        makeFact({ id: "unreviewed-1", category: "SYMPTOM", displayText: "Unreviewed symptom", userStatus: "UNREVIEWED" })
      ]
    });

    const facts = buildFactsWithGeneratedPatterns(record);
    const patternFacts = facts.filter(isPatternFact);
    const cards = patternFacts.map(patternFactToCard);

    expect(patternFacts.length).toBeGreaterThan(0);
    expect(cards[0]).toMatchObject({
      caseId: "case-patterns",
      requiresUserReview: true,
      userStatus: "UNREVIEWED"
    });
    expect(cards[0]?.sourceFactIds).toContain("symptom-1");
    expect(cards[0]?.sourceFactIds).not.toContain("unreviewed-1");
  });

  it("lists persisted pattern marker facts as PatternCard data", () => {
    const record = makeRecord({
      facts: [
        makeFact({
          id: "pattern-1",
          category: "HISTORY_ITEM",
          displayText: "Possible repeated symptom pattern to discuss: Reviewed notes include 2 symptom items.",
          value: {
            kind: "pattern_card",
            patternKind: "repeated_symptom",
            title: "Possible repeated symptom pattern to discuss",
            summary: "Reviewed notes include 2 symptom items.",
            safetyLabel: "possible_pattern_to_discuss",
            sourceFactIds: ["symptom-1", "symptom-2"],
            sourceDocumentIds: ["doc-1"]
          },
          userStatus: "CONFIRMED"
        })
      ]
    });

    const cards = listPatternCards(record);

    expect(cards).toHaveLength(1);
    expect(cards[0]).toMatchObject({
      id: "pattern-1",
      sourceFactIds: ["symptom-1", "symptom-2"],
      userStatus: "CONFIRMED",
      requiresUserReview: true
    });
  });

  it("strips forbidden clinical language from pattern text", () => {
    const card = patternFactToCard(
      makeFact({
        id: "pattern-unsafe",
        category: "HISTORY_ITEM",
        displayText: "This diagnosis caused the symptom and needs urgent treatment.",
        value: {
          kind: "pattern_card",
          patternKind: "repeated_symptom",
          title: "Diagnosis cause",
          summary: "Needs urgent treatment",
          safetyLabel: "possible_pattern_to_discuss",
          sourceFactIds: ["fact-1"]
        }
      })
    );

    expect(patternServiceTestInternals.FORBIDDEN_PATTERN_LANGUAGE.test(card.title)).toBe(false);
    expect(patternServiceTestInternals.FORBIDDEN_PATTERN_LANGUAGE.test(card.summary)).toBe(false);
    expect(patternServiceTestInternals.FORBIDDEN_PATTERN_LANGUAGE.test(card.suggestedBriefText)).toBe(false);
  });
});

function makeRecord(overrides: Partial<ClinicCaseSnapshot> = {}): ClinicCaseSnapshot {
  const now = "2026-06-19T00:00:00.000Z";

  return {
    id: "case-patterns",
    title: "Pattern test case",
    mode: "CHRONIC",
    status: "REVIEWED",
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

function makeFact(overrides: Partial<ExtractedFact> = {}): ExtractedFact {
  return {
    id: "fact-1",
    caseId: "case-patterns",
    sourceDocId: "doc-1",
    category: "SYMPTOM",
    displayText: "Walking pain changed since the last appointment",
    value: { text: "walking pain changed" },
    confidence: 0.9,
    userStatus: "CONFIRMED",
    createdAt: "2026-06-19T00:00:00.000Z",
    ...overrides
  };
}
