export const Events = {
  CaseCreated: "case_created",
  ConsentAccepted: "consent_accepted",
  DocumentUploaded: "document_uploaded",
  TextNoteAdded: "text_note_added",
  ExtractionStarted: "extraction_started",
  ExtractionCompleted: "extraction_completed",
  FactConfirmed: "fact_confirmed",
  FactEdited: "fact_edited",
  MissingQuestionAnswered: "missing_question_answered",
  TimelineBuilt: "timeline_built",
  BriefGenerated: "brief_generated",
  RehearsalStarted: "rehearsal_started",
  RehearsalMessageSent: "rehearsal_message_sent",
  PdfExported: "pdf_exported",
  CaseDeleted: "case_deleted"
} as const;

export type ClinicEventName = (typeof Events)[keyof typeof Events];

export type SanitizedEventProps = Record<string, string | number | boolean | null>;

export const allowedEventPropertyPolicy = {
  explicitKeys: ["mode", "briefType", "confidenceBand"],
  countSuffix: "Count",
  forbiddenExamples: ["rawText", "sourceQuote", "medicationName", "symptomName", "fileName", "freeTextNarrative"]
} as const;

const eventNames = new Set<string>(Object.values(Events));
const allowedStringValues = new Set(["PREOP", "CHRONIC", "CARER", "GENERAL", "GP", "CONSULTANT", "FAMILY_HANDOFF", "NINETY_SECOND_STORY", "low", "medium", "high", "mixed"]);
const forbiddenPropertyPatterns = [
  /raw/i,
  /text/i,
  /narrative/i,
  /sourceQuote/i,
  /symptomName/i,
  /medicationName/i,
  /fileName/i,
  /documentName/i,
  /identifier/i,
  /\bid\b/i
];

export function isClinicEventName(value: unknown): value is ClinicEventName {
  return typeof value === "string" && eventNames.has(value);
}

export function sanitizeEventProps(props: Record<string, unknown> = {}): SanitizedEventProps {
  return Object.fromEntries(Object.entries(props).filter(([key, value]) => isAllowedEventProp(key, value))) as SanitizedEventProps;
}

export function isAllowedEventProp(key: string, value: unknown): boolean {
  if (forbiddenPropertyPatterns.some((pattern) => pattern.test(key))) {
    return false;
  }

  if (key.endsWith(allowedEventPropertyPolicy.countSuffix)) {
    return typeof value === "number" && Number.isFinite(value) && value >= 0;
  }

  if (!allowedEventPropertyPolicy.explicitKeys.includes(key as (typeof allowedEventPropertyPolicy.explicitKeys)[number])) {
    return false;
  }

  if (value == null) {
    return true;
  }

  if (typeof value !== "string") {
    return false;
  }

  return allowedStringValues.has(value);
}

export function trackEvent(name: ClinicEventName, props?: Record<string, unknown>) {
  const safeProps = sanitizeEventProps(props);
  if (typeof window === "undefined") {
    return safeProps;
  }

  void fetch("/api/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, props: safeProps })
  }).catch(() => undefined);

  return safeProps;
}

export const novusEventCoverage = [
  { event: Events.CaseCreated, purpose: "Case and consent funnel started", safeProps: sanitizeEventProps({ mode: "PREOP" }) },
  {
    event: Events.ExtractionCompleted,
    purpose: "Extraction completed without sending extracted medical content",
    safeProps: sanitizeEventProps({ mode: "PREOP", documentCount: 3, factCount: 12, confidenceBand: "mixed" })
  },
  {
    event: Events.BriefGenerated,
    purpose: "Brief type selected and generated",
    safeProps: sanitizeEventProps({ mode: "PREOP", briefType: "PREOP", sourceCount: 3 })
  },
  {
    event: Events.RehearsalMessageSent,
    purpose: "Rehearsal engagement counted without message text",
    safeProps: sanitizeEventProps({ mode: "PREOP", questionCount: 5, answeredQuestionCount: 1 })
  },
  {
    event: Events.CaseDeleted,
    purpose: "Delete flow completed or marked deleted",
    safeProps: sanitizeEventProps({ mode: "PREOP", deletedRecordCount: 1, deletedFileCount: 0 })
  }
];

export const sanitizedEventExample = {
  input: {
    mode: "PREOP",
    briefType: "PREOP",
    documentCount: 3,
    factCount: 12,
    rawText: "[filtered]",
    medicationName: "[filtered]",
    fileName: "[filtered]",
    freeTextNarrative: "[filtered]"
  },
  output: sanitizeEventProps({
    mode: "PREOP",
    briefType: "PREOP",
    documentCount: 3,
    factCount: 12,
    rawText: "[filtered]",
    medicationName: "[filtered]",
    fileName: "[filtered]",
    freeTextNarrative: "[filtered]"
  })
};
