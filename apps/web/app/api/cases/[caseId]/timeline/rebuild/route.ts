import { buildTimelineFromReviewedFacts } from "@clinicbrief/exports";
import type { ApiResponse, RebuildTimelineResponse } from "@clinicbrief/types";

import { getClinicRepository } from "../../../../../../lib/server/clinic-repository";

const PENDO_TRACK_URL = "https://data.pendo.io/data/track";
const PENDO_INTEGRATION_KEY = "b4e2f26b-203f-491a-bd44-5e751aed3455";

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

  void fetch(PENDO_TRACK_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-pendo-integration-key": PENDO_INTEGRATION_KEY,
    },
    body: JSON.stringify({
      type: "track",
      event: "timeline_rebuilt",
      visitorId: "system",
      accountId: "clinicbrief-public",
      timestamp: Date.now(),
      properties: {
        eventCount: (saved ?? timeline).length,
        caseId,
        source: "rebuild_endpoint"
      },
    }),
  }).catch(() => {});

  return Response.json({
    ok: true,
    data: {
      timeline: saved ?? timeline
    }
  } satisfies ApiResponse<RebuildTimelineResponse>);
}
