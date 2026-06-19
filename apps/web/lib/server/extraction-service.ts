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
        user: buildExtractionUserPrompt(record.mode, sourceDocuments),
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
        const chronicFieldId = mode === "CHRONIC" ? classifyChronicField(segment) : undefined;
        const category = classifyFact(segment);
        const displayText = mode === "CHRONIC" ? formatChronicFallbackDisplayText(segment, chronicFieldId) : `Source mentions: ${segment}`;

        return {
          id: `fallback-${caseId}-${document.id}-${index}`,
          caseId,
          sourceDocId: document.id,
          category,
          displayText,
          value: {
            text: segment,
            ...(chronicFieldId ? { chronicFieldId } : {}),
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

function buildExtractionUserPrompt(mode: CaseMode, documents: SourceDocument[]): string {
  return JSON.stringify({
    task: "Extract appointment-preparation facts only. Do not diagnose, recommend treatment, advise medication changes, assess urgency, or infer facts not present in the sources.",
    caseMode: mode,
    modeInstructions:
      mode === "CHRONIC"
        ? {
            chronicScope:
              "This is a chronic or complex longitudinal history case. Extract user-reported appointment-prep facts about timeline, symptoms, flares, medication or treatment history, functional impact, appointment goals, uncertainties, and clinician questions.",
            confirmedHistory:
              "If the source says the user has a confirmed diagnosis or history, use category HISTORY_ITEM and value.chronicFieldId='reported_confirmed_history'. Phrase displayText as user-reported history, not as your diagnosis.",
            investigatedConditions:
              "If the source says possible, suspected, being investigated, rule-out, or waiting for assessment, use category HISTORY_ITEM and value.chronicFieldId='conditions_being_investigated'. Keep it separate from confirmed history.",
            symptomHistory:
              "Use value.chronicFieldId='baseline_symptoms' for baseline symptoms and 'flares_or_episodes' for episodes, flares, relapses, or symptom spikes.",
            safeBoundary:
              "Do not convert symptoms into diagnoses, rank urgency, recommend tests, recommend treatments, or advise medication changes."
          }
        : undefined,
    outputContract:
      "Return JSON with exactly { facts: [...], questions: [...] }. Do not include this contract, allowed values, or documents in the response.",
    factContract: {
      sourceDocId: "Must exactly match one provided document id.",
      category: "One of MEDICATION, ALLERGY, SYMPTOM, APPOINTMENT, TEST_RESULT, PROCEDURE, HISTORY_ITEM, QUESTION, CONTACT.",
      displayText: "Short appointment-preparation fact stated by the source.",
      value:
        mode === "CHRONIC"
          ? "Object such as { text: string, chronicFieldId?: 'reported_confirmed_history' | 'conditions_being_investigated' | 'baseline_symptoms' | 'flares_or_episodes' | 'current_medications_and_treatments_tried' | 'functional_impact' | 'possible_triggers_to_discuss' | 'changed_since_last_appointment' | 'questions_for_clinician' }. Never a string."
          : "Object such as { text: string }. Never a string.",
      confidence: "Number from 0 to 1. Never high/medium/low text.",
      sourceQuote: "Short exact quote copied from the matching source document."
    },
    questionContract: {
      id: "Stable id like q-1.",
      priority: "One of low, medium, high.",
      question: "One appointment-preparation question.",
      whyItMattersForAppointment: "Why this helps the user prepare for the appointment.",
      answerType: "One of short_text, date, yes_no, medication, allergy.",
      chronicFieldId:
        mode === "CHRONIC"
          ? "Optional. One chronic intake field id when the question asks about that chronic field."
          : undefined
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
  if (mode === "CHRONIC") {
    return createChronicFallbackQuestions(caseId, facts);
  }

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

function createChronicFallbackQuestions(caseId: string, facts: ExtractedFact[]): MissingQuestion[] {
  const categories = new Set(facts.map((fact) => fact.category));
  const chronicFields = new Set(facts.map((fact) => fact.value.chronicFieldId).filter((field): field is string => typeof field === "string"));
  const questions: MissingQuestion[] = [
    {
      id: `fallback-question-${caseId}-chronic-goal`,
      priority: "high",
      question: "What do you most want this clinician to understand or help you clarify at this chronic review?",
      whyItMattersForAppointment: "A clear goal helps keep a complex health story focused for the appointment.",
      answerType: "short_text",
      chronicFieldId: "questions_for_clinician"
    },
    {
      id: `fallback-question-${caseId}-confirmed-history`,
      priority: chronicFields.has("reported_confirmed_history") ? "medium" : "high",
      question: "Which history items or condition names have already been confirmed by a clinician, if any?",
      whyItMattersForAppointment: "Confirmed history should be separated from symptoms or conditions still being investigated.",
      answerType: "short_text",
      chronicFieldId: "reported_confirmed_history"
    },
    {
      id: `fallback-question-${caseId}-investigated-conditions`,
      priority: chronicFields.has("conditions_being_investigated") ? "medium" : "high",
      question: "Are there possible conditions, explanations, or symptoms currently being investigated that should be labelled as not confirmed?",
      whyItMattersForAppointment: "This keeps the brief clear without presenting investigated possibilities as diagnoses.",
      answerType: "short_text",
      chronicFieldId: "conditions_being_investigated"
    },
    {
      id: `fallback-question-${caseId}-baseline-flares`,
      priority: categories.has("SYMPTOM") ? "high" : "medium",
      question: "What is your usual baseline, and what do flares or worse episodes look like?",
      whyItMattersForAppointment: "Baseline and flare details help describe a longitudinal pattern without guessing the cause.",
      answerType: "short_text",
      chronicFieldId: "flares_or_episodes"
    },
    {
      id: `fallback-question-${caseId}-functional-impact`,
      priority: chronicFields.has("functional_impact") ? "medium" : "high",
      question: "How does this affect daily activities, work, study, caring responsibilities, sleep, or mobility?",
      whyItMattersForAppointment: "Functional impact helps the clinician understand what has changed in day-to-day life.",
      answerType: "short_text",
      chronicFieldId: "functional_impact"
    },
    {
      id: `fallback-question-${caseId}-treatments-tried`,
      priority: categories.has("MEDICATION") ? "medium" : "high",
      question: "What medicines, self-management steps, referrals, or treatments have been tried, and what do you want to confirm about them?",
      whyItMattersForAppointment: "Treatment history is useful to organize, while ClinicBrief will not recommend changes.",
      answerType: "medication",
      chronicFieldId: "current_medications_and_treatments_tried"
    },
    {
      id: `fallback-question-${caseId}-changed-since-last`,
      priority: "high",
      question: "What has changed since the last appointment, test, referral, or notable update?",
      whyItMattersForAppointment: "Recent changes help the appointment focus on what is new or unresolved.",
      answerType: "short_text",
      chronicFieldId: "changed_since_last_appointment"
    }
  ];

  if (!categories.has("ALLERGY")) {
    questions.push({
      id: `fallback-question-${caseId}-allergies`,
      priority: "medium",
      question: "Are there allergies, reactions, or important safety notes you want listed as user-reported facts?",
      whyItMattersForAppointment: "These are common appointment details to verify from the user's own information.",
      answerType: "allergy"
    });
  }

  return questions;
}

function classifyChronicField(segment: string): NonNullable<MissingQuestion["chronicFieldId"]> | undefined {
  const lower = segment.toLowerCase();

  if (/\b(possible|suspected|investigat(?:e|ed|ing|ion)|rule out|ruling out|query|awaiting assessment|unconfirmed)\b/.test(lower)) {
    return "conditions_being_investigated";
  }

  if (/\b(diagnosed|diagnosis|confirmed|history of|known|longstanding)\b/.test(lower)) {
    return "reported_confirmed_history";
  }

  if (/\b(flares?|episodes?|relapses?|crash|worse episode|spike)\b/.test(lower)) {
    return "flares_or_episodes";
  }

  if (/\b(baseline|usually|typical|most days|daily symptom)\b/.test(lower)) {
    return "baseline_symptoms";
  }

  if (/\b(medication|medicine|tablet|capsule|inhaler|supplement|dose|mg|treatment|therapy|physio|tried)\b/.test(lower)) {
    return "current_medications_and_treatments_tried";
  }

  if (/\b(work|study|school|sleep|mobility|walking|stairs|care|caring|daily activities|function|fatigue after)\b/.test(lower)) {
    return "functional_impact";
  }

  if (/\b(trigger|after|worse with|worse after|linked to|pattern)\b/.test(lower)) {
    return "possible_triggers_to_discuss";
  }

  if (/\b(since last|changed since|recently|new since|worse since|better since)\b/.test(lower)) {
    return "changed_since_last_appointment";
  }

  if (segment.includes("?") || /\b(question|ask|clarify|understand)\b/.test(lower)) {
    return "questions_for_clinician";
  }

  return undefined;
}

function formatChronicFallbackDisplayText(segment: string, chronicFieldId: MissingQuestion["chronicFieldId"]): string {
  if (chronicFieldId === "reported_confirmed_history") {
    return `User-reported confirmed history: ${segment}`;
  }

  if (chronicFieldId === "conditions_being_investigated") {
    return `User-reported condition or symptom being investigated, not confirmed by ClinicBrief: ${segment}`;
  }

  if (chronicFieldId === "flares_or_episodes") {
    return `User-reported flare or episode: ${segment}`;
  }

  if (chronicFieldId === "baseline_symptoms") {
    return `User-reported baseline symptom pattern: ${segment}`;
  }

  if (chronicFieldId === "current_medications_and_treatments_tried") {
    return `User-reported medication or treatment history: ${segment}`;
  }

  if (chronicFieldId === "functional_impact") {
    return `User-reported functional impact: ${segment}`;
  }

  if (chronicFieldId === "possible_triggers_to_discuss") {
    return `User-reported possible trigger or pattern to discuss: ${segment}`;
  }

  if (chronicFieldId === "changed_since_last_appointment") {
    return `User-reported change since last appointment: ${segment}`;
  }

  if (chronicFieldId === "questions_for_clinician") {
    return `User question for clinician: ${segment}`;
  }

  return `Source mentions: ${segment}`;
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
