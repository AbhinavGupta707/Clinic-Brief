import { z } from "zod";

export const ExtractedFactSchema = z.object({
  category: z.enum(["MEDICATION", "ALLERGY", "SYMPTOM", "APPOINTMENT", "TEST_RESULT", "PROCEDURE", "HISTORY_ITEM", "QUESTION", "CONTACT"]),
  displayText: z.string(),
  date: z.string().optional(),
  value: z.record(z.unknown()),
  confidence: z.number().min(0).max(1),
  sourceQuote: z.string().max(300).optional(),
  safetyNotes: z.array(z.string()).default([])
});

export const MissingQuestionSchema = z.object({
  id: z.string(),
  priority: z.enum(["low", "medium", "high"]),
  question: z.string(),
  whyItMattersForAppointment: z.string(),
  answerType: z.enum(["short_text", "date", "yes_no", "medication", "allergy"])
});

export const ClinicBriefOutputSchema = z.object({
  title: z.string(),
  oneLineReasonForVisit: z.string(),
  ninetySecondStory: z.string(),
  keyTimeline: z.array(z.object({ dateLabel: z.string(), event: z.string() })),
  currentMedications: z.array(z.object({ name: z.string(), dose: z.string().optional(), frequency: z.string().optional(), notes: z.string().optional() })),
  allergiesAndImportantNotes: z.array(z.string()),
  whatChangedSinceLastAppointment: z.array(z.string()),
  questionsForClinician: z.array(z.string()),
  openUncertainties: z.array(z.string()),
  sourceCoverage: z.array(z.object({ section: z.string(), sourceCount: z.number() })),
  safetyDisclaimer: z.string()
});

export const ExtractionResultSchema = z.object({
  facts: z.array(ExtractedFactSchema),
  questions: z.array(MissingQuestionSchema)
});

export type ExtractedFactInput = z.infer<typeof ExtractedFactSchema>;
export type ExtractionResult = z.infer<typeof ExtractionResultSchema>;
