import type { ClinicCaseSnapshot } from "@clinicbrief/types";
import { afterEach, describe, expect, it, vi } from "vitest";

import { buildCaseExtraction, createSourceTextFallbackExtraction } from "./extraction-service";

describe("extraction service fallback", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("creates deterministic facts from the user's source text", () => {
    const extraction = createSourceTextFallbackExtraction("case-fallback", "PREOP", [
      makeDocument(
        "doc-1",
        "Medication list: Uses blue inhaler before exercise. Symptom diary: knee pain worse after walking. Pre-op appointment is next month."
      )
    ]);

    expect(extraction.source).toBe("fixture");
    expect(extraction.facts.map((fact) => fact.category)).toEqual(["MEDICATION", "SYMPTOM", "APPOINTMENT"]);
    expect(extraction.facts[0]?.sourceDocId).toBe("doc-1");
    expect(extraction.facts[0]?.value.extractionSource).toBe("fixture");
    expect(extraction.facts[0]?.displayText).toContain("Source mentions");
  });

  it("asks safe context questions when no source text is available", () => {
    const extraction = createSourceTextFallbackExtraction("case-empty", "GENERAL", []);

    expect(extraction.facts).toHaveLength(0);
    expect(extraction.questions[0]?.question).toContain("main outcome");
    expect(extraction.questions.map((question) => question.question).join(" ")).not.toMatch(/diagnos|treatment/i);
  });

  it("creates chronic fallback questions and separates investigated conditions from confirmed history", () => {
    const extraction = createSourceTextFallbackExtraction("case-chronic", "CHRONIC", [
      makeDocument(
        "doc-1",
        "Diagnosed asthma in childhood. Possible migraine is being investigated by neurology. Baseline fatigue most days. Flares after busy work weeks affect sleep."
      )
    ]);

    expect(extraction.facts.map((fact) => fact.value.chronicFieldId)).toEqual([
      "reported_confirmed_history",
      "conditions_being_investigated",
      "baseline_symptoms",
      "flares_or_episodes"
    ]);
    expect(extraction.facts[0]?.displayText).toContain("User-reported confirmed history");
    expect(extraction.facts[1]?.displayText).toContain("not confirmed by ClinicBrief");
    expect(extraction.questions.map((question) => question.chronicFieldId)).toContain("functional_impact");
    expect(extraction.questions.map((question) => question.question).join(" ")).not.toMatch(/should I take|diagnos|urgent|risk/i);
  });

  it("uses mocked Fireworks output for source-linked extraction", async () => {
    vi.stubEnv("FIREWORKS_API_KEY", "test-key");
    vi.stubEnv("FIREWORKS_MODEL", "accounts/fireworks/models/test");
    mockFireworksResponse({
      facts: [
        {
          sourceDocId: "doc-1",
          category: "SYMPTOM",
          displayText: "Knee pain is worse after walking.",
          value: { text: "knee pain worse after walking" },
          confidence: 0.9,
          sourceQuote: "knee pain worse after walking"
        }
      ],
      questions: [
        {
          id: "q-1",
          priority: "high",
          question: "When did the walking-related pain change?",
          whyItMattersForAppointment: "Timing helps the appointment story stay clear.",
          answerType: "short_text"
        }
      ]
    });

    const extraction = await buildCaseExtraction(makeRecord("knee pain worse after walking."));

    expect(extraction.source).toBe("fireworks");
    expect(extraction.facts[0]?.value.extractionSource).toBe("fireworks");
    expect(extraction.facts[0]?.sourceDocId).toBe("doc-1");
    expect(extraction.questions[0]?.id).toBe("q-1");
  });

  it("sends chronic mode extraction constraints to Fireworks", async () => {
    vi.stubEnv("FIREWORKS_API_KEY", "test-key");
    vi.stubEnv("FIREWORKS_MODEL", "accounts/fireworks/models/test");
    const fetchMock = mockFireworksResponse({
      facts: [
        {
          sourceDocId: "doc-1",
          category: "HISTORY_ITEM",
          displayText: "User reports possible migraine is being investigated.",
          value: { text: "possible migraine is being investigated", chronicFieldId: "conditions_being_investigated" },
          confidence: 0.86,
          sourceQuote: "possible migraine is being investigated"
        }
      ],
      questions: [
        {
          id: "q-chronic-1",
          priority: "high",
          question: "What is the baseline symptom pattern?",
          whyItMattersForAppointment: "Baseline helps describe a longitudinal story.",
          answerType: "short_text",
          chronicFieldId: "baseline_symptoms"
        }
      ]
    });

    const extraction = await buildCaseExtraction(makeRecord("Possible migraine is being investigated.", "CHRONIC"));
    const calls = fetchMock.mock.calls as unknown as Array<[unknown, RequestInit | undefined]>;
    const body = JSON.parse(String(calls[0]?.[1]?.body)) as { messages: Array<{ content: string }> };
    const userPrompt = body.messages.find((message) => message.content.includes("caseMode"))?.content ?? "";

    expect(extraction.source).toBe("fireworks");
    expect(userPrompt).toContain('"caseMode":"CHRONIC"');
    expect(userPrompt).toContain("conditions_being_investigated");
    expect(extraction.questions[0]?.chronicFieldId).toBe("baseline_symptoms");
  });

  it("falls back safely when the provider fails", async () => {
    vi.stubEnv("FIREWORKS_API_KEY", "test-key");
    vi.stubEnv("FIREWORKS_MODEL", "accounts/fireworks/models/test");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("unavailable", { status: 500, statusText: "Server Error" }))
    );

    const extraction = await buildCaseExtraction(makeRecord("Medication list: blue inhaler before exercise."));

    expect(extraction.source).toBe("fixture");
    expect(extraction.facts[0]?.value.extractionSource).toBe("fixture");
  });
});

function makeDocument(id: string, text: string) {
  return {
    id,
    type: "TEXT_NOTE" as const,
    fileName: `${id}.txt`,
    text
  };
}

function makeRecord(text: string, mode: ClinicCaseSnapshot["mode"] = "PREOP"): ClinicCaseSnapshot {
  const now = "2026-06-19T00:00:00.000Z";

  return {
    id: "case-test",
    title: "Test case",
    mode,
    status: "INTAKE_STARTED",
    consentAccepted: true,
    consentedAt: now,
    documents: [
      {
        id: "doc-1",
        caseId: "case-test",
        type: "TEXT_NOTE",
        fileName: "note.txt",
        rawText: text,
        createdAt: now
      }
    ],
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
    updatedAt: now
  };
}

function mockFireworksResponse(content: unknown) {
  const fetchMock = vi.fn(async () => new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(content) } }] }), { status: 200 }));
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}
