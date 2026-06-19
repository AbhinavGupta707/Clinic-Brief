import type { BriefType, ClinicBriefOutput } from "@clinicbrief/types";

export type BriefModeDefinition = {
  type: BriefType;
  label: string;
  shortLabel: string;
  audience: string;
  purpose: string;
  emphasis: string[];
};

export const BRIEF_MODE_DEFINITIONS: BriefModeDefinition[] = [
  {
    type: "GP",
    label: "GP brief",
    shortLabel: "GP",
    audience: "GP or primary care appointment",
    purpose: "Summarize the reason for visit, recent changes, current questions, and open uncertainties.",
    emphasis: ["Reason for visit", "Timeline", "Questions to ask"]
  },
  {
    type: "CONSULTANT",
    label: "Consultant brief",
    shortLabel: "Consultant",
    audience: "Specialist or consultant review",
    purpose: "Keep the timeline, source coverage, and unresolved details easy to scan before a specialist conversation.",
    emphasis: ["Timeline", "Source coverage", "Uncertainties"]
  },
  {
    type: "PREOP",
    label: "Pre-op nurse brief",
    shortLabel: "Pre-op",
    audience: "Pre-op nurse call",
    purpose: "Prepare practical surgery-readiness context without giving clinical instructions.",
    emphasis: ["Allergies", "Medication timing", "Transport and support"]
  },
  {
    type: "FAMILY_HANDOFF",
    label: "Family / carer handoff",
    shortLabel: "Handoff",
    audience: "Family member, carer, or trusted helper",
    purpose: "Create a plain-language handoff card for someone helping with appointment prep.",
    emphasis: ["Plain-language story", "Practical support", "Questions to keep consistent"]
  },
  {
    type: "NINETY_SECOND_STORY",
    label: "90-second story",
    shortLabel: "90 seconds",
    audience: "Opening explanation at an appointment",
    purpose: "Give the patient a concise script they can rehearse and adjust in their own words.",
    emphasis: ["Opening script", "What changed", "Key ask"]
  }
];

const modeDefinitionsByType = Object.fromEntries(BRIEF_MODE_DEFINITIONS.map((mode) => [mode.type, mode])) as Record<
  BriefType,
  BriefModeDefinition
>;

const modeTitles: Record<BriefType, string> = {
  GP: "GP appointment brief",
  CONSULTANT: "Consultant appointment brief",
  PREOP: "Pre-op nurse brief",
  FAMILY_HANDOFF: "Family and carer handoff card",
  NINETY_SECOND_STORY: "90-second appointment story"
};

const modeReasonPrefixes: Record<BriefType, string> = {
  GP: "Primary care appointment prep",
  CONSULTANT: "Specialist appointment prep",
  PREOP: "Pre-op appointment prep",
  FAMILY_HANDOFF: "Family or carer handoff",
  NINETY_SECOND_STORY: "Short spoken appointment story"
};

export function getBriefModeDefinition(briefType: BriefType): BriefModeDefinition {
  return modeDefinitionsByType[briefType];
}

export function buildBriefVariant(brief: ClinicBriefOutput, briefType: BriefType): ClinicBriefOutput {
  const definition = getBriefModeDefinition(briefType);

  return {
    ...brief,
    title: modeTitles[briefType],
    oneLineReasonForVisit: `${modeReasonPrefixes[briefType]}: ${brief.oneLineReasonForVisit}`,
    questionsForClinician:
      briefType === "FAMILY_HANDOFF"
        ? [
            "What should we make sure is said consistently at the appointment?",
            "Which practical details should we confirm before travel or discharge?",
            ...brief.questionsForClinician
          ]
        : brief.questionsForClinician,
    openUncertainties:
      briefType === "NINETY_SECOND_STORY"
        ? ["Practice this script, then check the full brief for details before sharing.", ...brief.openUncertainties]
        : brief.openUncertainties,
    sourceCoverage: [{ section: definition.shortLabel, sourceCount: brief.sourceCoverage.length }, ...brief.sourceCoverage]
  };
}

export function briefToMarkdown(brief: ClinicBriefOutput): string {
  return [
    `# ${brief.title}`,
    "",
    `**Reason for visit:** ${brief.oneLineReasonForVisit}`,
    "",
    "## 90-second story",
    brief.ninetySecondStory,
    "",
    "## Key timeline",
    ...listItems(
      brief.keyTimeline.map((item) => `${item.dateLabel}: ${item.event}`),
      "No timeline events have been confirmed yet."
    ),
    "",
    "## Current medications",
    ...listItems(
      brief.currentMedications.map((item) => [item.name, item.dose, item.frequency, item.notes].filter(Boolean).join(" - ")),
      "No current medications were confirmed in the reviewed information."
    ),
    "",
    "## Allergies and important notes",
    ...listItems(brief.allergiesAndImportantNotes, "No allergies or important notes were confirmed yet."),
    "",
    "## What changed since last appointment",
    ...listItems(brief.whatChangedSinceLastAppointment, "No changes have been confirmed yet."),
    "",
    "## Questions for clinician",
    ...listItems(brief.questionsForClinician, "No questions have been added yet."),
    "",
    "## Open uncertainties",
    ...listItems(brief.openUncertainties, "No open uncertainties were recorded."),
    "",
    "## Source coverage",
    ...listItems(
      brief.sourceCoverage.map((item) => `${item.section}: ${item.sourceCount} source${item.sourceCount === 1 ? "" : "s"}`),
      "No source coverage is available."
    ),
    "",
    "## Safety note",
    brief.safetyDisclaimer
  ].join("\n");
}

export type ExportBundle = {
  title: string;
  briefType: BriefType;
  markdown: string;
  plainText: string;
  markdownFileName: string;
  pdfFileName: string;
  pdfFallback: {
    method: "browser_print";
    label: string;
    instructions: string;
  };
};

export function buildExportBundle(brief: ClinicBriefOutput, briefType: BriefType): ExportBundle {
  const markdown = briefToMarkdown(brief);
  const slug = slugify(`${briefType.toLowerCase()}-${brief.title}`);

  return {
    title: brief.title,
    briefType,
    markdown,
    plainText: markdown.replace(/[#*_`]/g, ""),
    markdownFileName: `${slug}.md`,
    pdfFileName: `${slug}.pdf`,
    pdfFallback: {
      method: "browser_print",
      label: "Print or save as PDF",
      instructions: "Use the browser print dialog and choose Save as PDF if the PDF renderer is unavailable."
    }
  };
}

function listItems(items: string[], fallback: string): string[] {
  const cleanItems = items.map((item) => item.trim()).filter(Boolean);
  return cleanItems.length > 0 ? cleanItems.map((item) => `- ${item}`) : [`- ${fallback}`];
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 72);
}
