import type { ApiResponse, GeneratePatternCardsResponse, ListPatternCardsResponse } from "@clinicbrief/types";
import { getClinicRepository } from "../../../../../lib/server/clinic-repository";
import { buildFactsWithGeneratedPatterns, listPatternCards } from "../../../../../lib/server/pattern-service";

export async function GET(_request: Request, { params }: { params: Promise<{ caseId: string }> }): Promise<Response> {
  const { caseId } = await params;
  const repository = await getClinicRepository();
  const record = await repository.getCase(caseId);

  if (!record) {
    return patternNotFound<ListPatternCardsResponse>();
  }

  return Response.json({
    ok: true,
    data: {
      patternCards: listPatternCards(record)
    }
  } satisfies ApiResponse<ListPatternCardsResponse>);
}

export async function POST(_request: Request, { params }: { params: Promise<{ caseId: string }> }): Promise<Response> {
  const { caseId } = await params;
  const repository = await getClinicRepository();
  const record = await repository.getCase(caseId);

  if (!record || !record.consentAccepted) {
    return patternNotFound<GeneratePatternCardsResponse>();
  }

  const facts = buildFactsWithGeneratedPatterns(record);
  const saved = await repository.setExtraction(caseId, facts, record.questions);

  if (!saved) {
    return patternNotFound<GeneratePatternCardsResponse>();
  }

  return Response.json({
    ok: true,
    data: {
      patternCards: listPatternCards(saved)
    }
  } satisfies ApiResponse<GeneratePatternCardsResponse>);
}

function patternNotFound<T>(): Response {
  return Response.json(
    {
      ok: false,
      error: {
        code: "CASE_NOT_FOUND",
        message: "Create a consented case before reviewing pattern cards."
      }
    } satisfies ApiResponse<T>,
    { status: 404 }
  );
}
