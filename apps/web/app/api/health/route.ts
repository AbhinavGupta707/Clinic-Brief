import { NextResponse } from "next/server";

import { getReadinessHttpStatus, getRuntimeReadiness } from "../../../lib/server/runtime-config";

export function GET() {
  const readiness = getRuntimeReadiness();

  return NextResponse.json(
    {
      ok: readiness.ok,
      name: "ClinicBrief",
      data: readiness
    },
    { status: getReadinessHttpStatus(readiness) }
  );
}
