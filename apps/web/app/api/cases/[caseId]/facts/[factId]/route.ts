import type { ApiResponse, UpdateFactResponse } from "@clinicbrief/types";
import { z } from "zod";
import { getClinicRepository } from "../../../../../../lib/server/clinic-repository";

const UpdateFactSchema = z.object({
  displayText: z.string().trim().min(1).max(500).optional(),
  userStatus: z.enum(["UNREVIEWED", "CONFIRMED", "EDITED", "REJECTED"])
});

export async function PATCH(request: Request, { params }: { params: Promise<{ caseId: string; factId: string }> }): Promise<Response> {
  const { caseId, factId } = await params;
  const json = await request.json().catch(() => null);
  const parsed = UpdateFactSchema.safeParse(json);

  if (!parsed.success) {
    return Response.json(
      {
        ok: false,
        error: {
          code: "INVALID_FACT_UPDATE",
          message: "Choose confirm, edit, or reject for this fact."
        }
      } satisfies ApiResponse<UpdateFactResponse>,
      { status: 400 }
    );
  }

  const repository = await getClinicRepository();
  const fact = await repository.updateFact(caseId, factId, parsed.data);

  if (!fact) {
    return Response.json(
      {
        ok: false,
        error: {
          code: "FACT_NOT_FOUND",
          message: "Run extraction before reviewing facts."
        }
      } satisfies ApiResponse<UpdateFactResponse>,
      { status: 404 }
    );
  }

  return Response.json({
    ok: true,
    data: { fact }
  } satisfies ApiResponse<UpdateFactResponse>);
}
