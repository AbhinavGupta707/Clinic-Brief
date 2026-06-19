import { buildBriefFromReviewedFacts, buildExportBundle } from "@clinicbrief/exports";
import type { ApiResponse, AppointmentBrief, BriefType } from "@clinicbrief/types";
import { z } from "zod";

import { getClinicRepository } from "../../../../../lib/server/clinic-repository";

const ExportRequestSchema = z
  .object({
    briefType: z.enum(["GP", "CONSULTANT", "PREOP", "FAMILY_HANDOFF", "NINETY_SECOND_STORY"]).default("PREOP")
  })
  .optional();

type ExportResponse = {
  briefId: string;
  briefType: BriefType;
  bundle: ReturnType<typeof buildExportBundle>;
  pdfGenerated: false;
};

export async function POST(request: Request, { params }: { params: Promise<{ caseId: string }> }): Promise<Response> {
  const { caseId } = await params;
  const body = await request.json().catch(() => undefined);
  const parsed = ExportRequestSchema.safeParse(body);

  if (!parsed.success) {
    return Response.json(
      {
        ok: false,
        error: {
          code: "INVALID_EXPORT_REQUEST",
          message: "Choose a supported brief type before exporting."
        }
      } satisfies ApiResponse<ExportResponse>,
      { status: 400 }
    );
  }

  const briefType = parsed.data?.briefType ?? "PREOP";
  const repository = await getClinicRepository();
  const record = await repository.getCase(caseId);

  if (!record || !record.consentAccepted) {
    return Response.json(
      {
        ok: false,
        error: {
          code: "CASE_NOT_FOUND",
          message: "Create a consented case and generated brief before exporting."
        }
      } satisfies ApiResponse<ExportResponse>,
      { status: 404 }
    );
  }

  const savedBrief = record.briefs.find((item) => item.briefType === briefType);
  const brief =
    savedBrief ??
    ({
      id: `transient-export-${caseId}-${briefType.toLowerCase()}`,
      caseId,
      briefType,
      title: briefType,
      briefJson: buildBriefFromReviewedFacts({
        caseTitle: record.title,
        briefType,
        facts: record.facts,
        questions: record.questions,
        timeline: record.timeline,
        sourcePreviews: record.sourcePreviews
      }),
      markdown: "",
      createdAt: new Date().toISOString()
    } satisfies AppointmentBrief);
  const bundle = buildExportBundle(brief.briefJson, briefType);

  return Response.json({
    ok: true,
    data: {
      briefId: brief.id,
      briefType,
      bundle,
      pdfGenerated: false
    }
  } satisfies ApiResponse<ExportResponse>);
}
