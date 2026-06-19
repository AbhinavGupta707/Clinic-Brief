import { z } from "zod";

import { REQUIRED_DISCLAIMER } from "./prompts";

export const ExtractedFactSchema = z.object({
  sourceDocId: z.string().min(1),
  category: z.enum(["MEDICATION", "ALLERGY", "SYMPTOM", "APPOINTMENT", "TEST_RESULT", "PROCEDURE", "HISTORY_ITEM", "QUESTION", "CONTACT"]),
  displayText: z.string().trim().min(1).max(500),
  date: z.string().optional(),
  value: z.record(z.unknown()),
  confidence: z.number().min(0).max(1),
  sourceQuote: z.string().max(300).optional(),
  safetyNotes: z.array(z.string()).default([])
}).strict();

export const MissingQuestionSchema = z.object({
  id: z.string().trim().min(1),
  priority: z.enum(["low", "medium", "high"]),
  question: z.string().trim().min(1).max(240),
  whyItMattersForAppointment: z.string().trim().min(1).max(300),
  answerType: z.enum(["short_text", "date", "yes_no", "medication", "allergy"])
}).strict();

const BriefTimelineItemSchema = z.object({ dateLabel: z.string().trim().min(1).max(80), event: z.string().trim().min(1).max(500) }).strict();

const BriefMedicationSchema = z
  .object({
    name: z.string().trim().min(1).max(180),
    dose: z.string().trim().max(80).optional(),
    frequency: z.string().trim().max(80).optional(),
    notes: z.string().trim().max(220).optional()
  })
  .strict();

const BriefSourceCoverageSchema = z.object({ section: z.string().trim().min(1).max(120), sourceCount: z.number().int().min(0) }).strict();

export const ClinicBriefOutputSchema = z.object({
  title: z.string().trim().min(1).max(160),
  oneLineReasonForVisit: z.string().trim().min(1).max(400),
  ninetySecondStory: z.string().trim().min(1).max(1400),
  keyTimeline: z.array(BriefTimelineItemSchema).max(12),
  currentMedications: z.array(BriefMedicationSchema).max(16),
  allergiesAndImportantNotes: z.array(z.string().trim().min(1).max(300)).max(12),
  whatChangedSinceLastAppointment: z.array(z.string().trim().min(1).max(300)).max(10),
  questionsForClinician: z.array(z.string().trim().min(1).max(260)).max(12),
  openUncertainties: z.array(z.string().trim().min(1).max(260)).max(12),
  sourceCoverage: z.array(BriefSourceCoverageSchema).max(10),
  safetyDisclaimer: z.literal(REQUIRED_DISCLAIMER)
}).strict();

export const RehearsalSuggestedFactUpdateSchema = z.object({
  type: z.literal("missing_question_answer"),
  questionId: z.string().trim().min(1),
  requiresUserReview: z.literal(true),
  proposedDisplayText: z.string().trim().min(1).max(400)
}).strict();

export const RehearsalAgentOutputSchema = z.object({
  assistantMessage: z.string().trim().min(1).max(900),
  blocked: z.boolean(),
  suggestedFactUpdates: z.array(RehearsalSuggestedFactUpdateSchema).optional()
}).strict();

export const ExtractionResultSchema = z.object({
  facts: z.array(ExtractedFactSchema),
  questions: z.array(MissingQuestionSchema)
});

export type ExtractedFactInput = z.infer<typeof ExtractedFactSchema>;
export type ExtractionResult = z.infer<typeof ExtractionResultSchema>;
export type ClinicBriefOutputInput = z.infer<typeof ClinicBriefOutputSchema>;
export type RehearsalAgentOutput = z.infer<typeof RehearsalAgentOutputSchema>;
