import type { BriefType, ClinicBriefOutput, ExtractedFact, MissingQuestion, SourcePreview, TimelineEvent } from "@clinicbrief/types";

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

export const REQUIRED_SAFETY_DISCLAIMER =
  "ClinicBrief organizes information you provide so you can prepare for appointments. It does not diagnose, recommend treatment, or replace medical advice. Review everything before sharing it with a clinician.";

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

export function getFactsForGeneratedOutputs(facts: ExtractedFact[]): ExtractedFact[] {
  return facts.filter((fact) => fact.userStatus !== "REJECTED" && (fact.userStatus === "CONFIRMED" || fact.userStatus === "EDITED" || fact.confidence >= 0.8));
}

export function buildTimelineFromReviewedFacts(caseId: string, facts: ExtractedFact[]): TimelineEvent[] {
  return getFactsForGeneratedOutputs(facts).map((fact, index) => ({
    id: `timeline-${caseId}-${fact.id}`,
    caseId,
    date: getFactDate(fact),
    approximateDate: getFactDate(fact) ? undefined : "Date not provided",
    type: timelineTypeForFact(fact),
    title: timelineTitleForFact(fact),
    description: fact.displayText,
    sourceFactIds: [fact.id],
    createdAt: new Date(Date.now() + index).toISOString()
  }));
}

export function buildBriefFromReviewedFacts(input: {
  caseTitle: string;
  briefType: BriefType;
  facts: ExtractedFact[];
  questions: MissingQuestion[];
  timeline: TimelineEvent[];
  sourcePreviews: SourcePreview[];
  appointmentGoal?: string;
}): ClinicBriefOutput {
  const facts = getFactsForGeneratedOutputs(input.facts);
  const timeline = input.timeline.length > 0 ? input.timeline : buildTimelineFromReviewedFacts("case", facts);
  const medicationFacts = facts.filter((fact) => fact.category === "MEDICATION");
  const allergyFacts = facts.filter((fact) => fact.category === "ALLERGY");
  const symptomFacts = facts.filter((fact) => fact.category === "SYMPTOM");
  const questionFacts = facts.filter((fact) => fact.category === "QUESTION");
  const notableFacts = facts.filter((fact) => fact.category !== "MEDICATION" && fact.category !== "QUESTION" && fact.category !== "SYMPTOM");
  const questionsForClinician = [
    ...questionFacts.map((fact) => cleanDisplayText(fact.displayText)),
    ...input.questions.slice(0, 6).map((question) => question.question)
  ];
  const openUncertainties = input.questions.slice(0, 6).map((question) => question.whyItMattersForAppointment);
  const storyFacts = facts.slice(0, 4).map((fact) => cleanDisplayText(fact.displayText));

  return buildBriefVariant(
    {
      title: modeTitles[input.briefType],
      oneLineReasonForVisit: input.appointmentGoal?.trim() || `${input.caseTitle}: appointment preparation from reviewed source information.`,
      ninetySecondStory:
        storyFacts.length > 0
          ? `I am preparing for this appointment and have reviewed the notes I provided. The main points I want to explain are: ${storyFacts.join(" ")} I would like to confirm the open questions with the clinician.`
          : "I am preparing for this appointment and want to use the time to explain my notes clearly, confirm missing details, and ask the questions listed in this brief.",
      keyTimeline: timeline.map((event) => ({
        dateLabel: event.date ?? event.approximateDate ?? "Date not provided",
        event: event.description
      })),
      currentMedications: medicationFacts.map((fact) => ({
        name: cleanDisplayText(fact.displayText),
        notes: sourceLabel(fact)
      })),
      allergiesAndImportantNotes: [...allergyFacts, ...notableFacts].slice(0, 8).map((fact) => cleanDisplayText(fact.displayText)),
      whatChangedSinceLastAppointment: symptomFacts.length > 0 ? symptomFacts.map((fact) => cleanDisplayText(fact.displayText)) : facts.slice(0, 5).map((fact) => cleanDisplayText(fact.displayText)),
      questionsForClinician,
      openUncertainties: openUncertainties.length > 0 ? openUncertainties : ["Review any unconfirmed details before sharing this brief."],
      sourceCoverage: buildSourceCoverage(facts, input.sourcePreviews, input.questions),
      safetyDisclaimer: REQUIRED_SAFETY_DISCLAIMER
    },
    input.briefType
  );
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

function buildSourceCoverage(facts: ExtractedFact[], sourcePreviews: SourcePreview[], questions: MissingQuestion[]): ClinicBriefOutput["sourceCoverage"] {
  const sourceIds = new Set(facts.map((fact) => fact.sourceDocId).filter(Boolean));

  return [
    { section: "Reviewed facts", sourceCount: facts.length },
    { section: "Source documents", sourceCount: sourceIds.size || sourcePreviews.length },
    { section: "Open questions", sourceCount: questions.length }
  ];
}

function timelineTypeForFact(fact: ExtractedFact): TimelineEvent["type"] {
  if (fact.category === "MEDICATION") {
    return "MEDICATION_CHANGE";
  }

  if (fact.category === "SYMPTOM") {
    return "SYMPTOM_CHANGE";
  }

  if (fact.category === "APPOINTMENT") {
    return "APPOINTMENT";
  }

  if (fact.category === "TEST_RESULT") {
    return "TEST";
  }

  if (fact.category === "PROCEDURE") {
    return "PROCEDURE";
  }

  return "NOTE";
}

function timelineTitleForFact(fact: ExtractedFact): string {
  const labels: Record<ExtractedFact["category"], string> = {
    ALLERGY: "Allergy or reaction detail captured",
    APPOINTMENT: "Appointment detail captured",
    CONTACT: "Support contact detail captured",
    HISTORY_ITEM: "History item captured",
    MEDICATION: "Medication detail captured",
    PROCEDURE: "Procedure detail captured",
    QUESTION: "Question captured",
    SYMPTOM: "Symptom or change captured",
    TEST_RESULT: "Test or result captured"
  };

  return labels[fact.category];
}

function getFactDate(fact: ExtractedFact): string | undefined {
  const value = fact.value.date ?? fact.value.dateLabel ?? fact.value.appointmentDate;
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function sourceLabel(fact: ExtractedFact): string | undefined {
  return fact.sourceDocId ? `Source: ${fact.sourceDocId}` : undefined;
}

function cleanDisplayText(value: string): string {
  return value.replace(/^Source mentions:\s*/i, "").trim();
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 72);
}
