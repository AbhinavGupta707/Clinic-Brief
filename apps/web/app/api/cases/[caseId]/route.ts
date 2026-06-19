import { NextResponse } from "next/server";
import { getClinicRepository } from "../../../../lib/server/clinic-repository";

export async function DELETE(_request: Request, { params }: { params: Promise<{ caseId: string }> }) {
  const { caseId } = await params;

  if (!caseId) {
    return NextResponse.json({ ok: false, error: { code: "missing_case_id", message: "Case id is required." } }, { status: 400 });
  }

  const repository = await getClinicRepository();
  const receipt = await repository.deleteCase(caseId);

  return NextResponse.json({
    ok: true,
    data: receipt
  });
}
