import { NextResponse } from "next/server";
import { isClinicEventName, sanitizeEventProps } from "@clinicbrief/events";

const pendoTrackUrl = "https://data.pendo.io/data/track";
const pendoAccountId = "clinicbrief-public-demo";
const pendoVisitorId = "anonymous-clinicbrief-user";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    name?: string;
    caseId?: string;
    props?: Record<string, unknown>;
  };

  if (!body.name) {
    return NextResponse.json({ ok: false, error: { code: "missing_event_name", message: "Event name is required." } }, { status: 400 });
  }

  if (!isClinicEventName(body.name)) {
    return NextResponse.json({ ok: false, error: { code: "unknown_event_name", message: "Event name is not registered." } }, { status: 400 });
  }

  const props = sanitizeEventProps(body.props);
  const forwardedToServerTrackApi = await forwardToPendoTrackApi(body.name, props);

  return NextResponse.json({
    ok: true,
    data: {
      name: body.name,
      props,
      droppedUnsafeProps: Object.keys(body.props ?? {}).length - Object.keys(props).length,
      forwardsCaseIdentifierToNovus: false,
      forwardedToServerTrackApi
    }
  });
}

async function forwardToPendoTrackApi(event: string, props: Record<string, string | number | boolean | null>) {
  const integrationKey = process.env.PENDO_INTEGRATION_KEY;

  if (!integrationKey) {
    return false;
  }

  await fetch(pendoTrackUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-pendo-integration-key": integrationKey
    },
    body: JSON.stringify({
      type: "track",
      event,
      visitorId: pendoVisitorId,
      accountId: pendoAccountId,
      timestamp: Date.now(),
      properties: props
    })
  }).catch(() => undefined);

  return true;
}
