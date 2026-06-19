import type { ApiResponse, UpdatePatternCardResponse } from "@clinicbrief/types";
import { z } from "zod";
import { getClinicRepository } from "../../../../../../lib/server/clinic-repository";
import { isPatternFact, patternFactToCard } from "../../../../../../lib/server/pattern-service";

const UpdatePatternSchema = z.object({
  suggestedBriefText: z.string().trim().min(1).max(500).optional(),
  userStatus: z.enum(["UNREVIEWED", "CONFIRMED", "EDITED", "REJECTED"])
});

export async function PATCH(request: Request, { params }: { params: Promise<{ caseId: string; patternId: string }> }): Promise<Response> {
  const { caseId, patternId } = await params;
  const json = await request.json().catch(() => null);
  const parsed = UpdatePatternSchema.safeParse(json);

  if (!parsed.success) {
    return Response.json(
      {
        ok: false,
        error: {
          code: "INVALID_PATTERN_UPDATE",
          message: "Choose confirm, edit, or reject for this pattern card."
        }
      } satisfies ApiResponse<UpdatePatternCardResponse>,
      { status: 400 }
    );
  }

  const repository = await getClinicRepository();
  const record = await repository.getCase(caseId);
  const patternFact = record?.facts.find((fact) => fact.id === patternId && isPatternFact(fact));

  if (!patternFact) {
    return patternNotFound();
  }

  const updated = await repository.updateFact(caseId, patternId, {
    displayText: parsed.data.suggestedBriefText,
    userStatus: parsed.data.userStatus
  });

  if (!updated || !isPatternFact(updated)) {
    return patternNotFound();
  }

  return Response.json({
    ok: true,
    data: {
      patternCard: patternFactToCard(updated)
    }
  } satisfies ApiResponse<UpdatePatternCardResponse>);
}

function patternNotFound(): Response {
  return Response.json(
    {
      ok: false,
      error: {
        code: "PATTERN_NOT_FOUND",
        message: "Generate pattern cards before reviewing them."
      }
    } satisfies ApiResponse<UpdatePatternCardResponse>,
    { status: 404 }
  );
}
