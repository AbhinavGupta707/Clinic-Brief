import { NextResponse } from "next/server";
import { isClinicEventName, sanitizeEventProps } from "@clinicbrief/events";

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

  return NextResponse.json({
    ok: true,
    data: {
      name: body.name,
      props,
      droppedUnsafeProps: Object.keys(body.props ?? {}).length - Object.keys(props).length,
      forwardsCaseIdentifierToNovus: false
    }
  });
}
