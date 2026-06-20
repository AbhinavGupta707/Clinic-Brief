"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { Events } from "@clinicbrief/events";

type DeleteReceipt = {
  status: "DELETED";
  deleted: true;
  recordsMarkedDeleted: number;
  filesRemoved: number;
  storageAction: string;
};

export function DeleteCasePanel({ caseId }: { caseId: string }) {
  const [confirmed, setConfirmed] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [receipt, setReceipt] = useState<DeleteReceipt | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function deleteCase() {
    if (!confirmed) {
      return;
    }

    setIsDeleting(true);
    setError(null);

    const response = await fetch(`/api/cases/${caseId}`, { method: "DELETE" });
    const body = (await response.json()) as { ok: boolean; data?: DeleteReceipt; error?: { message: string } };

    if (!response.ok || !body.ok || !body.data) {
      setError(body.error?.message ?? "Delete failed. Try again before uploading real data.");
      setIsDeleting(false);
      return;
    }

    setReceipt(body.data);
    setIsDeleting(false);
    window.pendo?.track?.(Events.CaseDeleted, {
      mode: "PREOP",
      deletedRecordCount: body.data.recordsMarkedDeleted,
      deletedFileCount: body.data.filesRemoved
    });
  }

  return (
    <div className="mt-4 grid gap-4">
      <label className="flex gap-3 rounded-md border border-red-100 bg-red-50 p-3 text-sm leading-6 text-red-900">
        <input
          checked={confirmed}
          className="mt-1 h-5 w-5"
          onChange={(event) => setConfirmed(event.target.checked)}
          type="checkbox"
        />
        <span>I understand this will delete files where possible and mark remaining case records as deleted.</span>
      </label>
      <button
        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-red-700 px-5 py-3 font-semibold text-white transition hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-60"
        disabled={!confirmed || isDeleting || Boolean(receipt)}
        onClick={deleteCase}
        type="button"
      >
        <Trash2 size={18} aria-hidden />
        {isDeleting ? "Deleting" : "Delete case"}
      </button>
      {error ? <p className="text-sm leading-6 text-red-700">{error}</p> : null}
      {receipt ? (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 p-4 text-sm leading-6 text-emerald-900" role="status">
          <p className="font-semibold">Case marked deleted.</p>
          <p>
            Records marked: {receipt.recordsMarkedDeleted}. Files removed: {receipt.filesRemoved}. Storage action: {receipt.storageAction}.
          </p>
        </div>
      ) : null}
    </div>
  );
}
