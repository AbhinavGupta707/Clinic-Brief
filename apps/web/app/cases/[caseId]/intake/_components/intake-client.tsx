"use client";

import { Events, trackEvent } from "@clinicbrief/events";
import type { AddDocumentResponse, ApiResponse, DocumentType, ExtractCaseResponse, ListDocumentsResponse, SourcePreview } from "@clinicbrief/types";
import { AlertTriangle, FileText, Image, Sparkles, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export function IntakeClient({ caseId }: { caseId: string }) {
  const router = useRouter();
  const [noteText, setNoteText] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [manualFallbackText, setManualFallbackText] = useState("");
  const [sourcePreviews, setSourcePreviews] = useState<SourcePreview[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [safetyRequest, setSafetyRequest] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);

  useEffect(() => {
    void refreshSources();
  }, []);

  async function refreshSources() {
    const response = await fetch(`/api/cases/${caseId}/documents`);
    const payload = (await response.json()) as ApiResponse<ListDocumentsResponse>;

    if (payload.ok && payload.data) {
      setSourcePreviews(payload.data.sourcePreviews);
    }
  }

  async function addTextNote(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await addDocument({
      type: "TEXT_NOTE",
      text: noteText,
      fileName: "manual-note.txt"
    });
    setNoteText("");
  }

  async function uploadFile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedFile) {
      setStatus("Choose a PDF or image, or paste a manual note instead.");
      return;
    }

    const formData = new FormData();
    formData.append("file", selectedFile);
    formData.append("type", inferType(selectedFile));

    if (manualFallbackText.trim()) {
      formData.append("fallbackText", manualFallbackText);
    }

    await addDocument(formData);
    setSelectedFile(null);
    setManualFallbackText("");
  }

  async function addDocument(body: FormData | { type: Exclude<DocumentType, "SAMPLE">; text?: string; fileName?: string }) {
    setIsAdding(true);
    setStatus(null);
    const response = await fetch(`/api/cases/${caseId}/documents`, {
      method: "POST",
      headers: body instanceof FormData ? undefined : { "Content-Type": "application/json" },
      body: body instanceof FormData ? body : JSON.stringify(body)
    });
    const payload = (await response.json()) as ApiResponse<AddDocumentResponse>;
    setIsAdding(false);

    if (!payload.ok || !payload.data) {
      setStatus(payload.error?.message ?? "Could not add this document.");
      return;
    }

    const added = payload.data;

    trackEvent(added.document.type === "TEXT_NOTE" ? Events.TextNoteAdded : Events.DocumentUploaded, {
      documentType: added.document.type,
      parser: added.sourcePreview.parser,
      needsManualFallback: added.sourcePreview.needsManualFallback
    });
    setSourcePreviews((current) => [added.sourcePreview, ...current]);
    setStatus(added.sourcePreview.needsManualFallback ? "Parser fallback needed. Paste the visible text from that source before extracting." : "Source added and ready for extraction.");
  }

  async function runExtraction() {
    setIsExtracting(true);
    setStatus(null);
    trackEvent(Events.ExtractionStarted, { sourceCount: sourcePreviews.length });
    const response = await fetch(`/api/cases/${caseId}/extract`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ request: safetyRequest })
    });
    const payload = (await response.json()) as ApiResponse<ExtractCaseResponse>;
    setIsExtracting(false);

    if (!payload.ok || !payload.data) {
      setStatus(payload.error?.message ?? "Could not run extraction yet.");
      return;
    }

    if (payload.data.safetyRedirect) {
      setStatus(payload.data.safetyRedirect);
      return;
    }

    trackEvent(Events.ExtractionCompleted, {
      source: payload.data.source,
      factCount: payload.data.facts.length,
      questionCount: payload.data.questions.length
    });
    router.push(`/cases/${caseId}/review`);
  }

  return (
    <div className="grid gap-5">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,0.8fr)]">
        <form onSubmit={addTextNote} className="grid gap-4 rounded-md border border-clinic-line bg-white p-5 shadow-soft">
          <div className="flex items-start gap-3">
            <FileText aria-hidden className="mt-1 h-5 w-5 text-clinic-primary" />
            <div>
              <h2 className="text-lg font-semibold text-clinic-ink">Paste a note</h2>
              <p className="mt-1 text-sm leading-6 text-clinic-muted">Works locally without external services. Use this for typed notes, speech fallback, or copied PDF text.</p>
            </div>
          </div>
          <label className="grid gap-2 text-sm font-medium text-clinic-ink">
            Note text
            <textarea
              className="min-h-40 rounded-md border border-clinic-line p-3 text-base leading-7 text-clinic-ink"
              onChange={(event) => setNoteText(event.target.value)}
              placeholder="Paste appointment notes, medication list, symptom diary, or questions you want to organize."
              value={noteText}
            />
          </label>
          <button className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-clinic-success px-5 py-3 font-semibold text-white hover:bg-emerald-700 disabled:opacity-60" disabled={isAdding} type="submit">
            <FileText aria-hidden className="h-5 w-5" />
            Add text note
          </button>
        </form>

        <form onSubmit={uploadFile} className="grid content-start gap-4 rounded-md border border-clinic-line bg-white p-5 shadow-soft">
          <div className="flex items-start gap-3">
            <Upload aria-hidden className="mt-1 h-5 w-5 text-clinic-primary" />
            <div>
              <h2 className="text-lg font-semibold text-clinic-ink">PDF or image</h2>
              <p className="mt-1 text-sm leading-6 text-clinic-muted">Upload boundary is ready. Parsing and OCR failures keep a manual text fallback path open.</p>
            </div>
          </div>
          <label className="grid gap-2 text-sm font-medium text-clinic-ink">
            File
            <input
              accept="application/pdf,image/*"
              className="min-h-11 rounded-md border border-clinic-line bg-white px-3 py-2 text-sm text-clinic-muted"
              onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)}
              type="file"
            />
          </label>
          <label className="grid gap-2 text-sm font-medium text-clinic-ink">
            Manual fallback text
            <textarea
              className="min-h-28 rounded-md border border-clinic-line p-3 text-base leading-7 text-clinic-ink"
              onChange={(event) => setManualFallbackText(event.target.value)}
              placeholder="Paste visible text if parsing or OCR is unavailable."
              value={manualFallbackText}
            />
          </label>
          <button className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-clinic-line bg-white px-5 py-3 font-semibold text-clinic-ink hover:bg-cyan-50 disabled:opacity-60" disabled={isAdding} type="submit">
            <Image aria-hidden className="h-5 w-5" />
            Add file source
          </button>
        </form>
      </div>

      {status ? (
        <p className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm font-medium leading-6 text-clinic-warning" role="status">
          {status}
        </p>
      ) : null}

      <section className="grid gap-4 rounded-md border border-clinic-line bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-clinic-ink">Source previews</h2>
            <p className="mt-1 text-sm text-clinic-muted">Snippets are for review and provenance; analytics only receive counts and parser states.</p>
          </div>
          <span className="rounded-md bg-clinic-surface px-3 py-1 text-sm font-semibold text-clinic-primary">{sourcePreviews.length} sources</span>
        </div>
        <div className="grid gap-3">
          {sourcePreviews.length === 0 ? <p className="rounded-md border border-dashed border-clinic-line p-4 text-sm text-clinic-muted">Add a text note or upload a source to see previews here.</p> : null}
          {sourcePreviews.map((source) => (
            <article key={source.id} className="grid gap-3 rounded-md border border-cyan-100 p-4">
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="rounded-md bg-clinic-surface px-2 py-1 font-semibold text-clinic-primary">{source.sourceType}</span>
                <span className="rounded-md bg-emerald-50 px-2 py-1 font-semibold text-emerald-700">{Math.round(source.confidence * 100)}% parse confidence</span>
                {source.needsManualFallback ? (
                  <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-1 font-semibold text-clinic-warning">
                    <AlertTriangle aria-hidden className="h-4 w-4" />
                    Manual fallback
                  </span>
                ) : null}
              </div>
              <p className="text-sm leading-6 text-clinic-muted">{source.snippet}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="grid gap-4 rounded-md border border-clinic-line bg-white p-5">
        <label className="grid gap-2 text-sm font-medium text-clinic-ink">
          Optional extraction request
          <input
            className="min-h-11 rounded-md border border-clinic-line px-3 text-base text-clinic-ink"
            onChange={(event) => setSafetyRequest(event.target.value)}
            placeholder="Example: extract appointment-prep facts only"
            value={safetyRequest}
          />
        </label>
        <button className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-clinic-primary px-5 py-3 font-semibold text-white hover:bg-clinic-primaryDark disabled:opacity-60" disabled={isExtracting} onClick={runExtraction} type="button">
          <Sparkles aria-hidden className="h-5 w-5" />
          {isExtracting ? "Extracting..." : "Extract facts for review"}
        </button>
      </section>
    </div>
  );
}

function inferType(file: File): Exclude<DocumentType, "SAMPLE" | "TEXT_NOTE" | "VOICE_TRANSCRIPT"> {
  return file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf") ? "PDF" : "IMAGE";
}
