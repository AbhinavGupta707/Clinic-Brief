import type { ApiResponse } from "@clinicbrief/types";
import { z } from "zod";
import { parseGuidedProfileDraft, type GuidedProfileDraft } from "../../../lib/server/guided-profile";
import { GuidedAiUnavailableError } from "../../../lib/server/guided-interviewer";

const GuidedProfileRequestSchema = z.object({
  transcript: z.string().trim().min(1).max(4000)
});

export async function POST(request: Request): Promise<Response> {
  const json = await request.json().catch(() => null);
  const parsed = GuidedProfileRequestSchema.safeParse(json);

  if (!parsed.success) {
    return Response.json(
      {
        ok: false,
        error: {
          code: "INVALID_GUIDED_PROFILE_REQUEST",
          message: "Add a short spoken or typed description before autofilling the form."
        }
      } satisfies ApiResponse<GuidedProfileDraft>,
      { status: 400 }
    );
  }

  try {
    const draft = await parseGuidedProfileDraft(parsed.data.transcript);

    return Response.json({
      ok: true,
      data: draft
    } satisfies ApiResponse<GuidedProfileDraft>);
  } catch (error) {
    if (error instanceof GuidedAiUnavailableError) {
      return Response.json(
        {
          ok: false,
          error: {
            code: "GUIDED_AI_UNAVAILABLE",
            message: error.message
          }
        } satisfies ApiResponse<GuidedProfileDraft>,
        { status: 503 }
      );
    }

    return Response.json(
      {
        ok: false,
        error: {
          code: "GUIDED_PROFILE_FAILED",
          message: "ClinicBrief could not autofill the form. You can still fill it manually."
        }
      } satisfies ApiResponse<GuidedProfileDraft>,
      { status: 500 }
    );
  }
}
