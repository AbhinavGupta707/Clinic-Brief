export type MissingQuestion = {
  id: string;
  priority: "low" | "medium" | "high";
  question: string;
  whyItMattersForAppointment: string;
  answerType: "short_text" | "date" | "yes_no" | "medication" | "allergy";
  chronicFieldId?:
    | "reported_confirmed_history"
    | "conditions_being_investigated"
    | "baseline_symptoms"
    | "flares_or_episodes"
    | "current_medications_and_treatments_tried"
    | "functional_impact"
    | "possible_triggers_to_discuss"
    | "changed_since_last_appointment"
    | "questions_for_clinician";
};

export type ChronicBriefSections = {
  reportedConfirmedHistory: string[];
  conditionsBeingInvestigated: string[];
  baselineSymptomsAndFlares: string[];
  medicationAndTreatmentHistory: string[];
  functionalImpact: string[];
  appointmentGoals: string[];
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
  chronicSections?: ChronicBriefSections;
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
