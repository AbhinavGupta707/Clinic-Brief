import { beforeEach, describe, expect, it, vi } from "vitest";
import { generateBriefPdf, REQUIRED_SAFETY_DISCLAIMER } from "@clinicbrief/exports";
import type { ClinicCaseSnapshot } from "@clinicbrief/types";

import { getClinicRepository } from "../../../../../lib/server/clinic-repository";
import { POST } from "./route";

vi.mock("../../../../../lib/server/clinic-repository", () => ({
  getClinicRepository: vi.fn()
}));

vi.mock("@clinicbrief/exports", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@clinicbrief/exports")>();

  return {
    ...actual,
    generateBriefPdf: vi.fn()
  };
});

const mockedGetClinicRepository = vi.mocked(getClinicRepository);
const mockedGenerateBriefPdf = vi.mocked(generateBriefPdf);

describe("case export route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedGetClinicRepository.mockResolvedValue({
      getCase: vi.fn(async () => makeCaseRecord())
    } as unknown as Awaited<ReturnType<typeof getClinicRepository>>);
  });

  it("returns a server-generated PDF response when rendering succeeds", async () => {
    mockedGenerateBriefPdf.mockResolvedValue(new Uint8Array([37, 80, 68, 70, 45]));

    const response = await POST(makeRequest(), { params: Promise.resolve({ caseId: "case-export" }) });

    expect(response.headers.get("content-type")).toBe("application/pdf");
    expect(response.headers.get("content-disposition")).toContain(".pdf");
    expect(response.headers.get("x-clinicbrief-pdf-generated")).toBe("true");
    expect((await response.arrayBuffer()).byteLength).toBe(5);
  });

  it("returns Markdown and browser-print fallback when PDF rendering fails", async () => {
    mockedGenerateBriefPdf.mockRejectedValue(new Error("renderer unavailable"));

    const response = await POST(makeRequest(), { params: Promise.resolve({ caseId: "case-export" }) });
    const payload = await response.json();

    expect(response.headers.get("content-type")).toContain("application/json");
    expect(payload.ok).toBe(true);
    expect(payload.data.pdfGenerated).toBe(false);
    expect(payload.data.bundle.pdfFallback.method).toBe("browser_print");
    expect(payload.data.bundle.markdown).toContain(REQUIRED_SAFETY_DISCLAIMER);
  });
});

function makeRequest(): Request {
  return new Request("http://localhost/api/cases/case-export/export", {
    method: "POST",
    body: JSON.stringify({ briefType: "PREOP" })
  });
}

function makeCaseRecord(): ClinicCaseSnapshot {
  const now = "2026-06-19T00:00:00.000Z";

  return {
    id: "case-export",
    title: "Export test case",
    mode: "PREOP",
    status: "BRIEF_GENERATED",
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
    briefs: [
      {
        id: "brief-export",
        caseId: "case-export",
        briefType: "PREOP",
        title: "Pre-op nurse brief",
        briefJson: {
          title: "Pre-op nurse brief",
          oneLineReasonForVisit: "Pre-op appointment prep: Preparing for a synthetic appointment.",
          ninetySecondStory: "I am preparing a consistent story for my appointment.",
          keyTimeline: [{ dateLabel: "Today", event: "Preparing appointment notes." }],
          currentMedications: [],
          allergiesAndImportantNotes: ["Allergy status needs confirmation."],
          whatChangedSinceLastAppointment: ["Preparing practical questions."],
          questionsForClinician: ["What should I bring to the appointment?"],
          openUncertainties: ["Transport support"],
          sourceCoverage: [{ section: "Synthetic notes", sourceCount: 1 }],
          safetyDisclaimer: REQUIRED_SAFETY_DISCLAIMER
        },
        markdown: "",
        createdAt: now
      }
    ],
    rehearsals: [],
    createdAt: now,
    updatedAt: now
  };
}
