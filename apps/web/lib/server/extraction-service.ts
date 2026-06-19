import { EXTRACTION_SYSTEM_PROMPT, ExtractionResultSchema, runClinicJson } from "@clinicbrief/ai";
import type { CaseMode, ClinicCaseSnapshot, ExtractCaseResponse, ExtractedFact, HealthDocument, MissingQuestion } from "@clinicbrief/types";

import { createFixtureFactsForCase, createFixtureQuestions } from "./clinic-repository";

type SourceDocument = {
  id: string;
  type: HealthDocument["type"];
  fileName: string;
  text: string;
};

type BuiltExtraction = Pick<ExtractCaseResponse, "facts" | "questions" | "source">;

type AiFact = {
  sourceDocId?: string;
  category: ExtractedFact["category"];
  displayText: string;
  value: Record<string, unknown>;
  confidence: number;
  sourceQuote?: string;
};

type AiExtraction = {
  facts: AiFact[];
  questions: MissingQuestion[];
};

const maxDocumentChars = 12000;
const maxFallbackFacts = 14;

export async function buildCaseExtraction(record: ClinicCaseSnapshot): Promise<BuiltExtraction> {
  const sourceDocuments = getSourceDocuments(record.documents);

  if (record.id === "sample-preop") {
    return {
      facts: createFixtureFactsForCase(record.id, sourceDocuments[0]?.id).map((fact) => ({
        ...fact,
        value: { ...fact.value, extractionSource: "fixture" }
      })),
      questions: createFixtureQuestions(),
      source: "fixture"
    };
  }

  if (isFireworksConfigured() && sourceDocuments.length > 0) {
    try {
      const extracted = await runClinicJson({
        task: "case-extraction",
        system: EXTRACTION_SYSTEM_PROMPT,
        user: buildExtractionUserPrompt(sourceDocuments),
        schema: ExtractionResultSchema
      });
      const normalized = normalizeAiExtraction(record.id, sourceDocuments, extracted);

      if (normalized.facts.length > 0) {
        return {
          facts: normalized.facts,
          questions: normalized.questions.length > 0 ? normalized.questions : createFallbackQuestions(record.id, record.mode, normalized.facts),
          source: "fireworks"
        };
      }
    } catch {
      return createSourceTextFallbackExtraction(record.id, record.mode, sourceDocuments);
    }
  }

  return createSourceTextFallbackExtraction(record.id, record.mode, sourceDocuments);
}

export function getExtractionSource(record: ClinicCaseSnapshot): ExtractCaseResponse["source"] {
  return record.facts.some((fact) => fact.value.extractionSource === "fireworks") ? "fireworks" : "fixture";
}

export function createSourceTextFallbackExtraction(caseId: string, mode: CaseMode, sourceDocuments: SourceDocument[]): BuiltExtraction {
  const now = new Date().toISOString();
  const facts = sourceDocuments
    .flatMap((document) =>
      extractFactSegments(document.text).map((segment, index): ExtractedFact => {
        const category = classifyFact(segment);

        return {
          id: `fallback-${caseId}-${document.id}-${index}`,
          caseId,
          sourceDocId: document.id,
          category,
          displayText: `Source mentions: ${segment}`,
          value: {
            text: segment,
            sourceFileName: document.fileName,
            extractionSource: "fixture"
          },
          confidence: category === "HISTORY_ITEM" ? 0.68 : 0.74,
          userStatus: "UNREVIEWED",
          sourceQuote: segment.slice(0, 300),
          createdAt: now
        };
      })
    )
    .slice(0, maxFallbackFacts);

  return {
    facts,
    questions: createFallbackQuestions(caseId, mode, facts),
    source: "fixture"
  };
}

