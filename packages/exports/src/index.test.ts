import { describe, expect, it } from "vitest";
import type { ClinicBriefOutput } from "@clinicbrief/types";
import { BRIEF_MODE_DEFINITIONS, briefToMarkdown, buildBriefVariant, buildExportBundle } from "./index";

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
});
