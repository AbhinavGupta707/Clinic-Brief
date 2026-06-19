import { NextResponse } from "next/server";
import { getClinicRepository } from "../../../../lib/server/clinic-repository";
import { deletePrivateFilesForCase } from "../../../../lib/server/private-storage";

export async function DELETE(_request: Request, { params }: { params: Promise<{ caseId: string }> }) {
  const { caseId } = await params;

  if (!caseId) {
    return NextResponse.json({ ok: false, error: { code: "missing_case_id", message: "Case id is required." } }, { status: 400 });
  }

  const repository = await getClinicRepository();
  let storageCleanup: Awaited<ReturnType<typeof deletePrivateFilesForCase>>;

  try {
    storageCleanup = await deletePrivateFilesForCase(caseId);
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "STORAGE_CLEANUP_FAILED",
          message: "Private file cleanup could not be completed. Check storage backend configuration before deleting the case."
        }
      },
      { status: 503 }
    );
  }

  const receipt = await repository.deleteCase(caseId);

  return NextResponse.json({
    ok: true,
    data: {
      ...receipt,
      filesRemoved: storageCleanup.filesRemoved,
      storageCleanup
    }
  });
}
