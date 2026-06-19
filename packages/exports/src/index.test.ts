import { describe, expect, it } from "vitest";
import { Buffer } from "node:buffer";
import pdfParse from "pdf-parse";
import type { ClinicBriefOutput } from "@clinicbrief/types";
import {
  BRIEF_MODE_DEFINITIONS,
  briefToMarkdown,
  buildBriefFromReviewedFacts,
  buildBriefVariant,
  buildExportBundle,
  buildTimelineFromReviewedFacts,
  generateBriefPdf
} from "./index";

const requiredDisclaimer =
  "ClinicBrief organizes information you provide so you can prepare for appointments. It does not diagnose, recommend treatment, or replace medical advice. Review everything before sharing it with a clinician.";

const baseBrief: ClinicBriefOutput = {
  title: "Pre-op nurse brief",
  oneLineReasonForVisit: "Preparing for a synthetic appointment.",
  ninetySecondStory: "I am preparing a consistent story for my appointment.",
  keyTimeline: [{ dateLabel: "Today", event: "Preparing appointment notes." }],
  currentMedications: [],
  allergiesAndImportantNotes: ["Allergy status needs confirmation."],
  whatChangedSinceLastAppointment: ["Preparing practical questions."],
  questionsForClinician: ["What should I bring to the appointment?"],
  openUncertainties: ["Transport support"],
  sourceCoverage: [{ section: "Synthetic notes", sourceCount: 1 }],
  safetyDisclaimer: requiredDisclaimer
};

describe("brief export helpers", () => {
  it("defines every required output mode", () => {
    expect(BRIEF_MODE_DEFINITIONS.map((mode) => mode.type)).toEqual([
      "GP",
      "CONSULTANT",
      "PREOP",
      "FAMILY_HANDOFF",
      "NINETY_SECOND_STORY"
    ]);
  });

  it("keeps the required disclaimer in Markdown for every mode", () => {
    for (const mode of BRIEF_MODE_DEFINITIONS) {
      const markdown = briefToMarkdown(buildBriefVariant(baseBrief, mode.type));
      expect(markdown).toContain(requiredDisclaimer);
      expect(markdown).toContain("## Safety note");
    }
  });

  it("creates a PDF fallback and Markdown bundle", () => {
    const bundle = buildExportBundle(buildBriefVariant(baseBrief, "PREOP"), "PREOP");
    expect(bundle.pdfFallback.method).toBe("browser_print");
    expect(bundle.markdownFileName).toMatch(/preop/);
    expect(bundle.markdown).toContain("# Pre-op nurse brief");
  });

  it("generates a non-empty PDF with inspectable title and disclaimer text", async () => {
    const pdf = await generateBriefPdf(buildBriefVariant(baseBrief, "PREOP"), "PREOP");

    expect(pdf.byteLength).toBeGreaterThan(1000);
    const parsed = await pdfParse(Buffer.from(pdf));
    const text = parsed.text.replace(/\s+/g, " ");
    expect(text).toContain("Pre-op nurse brief");
    expect(text).toContain(requiredDisclaimer);
  });

  it("generates timelines from confirmed, edited, and high-confidence unrejected facts only", () => {
    const timeline = buildTimelineFromReviewedFacts("case-output", [
      makeFact("confirmed", "SYMPTOM", "CONFIRMED", 0.5),
      makeFact("edited", "MEDICATION", "EDITED", 0.5),
      makeFact("confident", "TEST_RESULT", "UNREVIEWED", 0.92),
      makeFact("rejected", "APPOINTMENT", "REJECTED", 1)
    ]);

    expect(timeline.map((event) => event.sourceFactIds?.[0])).toEqual(["confirmed", "edited", "confident"]);
    expect(timeline.map((event) => event.description).join(" ")).not.toContain("rejected");
  });

  it("builds a brief with source coverage and without rejected facts", () => {
    const brief = buildBriefFromReviewedFacts({
      caseTitle: "Synthetic review",
      briefType: "GP",
      facts: [makeFact("keep", "SYMPTOM", "CONFIRMED", 0.88), makeFact("drop", "MEDICATION", "REJECTED", 1)],
      questions: [
        {
          id: "question-1",
          priority: "high",
          question: "What changed since the last appointment?",
          whyItMattersForAppointment: "It helps organize the story.",
          answerType: "short_text"
        }
      ],
      timeline: [],
      sourcePreviews: []
    });

    expect(brief.safetyDisclaimer).toContain("does not diagnose");
    expect(brief.ninetySecondStory).toContain("keep");
    expect(brief.ninetySecondStory).not.toContain("drop");
    expect(brief.sourceCoverage.some((item) => item.section === "Reviewed facts")).toBe(true);
  });
});

function makeFact(id: string, category: "SYMPTOM" | "MEDICATION" | "TEST_RESULT" | "APPOINTMENT", userStatus: "CONFIRMED" | "EDITED" | "UNREVIEWED" | "REJECTED", confidence: number) {
  return {
    id,
    caseId: "case-output",
    sourceDocId: "doc-output",
    category,
    displayText: `Source mentions: ${id} output fact.`,
    value: { text: `${id} output fact.` },
    confidence,
    userStatus,
    sourceQuote: `${id} output fact.`,
    createdAt: "2026-06-19T00:00:00.000Z"
  };
}
