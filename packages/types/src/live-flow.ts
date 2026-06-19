export const GUIDED_INTAKE_STEPS = [
  "appointment_goal",
  "story_starter",
  "timeline_anchors",
  "medications_allergies",
  "documents",
  "review_before_extraction"
] as const;

export type GuidedIntakeStepId = (typeof GUIDED_INTAKE_STEPS)[number];

export const CHRONIC_APPOINTMENT_FOCUS_OPTIONS = [
  "GP_REVIEW",
  "CONSULTANT_SPECIALIST",
  "RHEUMATOLOGY",
  "NEUROLOGY",
  "GASTROENTEROLOGY",
  "ENDOCRINOLOGY",
  "PAIN_CLINIC",
  "GYNAECOLOGY",
  "LONG_COVID_FATIGUE",
  "CARER_HANDOFF",
  "GENERAL_CHRONIC_REVIEW"
] as const;

export type ChronicAppointmentFocus = (typeof CHRONIC_APPOINTMENT_FOCUS_OPTIONS)[number];

export const CHRONIC_INTAKE_FIELDS = [
  "reported_confirmed_history",
  "conditions_being_investigated",
  "baseline_symptoms",
  "flares_or_episodes",
  "current_medications_and_treatments_tried",
  "functional_impact",
  "possible_triggers_to_discuss",
  "changed_since_last_appointment",
  "questions_for_clinician"
] as const;

export type ChronicIntakeFieldId = (typeof CHRONIC_INTAKE_FIELDS)[number];

export type GuidedIntakeCaptureMethod = "typed" | "pasted" | "browser_speech_transcript" | "uploaded_document" | "fixture";

export type GuidedIntakeSourceMetadata = {
  kind: "guided_intake";
  stepId: GuidedIntakeStepId;
  chronicFieldId?: ChronicIntakeFieldId;
  chronicAppointmentFocus?: ChronicAppointmentFocus;
  sourceLabel: string;
  captureMethod: GuidedIntakeCaptureMethod;
  userReviewed: boolean;
  storesAudio: false;
  browserSpeech?: BrowserSpeechCaptureSummary;
};

export type UploadedDocumentMetadata = {
  kind: "uploaded_document";
  sourceLabel: string;
  originalContentType?: string;
  parser?: "pdf" | "image" | "text" | "manual";
  needsManualFallback?: boolean;
};

export type TextNoteMetadata = {
  kind: "text_note";
  sourceLabel: string;
  captureMethod: Extract<GuidedIntakeCaptureMethod, "typed" | "pasted" | "fixture">;
  userReviewed: boolean;
};

export type VoiceTranscriptMetadata = {
  kind: "voice_transcript";
  sourceLabel: string;
  userReviewed: boolean;
  storesAudio: false;
  browserSpeech: BrowserSpeechCaptureSummary;
};

export type SampleSourceMetadata = {
  kind: "sample";
  sourceLabel: string;
  synthetic: true;
};

export type HealthDocumentMetadata =
  | GuidedIntakeSourceMetadata
  | UploadedDocumentMetadata
  | TextNoteMetadata
  | VoiceTranscriptMetadata
  | SampleSourceMetadata;

export const PATTERN_CARD_SAFETY_LABELS = ["possible_pattern_to_discuss", "seen_in_notes", "needs_review", "appointment_hypothesis"] as const;

export type PatternCardSafetyLabel = (typeof PATTERN_CARD_SAFETY_LABELS)[number];

export type PatternCardKind =
  | "repeated_symptom"
  | "recent_change"
  | "medication_note"
  | "functional_impact"
  | "appointment_question"
  | "source_gap";

export type PatternCardReviewStatus = "UNREVIEWED" | "CONFIRMED" | "EDITED" | "REJECTED";

export type PatternCard = {
  id: string;
  caseId: string;
  kind: PatternCardKind;
  title: string;
  summary: string;
  suggestedBriefText: string;
  safetyLabel: PatternCardSafetyLabel;
  userStatus: PatternCardReviewStatus;
  requiresUserReview: true;
  sourceFactIds: string[];
  sourceDocumentIds?: string[];
  confidence: number;
  createdAt: string;
  reviewedAt?: string;
  reviewerEditedText?: string;
};

export type ReviewedPatternCard = PatternCard & {
  userStatus: "CONFIRMED" | "EDITED";
  reviewedAt: string;
  safeForBrief: true;
};

export type DashboardWorkflowStepId = "intake" | "extraction" | "review" | "timeline" | "brief" | "export";

export type DashboardWorkflowState = "not_started" | "needs_input" | "ready" | "in_progress" | "done" | "blocked";

export type CaseDashboardWorkflowItem = {
  id: DashboardWorkflowStepId;
  label: string;
  state: DashboardWorkflowState;
  count?: number;
  needsUserReview?: boolean;
};

export type CaseDashboardNextAction = {
  id: DashboardWorkflowStepId;
  label: string;
  href: string;
  reason: string;
  disabled?: boolean;
};

export type DashboardReviewableItem = {
  id: string;
  text: string;
  sourceFactIds?: string[];
  sourceDocumentIds?: string[];
  userReviewed: boolean;
};

export type DashboardOpenQuestion = {
  id: string;
  question: string;
  priority: "low" | "medium" | "high";
  answered: boolean;
};

export type DashboardSourceCoverageItem = {
  section: string;
  sourceCount: number;
  weakOrMissingEvidence: boolean;
};

export type CaseDashboardState = {
  caseId: string;
  mode: "PREOP" | "CHRONIC" | "CARER" | "GENERAL";
  generatedAt: string;
  workflow: CaseDashboardWorkflowItem[];
  counts: {
    documents: number;
    sourcePreviews: number;
    facts: number;
    factsNeedingReview: number;
    reviewedPatterns: number;
    openQuestions: number;
    briefs: number;
  };
  nextAction: CaseDashboardNextAction;
  whatChangedSinceLastAppointment: DashboardReviewableItem[];
  topPointsToRaise: DashboardReviewableItem[];
  openQuestions: DashboardOpenQuestion[];
  sourceCoverage: DashboardSourceCoverageItem[];
  safetyDisclaimerRequired: true;
};

export const BROWSER_SPEECH_PRIVACY_NOTICE =
  "Your browser may process speech recognition. ClinicBrief stores only text you choose to save. Review your transcript before saving.";

export type BrowserSpeechCapability = "unknown" | "supported" | "unsupported";

export type BrowserSpeechMode = "speech_to_text" | "text_to_speech";

export type BrowserSpeechFeatureContract = {
  mode: BrowserSpeechMode;
  capability: BrowserSpeechCapability;
  userTriggered: true;
  typedFallbackRequired: true;
  storesAudio: false;
  serverSideAudioProcessing: false;
  transcriptRequiresReviewBeforeSave: boolean;
  privacyNotice: typeof BROWSER_SPEECH_PRIVACY_NOTICE;
};

export type BrowserSpeechCaptureSummary = {
  capability: BrowserSpeechCapability;
  transcriptReviewed: boolean;
  audioStored: false;
  submittedByUser: boolean;
};

export type BrowserSpeechAnalyticsEvent = "speech_supported" | "speech_started" | "speech_saved" | "speech_readback_started";

export type BrowserSpeechAnalyticsPayload = {
  event: BrowserSpeechAnalyticsEvent;
  supportedCount?: number;
  startedCount?: number;
  savedCount?: number;
  readbackStartedCount?: number;
};
