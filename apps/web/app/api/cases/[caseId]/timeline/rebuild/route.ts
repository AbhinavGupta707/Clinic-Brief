import { buildTimelineFromReviewedFacts } from "@clinicbrief/exports";
import type { ApiResponse, RebuildTimelineResponse } from "@clinicbrief/types";

import { getClinicRepository } from "../../../../../../lib/server/clinic-repository";

export async function POST(_request: Request, { params }: { params: Promise<{ caseId: string }> }): Promise<Response> {
  const { caseId } = await params;
  const repository = await getClinicRepository();
  const record = await repository.getCase(caseId);

  if (!record || !record.consentAccepted) {
    return Response.json(
      {
        ok: false,
        error: {
          code: "CASE_NOT_FOUND",
          message: "Create a consented case and review facts before rebuilding a timeline."
        }
      } satisfies ApiResponse<RebuildTimelineResponse>,
      { status: 404 }
    );
  }

  const timeline = buildTimelineFromReviewedFacts(caseId, record.facts);
  const saved = await repository.replaceTimeline(caseId, timeline);

  return Response.json({
    ok: true,
    data: {
      timeline: saved ?? timeline
    }
  } satisfies ApiResponse<RebuildTimelineResponse>);
}
