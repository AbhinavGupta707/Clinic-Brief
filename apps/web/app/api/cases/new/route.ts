import type { ApiResponse, CreateCaseResponse } from "@clinicbrief/types";
import { z } from "zod";
import { createCase } from "../../../../lib/server/case-store";

const CreateCaseSchema = z.object({
  title: z.string().trim().min(2).max(120),
  mode: z.enum(["PREOP", "CHRONIC", "CARER", "GENERAL"]),
  consent: z.literal(true)
});

export async function POST(request: Request): Promise<Response> {
  const json = await request.json().catch(() => null);
  const parsed = CreateCaseSchema.safeParse(json);

  if (!parsed.success) {
    return Response.json(
      {
        ok: false,
        error: {
          code: "CONSENT_REQUIRED",
          message: "Consent and a short case title are required before creating case data."
        }
      } satisfies ApiResponse<CreateCaseResponse>,
      { status: 400 }
    );
  }

  const record = createCase({ title: parsed.data.title, mode: parsed.data.mode });

  return Response.json({
    ok: true,
    data: { caseId: record.id }
  } satisfies ApiResponse<CreateCaseResponse>);
}
