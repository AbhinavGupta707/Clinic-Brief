import { REQUIRED_DISCLAIMER } from "@clinicbrief/ai";
import type { ClinicBriefOutput, ClinicCaseSnapshot, ExtractedFact } from "@clinicbrief/types";
import { afterEach, describe, expect, it, vi } from "vitest";

import { buildAppointmentBrief } from "./brief-service";

describe("brief generation service", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("uses mocked Fireworks output for a reviewed-facts-only brief", async () => {
    vi.stubEnv("FIREWORKS_API_KEY", "test-key");
    vi.stubEnv("FIREWORKS_MODEL", "accounts/fireworks/models/test");
    const fetchMock = mockFireworksResponse(makeAiBrief({ ninetySecondStory: "I want to explain the confirmed walking pain and ask what details to review." }));

    const brief = await buildAppointmentBrief({ record: makeRecord(), briefType: "PREOP" });

    expect(brief.ninetySecondStory).toContain("confirmed walking pain");
    expect(brief.safetyDisclaimer).toBe(REQUIRED_DISCLAIMER);
    const calls = fetchMock.mock.calls as unknown as Array<[unknown, RequestInit | undefined]>;
    const body = JSON.parse(String(calls[0]?.[1]?.body)) as { messages: Array<{ content: string }> };
    const userPrompt = body.messages.find((message) => message.content.includes("reviewedFacts"))?.content ?? "";
    expect(userPrompt).toContain("Confirmed knee pain after walking");
    expect(userPrompt).not.toContain("Rejected penicillin allergy");
  });

  it("excludes rejected facts even if a provider response tries to include them", async () => {
    vi.stubEnv("FIREWORKS_API_KEY", "test-key");
    vi.stubEnv("FIREWORKS_MODEL", "accounts/fireworks/models/test");
    mockFireworksResponse(makeAiBrief({ ninetySecondStory: "I need to discuss the Rejected penicillin allergy." }));

    const brief = await buildAppointmentBrief({ record: makeRecord(), briefType: "PREOP" });

    expect(JSON.stringify(brief)).not.toContain("Rejected penicillin allergy");
    expect(brief.safetyDisclaimer).toBe(REQUIRED_DISCLAIMER);
  });
});

function makeRecord(): ClinicCaseSnapshot {
  const now = "2026-06-19T00:00:00.000Z";
  const facts: ExtractedFact[] = [
    {
      id: "fact-confirmed",
      caseId: "case-brief",
      sourceDocId: "doc-1",
      category: "SYMPTOM",
      displayText: "Confirmed knee pain after walking",
      value: { text: "knee pain after walking" },
      confidence: 0.92,
      userStatus: "CONFIRMED",
      createdAt: now
    },
    {
      id: "fact-rejected",
      caseId: "case-brief",
      sourceDocId: "doc-1",
      category: "ALLERGY",
      displayText: "Rejected penicillin allergy",
      value: { text: "penicillin allergy" },
      confidence: 0.91,
      userStatus: "REJECTED",
      createdAt: now
    }
  ];

  return {
    id: "case-brief",
    title: "Brief test case",
    mode: "PREOP",
    status: "REVIEWED",
    consentAccepted: true,
    consentedAt: now,
    documents: [],
    sourcePreviews: [],
    facts,
    questions: [
      {
        id: "q-1",
        priority: "high",
        question: "What changed since the last appointment?",
        whyItMattersForAppointment: "Keeps the story focused.",
        answerType: "short_text"
      }
    ],
    timeline: [],
    medications: [],
    symptoms: [],
    appointments: [],
    briefs: [],
    rehearsals: [],
    createdAt: now,
    updatedAt: now
  };
}

function makeAiBrief(overrides: Partial<ClinicBriefOutput> = {}): ClinicBriefOutput {
  return {
    title: "Pre-op nurse brief",
    oneLineReasonForVisit: "Pre-op appointment prep: Review confirmed information before the appointment.",
    ninetySecondStory: "I want to explain the confirmed notes clearly.",
    keyTimeline: [{ dateLabel: "Date not provided", event: "Confirmed knee pain after walking" }],
    currentMedications: [],
    allergiesAndImportantNotes: [],
    whatChangedSinceLastAppointment: ["Confirmed knee pain after walking"],
    questionsForClinician: ["What details should I confirm at the appointment?"],
    openUncertainties: ["Review open questions before sharing."],
    sourceCoverage: [{ section: "Reviewed facts", sourceCount: 1 }],
    safetyDisclaimer: REQUIRED_DISCLAIMER,
    ...overrides
  };
}

function mockFireworksResponse(content: unknown) {
  const fetchMock = vi.fn(async () => new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(content) } }] }), { status: 200 }));
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}
