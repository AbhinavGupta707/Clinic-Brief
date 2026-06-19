import { briefToMarkdown, buildBriefFromReviewedFacts } from "@clinicbrief/exports";
import type { ApiResponse, AppointmentBrief, CreateBriefResponse } from "@clinicbrief/types";
import { z } from "zod";

import { getClinicRepository } from "../../../../../lib/server/clinic-repository";

const CreateBriefSchema = z
  .object({
    briefType: z.enum(["GP", "CONSULTANT", "PREOP", "FAMILY_HANDOFF", "NINETY_SECOND_STORY"]).default("PREOP"),
    appointmentGoal: z.string().trim().max(300).optional()
  })
  .optional();

export async function POST(request: Request, { params }: { params: Promise<{ caseId: string }> }): Promise<Response> {
  const { caseId } = await params;
  const body = await request.json().catch(() => undefined);
  const parsed = CreateBriefSchema.safeParse(body);

  if (!parsed.success) {
    return Response.json(
      {
        ok: false,
        error: {
          code: "INVALID_BRIEF_REQUEST",
          message: "Choose a supported brief type."
        }
      } satisfies ApiResponse<CreateBriefResponse>,
      { status: 400 }
    );
  }

  const repository = await getClinicRepository();
  const record = await repository.getCase(caseId);

  if (!record || !record.consentAccepted) {
    return Response.json(
      {
        ok: false,
        error: {
          code: "CASE_NOT_FOUND",
          message: "Create a consented case and review facts before generating a brief."
        }
      } satisfies ApiResponse<CreateBriefResponse>,
      { status: 404 }
    );
  }

  const briefType = parsed.data?.briefType ?? "PREOP";
  const briefJson = buildBriefFromReviewedFacts({
    caseTitle: record.title,
    briefType,
    facts: record.facts,
    questions: record.questions,
    timeline: record.timeline,
    sourcePreviews: record.sourcePreviews,
    appointmentGoal: parsed.data?.appointmentGoal
  });
  const markdown = briefToMarkdown(briefJson);
  const saved = await repository.saveBrief(caseId, {
    briefType,
    title: briefJson.title,
    briefJson,
    markdown
  });
  const brief =
    saved ??
    ({
      id: `brief-${caseId}-${briefType.toLowerCase()}`,
      caseId,
      briefType,
      title: briefJson.title,
      briefJson,
      markdown,
      createdAt: new Date().toISOString()
    } satisfies AppointmentBrief);

  return Response.json({
    ok: true,
    data: {
      briefId: brief.id,
      brief
    }
  } satisfies ApiResponse<CreateBriefResponse>);
}
