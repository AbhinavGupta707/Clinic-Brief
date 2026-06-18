import type { ClinicBriefOutput } from "@clinicbrief/types";

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
    ...brief.keyTimeline.map((item) => `- ${item.dateLabel}: ${item.event}`),
    "",
    "## Questions for clinician",
    ...brief.questionsForClinician.map((question) => `- ${question}`),
    "",
    brief.safetyDisclaimer
  ].join("\n");
}
