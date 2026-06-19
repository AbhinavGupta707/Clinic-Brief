export type MissingQuestion = {
  id: string;
  priority: "low" | "medium" | "high";
  question: string;
  whyItMattersForAppointment: string;
  answerType: "short_text" | "date" | "yes_no" | "medication" | "allergy";
};

export type ClinicBriefOutput = {
  title: string;
  oneLineReasonForVisit: string;
  ninetySecondStory: string;
  keyTimeline: Array<{ dateLabel: string; event: string }>;
  currentMedications: Array<{ name: string; dose?: string; frequency?: string; notes?: string }>;
  allergiesAndImportantNotes: string[];
  whatChangedSinceLastAppointment: string[];
  questionsForClinician: string[];
  openUncertainties: string[];
  sourceCoverage: Array<{ section: string; sourceCount: number }>;
  safetyDisclaimer: string;
};

export type RehearsalMode = "PREOP_NURSE" | "CONSULTANT" | "GP";

export type RehearsalSuggestedFactUpdate = {
  type: "missing_question_answer";
  questionId: string;
  requiresUserReview: true;
  proposedDisplayText: string;
};

export type RehearsalAgentOutput = {
  assistantMessage: string;
  blocked: boolean;
  suggestedFactUpdates?: RehearsalSuggestedFactUpdate[];
};
