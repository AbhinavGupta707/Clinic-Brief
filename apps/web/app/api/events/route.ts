import { NextResponse } from "next/server";
import { sanitizeEventProps } from "@clinicbrief/events";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    name?: string;
    caseId?: string;
    props?: Record<string, unknown>;
  };

  if (!body.name) {
    return NextResponse.json({ ok: false, error: { code: "missing_event_name", message: "Event name is required." } }, { status: 400 });
  }

  return NextResponse.json({
    ok: true,
    data: {
      name: body.name,
      caseId: body.caseId,
      props: sanitizeEventProps(body.props)
    }
  });
}