function normalizeAiExtraction(caseId: string, sourceDocuments: SourceDocument[], extracted: AiExtraction): Pick<BuiltExtraction, "facts" | "questions"> {
  const now = new Date().toISOString();
  const mappedFacts: Array<ExtractedFact | null> = extracted.facts
    .map((fact) => {
      const sourceDocument = resolveFactSource(fact, sourceDocuments);

      if (!sourceDocument) {
        return null;
      }

      const displayText = compactText(fact.displayText).slice(0, 500);

      if (!displayText) {
        return null;
      }

      const compactSourceText = compactText(sourceDocument.text);
      const compactSourceQuote = fact.sourceQuote ? compactText(fact.sourceQuote).slice(0, 300) : "";
      const sourceQuote = compactSourceQuote && compactSourceText.includes(compactSourceQuote) ? compactSourceQuote : createQuoteFromDocument(sourceDocument.text);

      return {
        id: crypto.randomUUID(),
        caseId,
        sourceDocId: sourceDocument.id,
        category: fact.category,
        displayText,
        value: {
          ...fact.value,
          extractionSource: "fireworks"
        },
        confidence: clampConfidence(fact.confidence, Boolean(fact.sourceQuote)),
        userStatus: "UNREVIEWED",
        sourceQuote,
        createdAt: now
      } satisfies ExtractedFact;
    });
  const facts = mappedFacts.filter((fact): fact is ExtractedFact => fact !== null);

  return {
    facts,
    questions: dedupeQuestions(extracted.questions)
  };
}

function buildExtractionUserPrompt(documents: SourceDocument[]): string {
  return JSON.stringify({
    task: "Extract appointment-preparation facts only. Do not diagnose, recommend treatment, advise medication changes, assess urgency, or infer facts not present in the sources.",
    outputContract:
      "Return JSON with exactly { facts: [...], questions: [...] }. Do not include this contract, allowed values, or documents in the response.",
    factContract: {
      sourceDocId: "Must exactly match one provided document id.",
      category: "One of MEDICATION, ALLERGY, SYMPTOM, APPOINTMENT, TEST_RESULT, PROCEDURE, HISTORY_ITEM, QUESTION, CONTACT.",
      displayText: "Short appointment-preparation fact stated by the source.",
      value: "Object such as { text: string }. Never a string.",
      confidence: "Number from 0 to 1. Never high/medium/low text.",
      sourceQuote: "Short exact quote copied from the matching source document."
    },
    questionContract: {
      id: "Stable id like q-1.",
      priority: "One of low, medium, high.",
      question: "One appointment-preparation question.",
      whyItMattersForAppointment: "Why this helps the user prepare for the appointment.",
      answerType: "One of short_text, date, yes_no, medication, allergy."
    },
    example: {
      facts: [
        {
          sourceDocId: "doc-example",
          category: "MEDICATION",
          displayText: "Source mentions an inhaler before exercise.",
          value: { text: "inhaler before exercise" },
          confidence: 0.86,
          sourceQuote: "inhaler before exercise"
        }
      ],
      questions: [
        {
          id: "q-1",
          priority: "high",
          question: "Which documents do you want to bring to the appointment?",
          whyItMattersForAppointment: "Documents help the user keep appointment preparation organized.",
          answerType: "short_text"
        }
      ]
    },
    documents: documents.map((document) => ({
      id: document.id,
      type: document.type,
      fileName: document.fileName,
      text: document.text.slice(0, maxDocumentChars)
    }))
  });
}

function getSourceDocuments(documents: HealthDocument[]): SourceDocument[] {
  return documents
    .map((document) => ({
      id: document.id,
      type: document.type,
      fileName: document.fileName,
      text: compactText(document.rawText ?? "")
    }))
    .filter((document) => document.text.length > 0);
}

function resolveFactSource(fact: AiFact, sourceDocuments: SourceDocument[]): SourceDocument | null {
  const sourceById = fact.sourceDocId ? sourceDocuments.find((document) => document.id === fact.sourceDocId) : undefined;
  const quote = compactText(fact.sourceQuote ?? "");

  if (quote) {
    const quoteMatch = sourceDocuments.find((document) => compactText(document.text).includes(quote));

    if (quoteMatch) {
      return quoteMatch;
    }
  }

  return sourceById ?? null;
}

function extractFactSegments(text: string): string[] {
  const seen = new Set<string>();
  const segments: string[] = [];

  for (const rawSegment of text.split(/\n+|(?<=[.!?])\s+/)) {
    const segment = compactText(rawSegment).replace(/^[-*]\s*/, "");

    if (segment.length < 16 || segment.length > 240) {
      continue;
    }

    const key = segment.toLowerCase();

    if (!seen.has(key)) {
      seen.add(key);
      segments.push(segment);
    }

    if (segments.length >= maxFallbackFacts) {
      break;
    }
  }

  if (segments.length === 0 && compactText(text).length >= 16) {
    segments.push(compactText(text).slice(0, 220));
  }

  return segments;
}

