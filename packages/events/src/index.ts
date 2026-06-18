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

const forbiddenPropertyPatterns = [/raw/i, /text/i, /narrative/i, /sourceQuote/i, /symptomName/i, /medicationName/i, /fileName/i, /documentName/i];

export function sanitizeEventProps(props: Record<string, unknown> = {}): Record<string, unknown> {
  return Object.fromEntries(Object.entries(props).filter(([key, value]) => isAllowedEventProp(key, value)));
}

export function isAllowedEventProp(key: string, value: unknown): boolean {
  if (forbiddenPropertyPatterns.some((pattern) => pattern.test(key))) {
    return false;
  }

  if (typeof value === "string" && value.length > 80) {
    return false;
  }

  return ["string", "number", "boolean"].includes(typeof value) || value == null;
}

export function trackEvent(name: ClinicEventName, props?: Record<string, unknown>) {
  const safeProps = sanitizeEventProps(props);
  void fetch("/api/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, props: safeProps })
  }).catch(() => undefined);
}
