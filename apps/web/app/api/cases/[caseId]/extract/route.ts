import { EXTRACTION_SYSTEM_PROMPT, ExtractionResultSchema, getSafetyRedirect, runClinicJson } from "@clinicbrief/ai";
import type { ApiResponse, ExtractCaseResponse, ExtractedFact } from "@clinicbrief/types";
import { z } from "zod";
import { createFixtureFactsForCase, createFixtureQuestions, getCase, setExtraction } from "../../../../../lib/server/case-store";

const ExtractRequestSchema = z
  .object({
    request: z.string().max(500).optional()
  })
  .optional();

export async function GET(_request: Request, { params }: { params: Promise<{ caseId: string }> }): Promise<Response> {
  const { caseId } = await params;
  const record = getCase(caseId);

  if (!record) {
    return notFound();
  }

  return Response.json({
    ok: true,
    data: {
      facts: record.facts,
      questions: record.questions,
      source: caseId === "sample-preop" ? "fixture" : "fixture"
    }
  } satisfies ApiResponse<ExtractCaseResponse>);
}

export async function POST(request: Request, { params }: { params: Promise<{ caseId: string }> }): Promise<Response> {
  const { caseId } = await params;
  const record = getCase(caseId);

  if (!record || !record.consentAccepted) {
    return notFound();
  }

  const requestBody = await request.json().catch(() => undefined);
  const parsedBody = ExtractRequestSchema.safeParse(requestBody);
  const safetyRedirect = getSafetyRedirect(parsedBody.success ? parsedBody.data?.request ?? "" : "");

  if (safetyRedirect) {
    return Response.json({
      ok: true,
      data: {
        facts: [],
        questions: [],
        source: "fixture",
        safetyRedirect
      }
    } satisfies ApiResponse<ExtractCaseResponse>);
  }

  const hasFireworks = Boolean(process.env.FIREWORKS_API_KEY && process.env.FIREWORKS_MODEL);
  const sourceDocuments = record.documents.filter((document) => document.rawText?.trim());

  if (hasFireworks && sourceDocuments.length > 0) {
    try {
      const extracted = await runClinicJson({
        task: "case-extraction",
        system: EXTRACTION_SYSTEM_PROMPT,
        user: buildExtractionUserPrompt(
          sourceDocuments.map((document) => ({
            id: document.id,
            type: document.type,
            text: document.rawText ?? ""
          }))
        ),
        schema: ExtractionResultSchema
      });
      const validated = ExtractionResultSchema.parse(extracted);
      const facts = validated.facts.map((fact, index) => toCaseFact(fact, caseId, sourceDocuments[index]?.id ?? sourceDocuments[0]?.id));

      setExtraction(caseId, facts, validated.questions);

      return Response.json({
        ok: true,
        data: {
          facts,
          questions: validated.questions,
          source: "fireworks"
        }
      } satisfies ApiResponse<ExtractCaseResponse>);
    } catch {
      return fixtureExtraction(caseId, sourceDocuments[0]?.id);
    }
  }

  return fixtureExtraction(caseId, sourceDocuments[0]?.id);
}

function fixtureExtraction(caseId: string, documentId?: string): Response {
  const facts = createFixtureFactsForCase(caseId, documentId);
  const questions = createFixtureQuestions();
  const validated = ExtractionResultSchema.parse({
    facts: facts.map(({ category, displayText, value, confidence, sourceQuote }) => ({
      category,
      displayText,
      value,
      confidence,
      sourceQuote
    })),
    questions
  });

  setExtraction(caseId, facts, validated.questions);

  return Response.json({
    ok: true,
    data: {
      facts,
      questions: validated.questions,
      source: "fixture"
    }
  } satisfies ApiResponse<ExtractCaseResponse>);
}

function toCaseFact(fact: z.infer<typeof ExtractionResultSchema>["facts"][number], caseId: string, sourceDocId?: string): ExtractedFact {
  return {
    id: crypto.randomUUID(),
    caseId,
    sourceDocId,
    category: fact.category,
    displayText: fact.displayText,
    value: fact.value,
    confidence: fact.confidence,
    userStatus: "UNREVIEWED",
    sourceQuote: fact.sourceQuote,
    createdAt: new Date().toISOString()
  };
}

function buildExtractionUserPrompt(documents: Array<{ id: string; type: string; text: string }>): string {
  return JSON.stringify({
    task: "Extract appointment-preparation facts only. Do not diagnose, recommend treatment, advise medication changes, assess urgency, or infer facts not present in the sources.",
    requiredShape: {
      facts: "Array of category, displayText, value, confidence, optional sourceQuote, optional safetyNotes",
      questions: "Array of missing-context questions for appointment preparation"
    },
    documents
  });
}

function notFound(): Response {
  return Response.json(
    {
      ok: false,
      error: {
        code: "CASE_NOT_FOUND",
        message: "Create a consented case before running extraction."
      }
    } satisfies ApiResponse<ExtractCaseResponse>,
    { status: 404 }
  );
}
