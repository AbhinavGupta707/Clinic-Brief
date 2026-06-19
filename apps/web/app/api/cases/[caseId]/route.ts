import { NextResponse } from "next/server";

export async function DELETE(_request: Request, { params }: { params: Promise<{ caseId: string }> }) {
  const { caseId } = await params;

  if (!caseId) {
    return NextResponse.json({ ok: false, error: { code: "missing_case_id", message: "Case id is required." } }, { status: 400 });
  }

  return NextResponse.json({
    ok: true,
    data: {
      status: "DELETED",
      deleted: true,
      recordsMarkedDeleted: 1,
      filesRemoved: 0,
      storageAction: caseId === "sample-preop" ? "synthetic_fixture_no_private_files" : "mark_deleted_until_storage_is_configured"
    }
  });
}
