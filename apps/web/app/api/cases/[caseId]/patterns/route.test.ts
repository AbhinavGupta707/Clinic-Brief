import type { ClinicCaseSnapshot, ExtractedFact } from "@clinicbrief/types";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { getClinicRepository } from "../../../../../lib/server/clinic-repository";
import { POST } from "./route";

vi.mock("../../../../../lib/server/clinic-repository", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../../../../lib/server/clinic-repository")>();

  return {
    ...actual,
    getClinicRepository: vi.fn()
  };
});

const mockedGetClinicRepository = vi.mocked(getClinicRepository);

describe("case patterns route", () => {
  const setExtraction = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    const record = makeRecord({
      facts: [
        makeFact({ id: "symptom-1", category: "SYMPTOM", displayText: "Walking pain changed since the last appointment", userStatus: "CONFIRMED" }),
        makeFact({ id: "medication-1", category: "MEDICATION", displayText: "Medication list should be confirmed", userStatus: "CONFIRMED" })
      ]
    });

    setExtraction.mockImplementation(async (_caseId: string, facts: ExtractedFact[]) => ({
      ...record,
      facts
    }));
    mockedGetClinicRepository.mockResolvedValue({
      getCase: vi.fn(async () => record),
      setExtraction
    } as unknown as Awaited<ReturnType<typeof getClinicRepository>>);
  });

  it("persists generated pattern marker facts and returns PatternCard-shaped data", async () => {
    const response = await POST(new Request("http://localhost/api/cases/case-patterns/patterns", { method: "POST" }), {
      params: Promise.resolve({ caseId: "case-patterns" })
    });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(payload.data.patternCards.length).toBeGreaterThan(0);
    expect(payload.data.patternCards[0]).toMatchObject({
      requiresUserReview: true,
      userStatus: "UNREVIEWED"
    });
    expect(setExtraction).toHaveBeenCalledWith(
      "case-patterns",
      expect.arrayContaining([
        expect.objectContaining({
          value: expect.objectContaining({ kind: "pattern_card" })
        })
      ]),
      []
    );
  });
});

function makeRecord(overrides: Partial<ClinicCaseSnapshot> = {}): ClinicCaseSnapshot {
  const now = "2026-06-19T00:00:00.000Z";

  return {
    id: "case-patterns",
    title: "Pattern route test case",
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
