import type { ApiResponse } from "@clinicbrief/types";
import { z } from "zod";
import { getGuidedInterviewQuestion, GuidedAiUnavailableError, type GuidedInterviewQuestion } from "../../../lib/server/guided-interviewer";

const GuidedInterviewRequestSchema = z.object({
  appointmentType: z.enum(["upcoming", "chronic", "symptoms", "preop", "medication"]),
  firstName: z.string().trim().max(80).optional(),
  preparingFor: z.enum(["self", "someone_else"]).optional(),
  simpleLanguage: z.boolean().optional(),
  previousQuestions: z.array(z.string().max(240)).max(12).default([]),
  previousAnswers: z.array(z.string().max(4000)).max(12).default([]),
  latestAnswer: z.string().max(4000).optional()
});

export async function POST(request: Request): Promise<Response> {
  const json = await request.json().catch(() => null);
  const parsed = GuidedInterviewRequestSchema.safeParse(json);

  if (!parsed.success) {
    return Response.json(
      {
        ok: false,
        error: {
          code: "INVALID_GUIDED_INTERVIEW_REQUEST",
          message: "ClinicBrief could not prepare the next question from that request."
        }
      } satisfies ApiResponse<GuidedInterviewQuestion>,
      { status: 400 }
    );
  }

  try {
    const question = await getGuidedInterviewQuestion(parsed.data);

    return Response.json({
      ok: true,
      data: question
    } satisfies ApiResponse<GuidedInterviewQuestion>);
  } catch (error) {
    if (error instanceof GuidedAiUnavailableError) {
      return Response.json(
        {
          ok: false,
          error: {
            code: "GUIDED_AI_UNAVAILABLE",
            message: error.message
          }
        } satisfies ApiResponse<GuidedInterviewQuestion>,
        { status: 503 }
      );
    }

    return Response.json(
      {
        ok: false,
        error: {
          code: "GUIDED_INTERVIEW_FAILED",
          message: "ClinicBrief could not prepare the next guided question."
        }
      } satisfies ApiResponse<GuidedInterviewQuestion>,
      { status: 500 }
    );
  }
}
