import type { CaseMode } from "@clinicbrief/types";

export type AppointmentModeSuggestion = {
  mode: CaseMode;
  explanation: string;
};

type ModeRule = {
  mode: CaseMode;
  pattern: RegExp;
  explanation: string;
};

const MODE_RULES: ModeRule[] = [
  {
    mode: "PREOP",
    pattern: /\b(surgery|pre[\s-]?op|anaesthetic|anesthetic|operations?)\b/i,
    explanation: "Suggested pre-op mode because the wording points to a surgery-preparation workflow, not a diagnosis."
  },
  {
    mode: "CARER",
    pattern: /\b(my\s+(mum|mother|dad|child)|caring\s+for|behalf\s+of|carers?|caregivers?)\b/i,
    explanation: "Suggested carer mode because the wording indicates you may be preparing information for someone else."
  },
  {
    mode: "CHRONIC",
    pattern: /\b(months|years|flares?|ongoing|chronic|baseline|tracking|recurring)\b/i,
    explanation: "Suggested chronic mode because the wording points to an ongoing or longitudinal appointment-prep workflow."
  }
];

const GENERAL_EXPLANATION = "Suggested general mode because no supported workflow cue was found.";

export function suggestAppointmentMode(input: string | string[]): AppointmentModeSuggestion {
  const text = Array.isArray(input) ? input.join(" ") : input;

  for (const rule of MODE_RULES) {
    if (rule.pattern.test(text)) {
      return {
        mode: rule.mode,
        explanation: rule.explanation
      };
    }
  }

  return {
    mode: "GENERAL",
    explanation: GENERAL_EXPLANATION
  };
}