function classifyFact(segment: string): ExtractedFact["category"] {
  const lower = segment.toLowerCase();

  if (/\b(medication|medicine|tablet|capsule|inhaler|supplement|dose|mg|taken|prescribed)\b/.test(lower)) {
    return "MEDICATION";
  }

  if (/\b(allergy|allergic|reaction|intolerance)\b/.test(lower)) {
    return "ALLERGY";
  }

  if (/\b(pain|symptom|nausea|breathless|dizzy|swelling|fever|fatigue|bleeding)\b/.test(lower)) {
    return "SYMPTOM";
  }

  if (/\b(appointment|clinic|consultation|gp|doctor|nurse|pre-op|preop)\b/.test(lower)) {
    return "APPOINTMENT";
  }

  if (/\b(test|result|blood|scan|x-ray|xray|mri|ct|ecg)\b/.test(lower)) {
    return "TEST_RESULT";
  }

  if (/\b(procedure|operation|surgery|anaesthetic|anesthetic)\b/.test(lower)) {
    return "PROCEDURE";
  }

  if (segment.includes("?")) {
    return "QUESTION";
  }

  if (/\b(carer|family|contact|daughter|son|partner|support)\b/.test(lower)) {
    return "CONTACT";
  }

  return "HISTORY_ITEM";
}

function createFallbackQuestions(caseId: string, mode: CaseMode, facts: ExtractedFact[]): MissingQuestion[] {
  const categories = new Set(facts.map((fact) => fact.category));
  const questions: MissingQuestion[] = [
    {
      id: `fallback-question-${caseId}-goal`,
      priority: "high",
      question: mode === "PREOP" ? "What do you most want the pre-op team to understand before the appointment?" : "What is the main outcome you want from this appointment?",
      whyItMattersForAppointment: "A clear goal helps the brief keep the conversation focused.",
      answerType: "short_text"
    },
    {
      id: `fallback-question-${caseId}-timing`,
      priority: categories.has("SYMPTOM") ? "high" : "medium",
      question: "Are there dates, timing, or changes since the last appointment that should be added?",
      whyItMattersForAppointment: "Timing helps organize the story chronologically without guessing.",
      answerType: "short_text"
    }
  ];

  if (!categories.has("MEDICATION")) {
    questions.push({
      id: `fallback-question-${caseId}-medications`,
      priority: "medium",
      question: "Do you want to add any medication or supplement details to confirm with the clinician?",
      whyItMattersForAppointment: "Medication details are useful to review, but ClinicBrief will not suggest changes.",
      answerType: "medication"
    });
  }

  if (!categories.has("ALLERGY")) {
    questions.push({
      id: `fallback-question-${caseId}-allergies`,
      priority: "medium",
      question: "Are there allergies, reactions, or important notes you want listed?",
      whyItMattersForAppointment: "These are common appointment details to verify from the user's own information.",
      answerType: "allergy"
    });
  }

  return questions;
}

function dedupeQuestions(questions: MissingQuestion[]): MissingQuestion[] {
  const seen = new Set<string>();
  const deduped: MissingQuestion[] = [];

  for (const question of questions) {
    const key = compactText(question.question).toLowerCase();

    if (!key || seen.has(key)) {
      continue;
    }

    seen.add(key);
    deduped.push({
      ...question,
      id: question.id || crypto.randomUUID()
    });
  }

  return deduped;
}

function isFireworksConfigured(): boolean {
  return Boolean(process.env.FIREWORKS_API_KEY && process.env.FIREWORKS_MODEL);
}

function clampConfidence(confidence: number, hasSourceQuote: boolean): number {
  const capped = hasSourceQuote ? confidence : Math.min(confidence, 0.72);
  return Math.max(0, Math.min(1, capped));
}

function createQuoteFromDocument(text: string): string {
  return compactText(text).slice(0, 180);
}

function compactText(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}
