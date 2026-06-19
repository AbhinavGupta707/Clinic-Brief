import { getSafetyRedirect } from "@clinicbrief/ai";
import type { ApiResponse, ExtractCaseResponse } from "@clinicbrief/types";
import { z } from "zod";
import { getClinicRepository } from "../../../../../lib/server/clinic-repository";
import { buildCaseExtraction, getExtractionSource } from "../../../../../lib/server/extraction-service";

const ExtractRequestSchema = z
  .object({
    request: z.string().max(500).optional()
  })
  .optional();

export async function GET(_request: Request, { params }: { params: Promise<{ caseId: string }> }): Promise<Response> {
  const { caseId } = await params;
  const repository = await getClinicRepository();
  const record = await repository.getCase(caseId);

  if (!record) {
    return notFound();
  }

  return Response.json({
    ok: true,
    data: {
      facts: record.facts,
      questions: record.questions,
      source: getExtractionSource(record)
    }
  } satisfies ApiResponse<ExtractCaseResponse>);
}

export async function POST(request: Request, { params }: { params: Promise<{ caseId: string }> }): Promise<Response> {
  const { caseId } = await params;
  const repository = await getClinicRepository();
  const record = await repository.getCase(caseId);

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

  const extraction = await buildCaseExtraction(record);
  await repository.setExtraction(caseId, extraction.facts, extraction.questions);

  return Response.json({
    ok: true,
    data: extraction
  } satisfies ApiResponse<ExtractCaseResponse>);
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
