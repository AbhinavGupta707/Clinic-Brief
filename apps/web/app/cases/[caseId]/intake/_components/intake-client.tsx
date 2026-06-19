"use client";

import { Events, trackEvent } from "@clinicbrief/events";
import {
  BROWSER_SPEECH_PRIVACY_NOTICE,
  type AddDocumentResponse,
  type ApiResponse,
  type DocumentType,
  type ExtractCaseResponse,
  type GuidedIntakeStepId,
  type HealthDocumentMetadata,
  type ListDocumentsResponse,
  type SourcePreview
} from "@clinicbrief/types";
import { AlertTriangle, ArrowLeft, ArrowRight, CalendarDays, CheckCircle2, FileSearch, FileText, Image, Loader2, Mic, MicOff, Pill, ShieldCheck, Sparkles, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import type { FormEvent, ReactNode } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useBrowserSpeechToText } from "../../../../../lib/client/speech";

const safetyCopy =
  "ClinicBrief organizes information you provide so you can prepare for appointments. It does not diagnose, recommend treatment, or replace medical advice. Review everything before sharing it with a clinician.";

const steps: Array<{ id: GuidedIntakeStepId; label: string; shortLabel: string }> = [
  { id: "appointment_goal", label: "Appointment goal", shortLabel: "Goal" },
  { id: "story_starter", label: "Story starter", shortLabel: "Story" },
  { id: "timeline_anchors", label: "Timeline anchors", shortLabel: "Timeline" },
  { id: "medications_allergies", label: "Meds and allergies", shortLabel: "Meds" },
  { id: "documents", label: "Documents", shortLabel: "Sources" },
  { id: "review_before_extraction", label: "Review and extract", shortLabel: "Review" }
];

const appointmentTypes = ["GP review", "Consultant or specialist", "Pre-op", "Carer handoff", "Other"];

const syntheticLiveFlowText =
  "Synthetic practice note: I am preparing for an appointment about symptoms that have changed over the last few months. I want a clear timeline, current medicines and supplements, allergies or reactions, recent tests, and the questions I should remember to ask.";

type DocumentBody = {
  type: Exclude<DocumentType, "SAMPLE">;
  text?: string;
  fileName?: string;
  metadata?: HealthDocumentMetadata;
};

export function IntakeClient({ caseId }: { caseId: string }) {
  const router = useRouter();
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [savedSteps, setSavedSteps] = useState<GuidedIntakeStepId[]>([]);
  const [sourcePreviews, setSourcePreviews] = useState<SourcePreview[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);

  const [appointmentType, setAppointmentType] = useState(appointmentTypes[0]);
  const [mainConcern, setMainConcern] = useState("");
  const [appointmentGoal, setAppointmentGoal] = useState("");
  const [storyText, setStoryText] = useState("");
  const [speechTouched, setSpeechTouched] = useState(false);
  const [speechReviewed, setSpeechReviewed] = useState(false);
  const [beganWhen, setBeganWhen] = useState("");
  const [recentChange, setRecentChange] = useState("");
  const [lastAppointment, setLastAppointment] = useState("");
  const [medicationText, setMedicationText] = useState("");
  const [allergyText, setAllergyText] = useState("");
  const [documentNoteText, setDocumentNoteText] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [manualFallbackText, setManualFallbackText] = useState("");
  const [safetyRequest, setSafetyRequest] = useState("");

  const currentStep = steps[currentStepIndex] ?? steps[0];
  const savedStepSet = useMemo(() => new Set(savedSteps), [savedSteps]);
  const canGoBack = currentStepIndex > 0;
  const canGoForward = currentStepIndex < steps.length - 1;

  const speech = useBrowserSpeechToText({
    onTranscript: useCallback((transcript: string) => {
      setSpeechTouched(true);
      setSpeechReviewed(false);
      setStoryText((current) => `${current}${current ? " " : ""}${transcript}`.trim());
    }, [])
  });

  useEffect(() => {
    void refreshSources();
  }, []);

  async function refreshSources() {
    try {
      const response = await fetch(`/api/cases/${caseId}/documents`);
      const payload = (await response.json()) as ApiResponse<ListDocumentsResponse>;

      if (payload.ok && payload.data) {
        setSourcePreviews(payload.data.sourcePreviews);
      }
    } catch {
      setStatus("Could not refresh source previews. Saved sources will reappear after reload.");
    }
  }

  async function saveGuidedStep(stepId: GuidedIntakeStepId) {
    const document = buildGuidedDocument(stepId);

    if (!document) {
      return;
    }

    const added = await addDocument(document);

    if (added) {
      setSavedSteps((current) => (current.includes(stepId) ? current : [...current, stepId]));
      setStatus(`${sourceLabelFor(stepId)} saved as source material.`);
    }
  }

  async function addPastedSource(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!documentNoteText.trim()) {
      setStatus("Add pasted text before saving this source.");
      return;
    }

    const added = await addDocument({
      type: "TEXT_NOTE",
      fileName: "pasted-source-note.txt",
      text: documentNoteText,
      metadata: {
        kind: "text_note",
        sourceLabel: "Pasted source note",
        captureMethod: "pasted",
        userReviewed: true
      }
    });

    if (added) {
      setDocumentNoteText("");
    }
  }

  async function uploadFile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedFile) {
      setStatus("Choose a PDF or image, or paste source text instead.");
      return;
    }

    const type = inferType(selectedFile);
    const formData = new FormData();
    formData.append("file", selectedFile);
    formData.append("type", type);
    formData.append(
      "metadata",
      JSON.stringify({
        kind: "uploaded_document",
        sourceLabel: type === "PDF" ? "Uploaded PDF" : "Uploaded image",
        originalContentType: selectedFile.type,
        needsManualFallback: Boolean(manualFallbackText.trim())
      } satisfies HealthDocumentMetadata)
    );

    if (manualFallbackText.trim()) {
      formData.append("fallbackText", manualFallbackText);
    }

    const added = await addDocument(formData);

    if (added) {
      setSelectedFile(null);
      setManualFallbackText("");
    }
  }

  async function addSyntheticPracticeText() {
    const added = await addDocument({
      type: "TEXT_NOTE",
      fileName: "synthetic-live-flow-practice-note.txt",
      text: syntheticLiveFlowText,
      metadata: {
        kind: "text_note",
        sourceLabel: "Synthetic live-flow practice note",
        captureMethod: "fixture",
        userReviewed: true
      }
    });

    if (added) {
      setStatus("Synthetic practice source added. Replace it with your own reviewed text when you are ready.");
    }
  }

  async function addDocument(body: FormData | DocumentBody): Promise<AddDocumentResponse | null> {
    setIsAdding(true);
    setStatus(null);

    try {
      const response = await fetchWithTimeout(`/api/cases/${caseId}/documents`, {
        method: "POST",
        headers: body instanceof FormData ? undefined : { "Content-Type": "application/json" },
        body: body instanceof FormData ? body : JSON.stringify(body)
      });
      const payload = (await response.json()) as ApiResponse<AddDocumentResponse>;

      if (!payload.ok || !payload.data) {
        setStatus(payload.error?.message ?? "Could not add this source.");
        return null;
      }

      const added = payload.data;
      trackEvent(added.document.type === "TEXT_NOTE" || added.document.type === "VOICE_TRANSCRIPT" ? Events.TextNoteAdded : Events.DocumentUploaded, {
        documentCount: sourcePreviews.length + 1
      });
      setSourcePreviews((current) => [added.sourcePreview, ...current]);
      setStatus(added.sourcePreview.needsManualFallback ? "Parser fallback needed. Paste the visible text from that source before extracting." : "Source added and ready for review.");
      return added;
    } catch (error) {
      setStatus(error instanceof DOMException && error.name === "AbortError" ? "Saving took too long. Check your connection and try again." : "Could not save this source. Try again.");
      return null;
    } finally {
      setIsAdding(false);
    }
  }

  async function runExtraction() {
    if (sourcePreviews.length === 0) {
      setStatus("Add at least one reviewed source before extraction.");
      return;
    }

    setIsExtracting(true);
    setStatus(null);
    trackEvent(Events.ExtractionStarted, { sourceCount: sourcePreviews.length });

    try {
      const response = await fetchWithTimeout(
        `/api/cases/${caseId}/extract`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ request: safetyRequest })
        },
        30000
      );
      const payload = (await response.json()) as ApiResponse<ExtractCaseResponse>;

      if (!payload.ok || !payload.data) {
        setStatus(payload.error?.message ?? "Could not run extraction yet.");
        return;
      }

      if (payload.data.safetyRedirect) {
        setStatus(payload.data.safetyRedirect);
        return;
      }

      trackEvent(Events.ExtractionCompleted, {
        factCount: payload.data.facts.length,
        questionCount: payload.data.questions.length
      });
      router.push(`/cases/${caseId}/review`);
    } catch (error) {
      setStatus(error instanceof DOMException && error.name === "AbortError" ? "Extraction is taking longer than expected. Try again, or add a shorter source first." : "Could not run extraction yet. Try again.");
    } finally {
      setIsExtracting(false);
    }
  }

  function buildGuidedDocument(stepId: GuidedIntakeStepId): DocumentBody | null {
    const sourceLabel = sourceLabelFor(stepId);
    const metadataBase = {
      kind: "guided_intake",
      stepId,
      sourceLabel,
      userReviewed: true,
      storesAudio: false
    } as const;

    if (stepId === "appointment_goal") {
      const text = formatLines(sourceLabel, [
        ["Appointment type", appointmentType],
        ["Main question or concern", mainConcern],
        ["Goal for the appointment", appointmentGoal]
      ]);

      if (!hasUsefulText(text)) {
        setStatus("Add an appointment goal or concern before saving.");
        return null;
      }

      return {
        type: "TEXT_NOTE",
        fileName: "guided-appointment-goal.txt",
        text,
        metadata: { ...metadataBase, captureMethod: "typed" }
      };
    }

    if (stepId === "story_starter") {
      if (!storyText.trim()) {
        setStatus("Add your story starter before saving.");
        return null;
      }

      if (speechTouched && !speechReviewed) {
        setStatus("Review the transcript text before saving it.");
        return null;
      }

      return {
        type: speechTouched ? "VOICE_TRANSCRIPT" : "TEXT_NOTE",
        fileName: speechTouched ? "guided-story-reviewed-transcript.txt" : "guided-story-starter.txt",
        text: formatLines(sourceLabel, [["Reviewed story text", storyText]]),
        metadata: {
          ...metadataBase,
          captureMethod: speechTouched ? "browser_speech_transcript" : "typed",
          browserSpeech: speechTouched
            ? {
                capability: speech.capability,
                transcriptReviewed: true,
                audioStored: false,
                submittedByUser: true
              }
            : undefined
        }
      };
    }

    if (stepId === "timeline_anchors") {
      const text = formatLines(sourceLabel, [
        ["When this began", beganWhen],
        ["What changed recently", recentChange],
        ["Last appointment or test", lastAppointment]
      ]);

      if (!hasUsefulText(text)) {
        setStatus("Add at least one timeline anchor before saving.");
        return null;
      }

      return {
        type: "TEXT_NOTE",
        fileName: "guided-timeline-anchors.txt",
        text,
        metadata: { ...metadataBase, captureMethod: "typed" }
      };
    }

    if (stepId === "medications_allergies") {
      const text = formatLines(sourceLabel, [
        ["Current medications, treatments, or supplements as user-reported", medicationText],
        ["Allergies, reactions, or important notes as user-reported", allergyText]
      ]);

      if (!hasUsefulText(text)) {
        setStatus("Add medication, supplement, allergy, or important-note text before saving.");
        return null;
      }

      return {
        type: "TEXT_NOTE",
        fileName: "guided-medications-allergies.txt",
        text,
        metadata: { ...metadataBase, captureMethod: "typed" }
      };
    }

    setStatus("Add pasted text or upload a document from the Sources step.");
    return null;
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(12rem,16rem)_minmax(0,1fr)_minmax(18rem,24rem)]">
      <aside className="grid content-start gap-3 rounded-md border border-clinic-line bg-white p-4 shadow-soft">
        <p className="text-sm font-semibold text-clinic-primary">Guided intake</p>
        <div className="grid gap-2">
          {steps.map((step, index) => {
            const isCurrent = step.id === currentStep.id;
            const isSaved = savedStepSet.has(step.id);

            return (
              <button
                className={`flex min-h-11 items-center justify-between gap-3 rounded-md border px-3 py-2 text-left text-sm font-semibold transition ${
                  isCurrent ? "border-clinic-primary bg-clinic-surface text-clinic-primary" : "border-clinic-line bg-white text-clinic-ink hover:bg-cyan-50"
                }`}
                key={step.id}
                onClick={() => setCurrentStepIndex(index)}
                type="button"
              >
                <span>{step.shortLabel}</span>
                {isSaved ? <CheckCircle2 aria-hidden className="h-4 w-4 text-clinic-success" /> : null}
              </button>
            );
          })}
        </div>
        <p className="rounded-md border border-clinic-line bg-clinic-surface p-3 text-xs leading-5 text-clinic-muted">{safetyCopy}</p>
      </aside>

      <main className="grid content-start gap-4">
        {status ? (
          <p className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm font-medium leading-6 text-clinic-warning" role="status">
            {status}
          </p>
        ) : null}

        <section className="grid gap-5 rounded-md border border-clinic-line bg-white p-5 shadow-soft">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-clinic-primary">
                Step {currentStepIndex + 1} of {steps.length}
              </p>
              <h2 className="mt-1 text-2xl font-semibold text-clinic-ink">{currentStep.label}</h2>
            </div>
            <span className="rounded-md bg-clinic-surface px-3 py-1 text-sm font-semibold text-clinic-primary">{sourcePreviews.length} sources</span>
          </div>

          {currentStep.id === "appointment_goal" ? (
            <div className="grid gap-4">
              <label className="grid gap-2 text-sm font-medium text-clinic-ink">
                Appointment type
                <select className="min-h-11 rounded-md border border-clinic-line bg-white px-3 text-base text-clinic-ink" onChange={(event) => setAppointmentType(event.target.value)} value={appointmentType}>
                  {appointmentTypes.map((type) => (
                    <option key={type}>{type}</option>
                  ))}
                </select>
              </label>
              <label className="grid gap-2 text-sm font-medium text-clinic-ink">
                Main question or concern
                <input className="min-h-11 rounded-md border border-clinic-line px-3 text-base text-clinic-ink" onChange={(event) => setMainConcern(event.target.value)} placeholder="What do you most want covered?" value={mainConcern} />
              </label>
              <label className="grid gap-2 text-sm font-medium text-clinic-ink">
                Goal for the appointment
                <textarea className="min-h-28 rounded-md border border-clinic-line p-3 text-base leading-7 text-clinic-ink" onChange={(event) => setAppointmentGoal(event.target.value)} placeholder="What would make this appointment feel useful?" value={appointmentGoal} />
              </label>
            </div>
          ) : null}

          {currentStep.id === "story_starter" ? (
            <div className="grid gap-4">
              <div className="flex flex-wrap items-center gap-3 rounded-md border border-clinic-line bg-clinic-surface p-3">
                <button
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-clinic-primary px-4 py-2 font-semibold text-white hover:bg-clinic-primaryDark disabled:opacity-60"
                  disabled={speech.capability === "unsupported" || speech.isListening}
                  onClick={speech.startListening}
                  type="button"
                >
                  <Mic aria-hidden className="h-5 w-5" />
                  Start speech
                </button>
                <button className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-clinic-line bg-white px-4 py-2 font-semibold text-clinic-ink hover:bg-cyan-50 disabled:opacity-60" disabled={!speech.isListening} onClick={speech.stopListening} type="button">
                  <MicOff aria-hidden className="h-5 w-5" />
                  Stop
                </button>
                <p className="text-sm leading-6 text-clinic-muted">{speech.capability === "supported" ? BROWSER_SPEECH_PRIVACY_NOTICE : "Typed notes are always available. Speech recognition is unavailable in some browsers."}</p>
              </div>
              {speech.error ? <p className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm font-medium text-clinic-warning">{speech.error}</p> : null}
              <label className="grid gap-2 text-sm font-medium text-clinic-ink">
                Story starter
                <textarea className="min-h-48 rounded-md border border-clinic-line p-3 text-base leading-7 text-clinic-ink" onChange={(event) => setStoryText(event.target.value)} placeholder="What has been happening? Include the wording you want ClinicBrief to organize." value={storyText} />
              </label>
              {speechTouched ? (
                <label className="flex items-start gap-3 rounded-md border border-clinic-line bg-white p-3 text-sm font-medium leading-6 text-clinic-ink">
                  <input className="mt-1 h-5 w-5 accent-clinic-success" checked={speechReviewed} onChange={(event) => setSpeechReviewed(event.target.checked)} type="checkbox" />
                  I reviewed and edited this transcript text. Save only this text; do not store audio.
                </label>
              ) : null}
            </div>
          ) : null}

          {currentStep.id === "timeline_anchors" ? (
            <div className="grid gap-4">
              <Field icon={<CalendarDays aria-hidden className="h-5 w-5" />} label="When this began" onChange={setBeganWhen} placeholder="A date, month, season, or approximate phrase" value={beganWhen} />
              <label className="grid gap-2 text-sm font-medium text-clinic-ink">
                What changed recently
                <textarea className="min-h-28 rounded-md border border-clinic-line p-3 text-base leading-7 text-clinic-ink" onChange={(event) => setRecentChange(event.target.value)} placeholder="What is different since the last appointment or the start of this story?" value={recentChange} />
              </label>
              <Field icon={<FileSearch aria-hidden className="h-5 w-5" />} label="Last appointment or test" onChange={setLastAppointment} placeholder="Date, result to discuss, or source you plan to upload" value={lastAppointment} />
            </div>
          ) : null}

          {currentStep.id === "medications_allergies" ? (
            <div className="grid gap-4">
              <label className="grid gap-2 text-sm font-medium text-clinic-ink">
                Current medications, treatments, or supplements
                <textarea className="min-h-32 rounded-md border border-clinic-line p-3 text-base leading-7 text-clinic-ink" onChange={(event) => setMedicationText(event.target.value)} placeholder="Use your own wording from labels or notes. ClinicBrief will not suggest changes." value={medicationText} />
              </label>
              <label className="grid gap-2 text-sm font-medium text-clinic-ink">
                Allergies, reactions, or important notes
                <textarea className="min-h-32 rounded-md border border-clinic-line p-3 text-base leading-7 text-clinic-ink" onChange={(event) => setAllergyText(event.target.value)} placeholder="Anything you want to remember to confirm at the appointment." value={allergyText} />
              </label>
            </div>
          ) : null}

          {currentStep.id === "documents" ? (
            <div className="grid gap-4 lg:grid-cols-2">
              <form onSubmit={addPastedSource} className="grid gap-4 rounded-md border border-clinic-line p-4">
                <div className="flex items-start gap-3">
                  <FileText aria-hidden className="mt-1 h-5 w-5 text-clinic-primary" />
                  <div>
                    <h3 className="font-semibold text-clinic-ink">Paste source text</h3>
                    <p className="mt-1 text-sm leading-6 text-clinic-muted">Copied letters, portal notes, diary entries, or visible text from scanned files.</p>
                  </div>
                </div>
                <textarea className="min-h-40 rounded-md border border-clinic-line p-3 text-base leading-7 text-clinic-ink" onChange={(event) => setDocumentNoteText(event.target.value)} placeholder="Paste reviewed source text here." value={documentNoteText} />
                <button className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-clinic-success px-5 py-3 font-semibold text-white hover:bg-emerald-700 disabled:opacity-60" disabled={isAdding} type="submit">
                  {isAdding ? <Loader2 aria-hidden className="h-5 w-5 animate-spin" /> : <FileText aria-hidden className="h-5 w-5" />}
                  Save pasted source
                </button>
              </form>

              <form onSubmit={uploadFile} className="grid gap-4 rounded-md border border-clinic-line p-4">
                <div className="flex items-start gap-3">
                  <Upload aria-hidden className="mt-1 h-5 w-5 text-clinic-primary" />
                  <div>
                    <h3 className="font-semibold text-clinic-ink">Add PDF or image</h3>
                    <p className="mt-1 text-sm leading-6 text-clinic-muted">Manual fallback keeps extraction available when text parsing is limited.</p>
                  </div>
                </div>
                <input accept="application/pdf,image/*" className="min-h-11 rounded-md border border-clinic-line bg-white px-3 py-2 text-sm text-clinic-muted" onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)} type="file" />
                <textarea className="min-h-28 rounded-md border border-clinic-line p-3 text-base leading-7 text-clinic-ink" onChange={(event) => setManualFallbackText(event.target.value)} placeholder="Optional visible text fallback." value={manualFallbackText} />
                <button className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-clinic-line bg-white px-5 py-3 font-semibold text-clinic-ink hover:bg-cyan-50 disabled:opacity-60" disabled={isAdding} type="submit">
                  {isAdding ? <Loader2 aria-hidden className="h-5 w-5 animate-spin" /> : <Image aria-hidden className="h-5 w-5" />}
                  Save file source
                </button>
              </form>
            </div>
          ) : null}

          {currentStep.id === "review_before_extraction" ? (
            <div className="grid gap-4">
              <div className="grid gap-3 rounded-md border border-clinic-line bg-clinic-surface p-4 sm:grid-cols-3">
                <SummaryTile icon={<ShieldCheck aria-hidden className="h-5 w-5" />} label="Reviewed sources" value={sourcePreviews.length.toString()} />
                <SummaryTile icon={<Mic aria-hidden className="h-5 w-5" />} label="Audio stored" value="No" />
                <SummaryTile icon={<Pill aria-hidden className="h-5 w-5" />} label="Advice generated" value="No" />
              </div>
              <label className="grid gap-2 text-sm font-medium text-clinic-ink">
                Optional extraction focus
                <input className="min-h-11 rounded-md border border-clinic-line px-3 text-base text-clinic-ink" onChange={(event) => setSafetyRequest(event.target.value)} placeholder="Example: extract appointment-prep facts only" value={safetyRequest} />
              </label>
              <div className="flex flex-wrap gap-3">
                <button className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-clinic-primary px-5 py-3 font-semibold text-white hover:bg-clinic-primaryDark disabled:opacity-60" disabled={isExtracting || sourcePreviews.length === 0} onClick={runExtraction} type="button">
                  {isExtracting ? <Loader2 aria-hidden className="h-5 w-5 animate-spin" /> : <Sparkles aria-hidden className="h-5 w-5" />}
                  {isExtracting ? "Extracting..." : "Extract facts for review"}
                </button>
                <button className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-clinic-line bg-white px-5 py-3 font-semibold text-clinic-ink hover:bg-cyan-50 disabled:opacity-60" disabled={isAdding} onClick={addSyntheticPracticeText} type="button">
                  <FileText aria-hidden className="h-5 w-5" />
                  Add synthetic practice source
                </button>
              </div>
            </div>
          ) : null}

          <div className="flex flex-wrap justify-between gap-3 border-t border-clinic-line pt-4">
            <button className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-clinic-line bg-white px-4 py-2 font-semibold text-clinic-ink hover:bg-cyan-50 disabled:opacity-50" disabled={!canGoBack} onClick={() => setCurrentStepIndex((index) => Math.max(0, index - 1))} type="button">
              <ArrowLeft aria-hidden className="h-5 w-5" />
              Back
            </button>
            <div className="flex flex-wrap gap-3">
              {currentStep.id !== "documents" && currentStep.id !== "review_before_extraction" ? (
                <button className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-clinic-success px-4 py-2 font-semibold text-white hover:bg-emerald-700 disabled:opacity-60" disabled={isAdding} onClick={() => void saveGuidedStep(currentStep.id)} type="button">
                  {isAdding ? <Loader2 aria-hidden className="h-5 w-5 animate-spin" /> : <CheckCircle2 aria-hidden className="h-5 w-5" />}
                  Save reviewed step
                </button>
              ) : null}
              <button className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-clinic-line bg-white px-4 py-2 font-semibold text-clinic-ink hover:bg-cyan-50 disabled:opacity-50" disabled={!canGoForward} onClick={() => setCurrentStepIndex((index) => Math.min(steps.length - 1, index + 1))} type="button">
                Next
                <ArrowRight aria-hidden className="h-5 w-5" />
              </button>
            </div>
          </div>
        </section>
      </main>

      <aside className="grid content-start gap-4 rounded-md border border-clinic-line bg-white p-5 shadow-soft">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-clinic-ink">Source previews</h2>
            <p className="mt-1 text-sm text-clinic-muted">Previews stay out of analytics.</p>
          </div>
          <span className="rounded-md bg-clinic-surface px-3 py-1 text-sm font-semibold text-clinic-primary">{sourcePreviews.length}</span>
        </div>
        <div className="grid gap-3">
          {sourcePreviews.length === 0 ? <p className="rounded-md border border-dashed border-clinic-line p-4 text-sm text-clinic-muted">Saved intake answers and documents appear here.</p> : null}
          {sourcePreviews.map((source) => (
            <article key={source.id} className="grid gap-3 rounded-md border border-cyan-100 p-4">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="rounded-md bg-clinic-surface px-2 py-1 font-semibold text-clinic-primary">{labelForSource(source)}</span>
                <span className="rounded-md bg-emerald-50 px-2 py-1 font-semibold text-emerald-700">{Math.round(source.confidence * 100)}% parse</span>
                {source.needsManualFallback ? (
                  <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-1 font-semibold text-clinic-warning">
                    <AlertTriangle aria-hidden className="h-4 w-4" />
                    Fallback
                  </span>
                ) : null}
              </div>
              <p className="line-clamp-5 text-sm leading-6 text-clinic-muted">{source.snippet}</p>
            </article>
          ))}
        </div>
      </aside>
    </div>
  );
}

function Field({ icon, label, onChange, placeholder, value }: { icon: ReactNode; label: string; onChange: (value: string) => void; placeholder: string; value: string }) {
  return (
    <label className="grid gap-2 text-sm font-medium text-clinic-ink">
      <span className="inline-flex items-center gap-2">
        {icon}
        {label}
      </span>
      <input className="min-h-11 rounded-md border border-clinic-line px-3 text-base text-clinic-ink" onChange={(event) => onChange(event.target.value)} placeholder={placeholder} value={value} />
    </label>
  );
}

function SummaryTile({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="grid gap-2 rounded-md border border-clinic-line bg-white p-3">
      <div className="flex items-center gap-2 text-clinic-primary">
        {icon}
        <span className="text-xs font-semibold uppercase">{label}</span>
      </div>
      <p className="text-xl font-semibold text-clinic-ink">{value}</p>
    </div>
  );
}

function sourceLabelFor(stepId: GuidedIntakeStepId): string {
  const labels: Record<GuidedIntakeStepId, string> = {
    appointment_goal: "Guided intake: appointment goal",
    story_starter: "Guided intake: story starter",
    timeline_anchors: "Guided intake: timeline anchors",
    medications_allergies: "Guided intake: medications and allergies",
    documents: "Guided intake: documents",
    review_before_extraction: "Guided intake: review before extraction"
  };

  return labels[stepId];
}

function labelForSource(source: SourcePreview): string {
  return source.metadata?.kind === "guided_intake" || source.metadata?.kind === "text_note" || source.metadata?.kind === "uploaded_document" || source.metadata?.kind === "voice_transcript" ? source.metadata.sourceLabel : source.sourceType;
}

function formatLines(title: string, rows: Array<[string, string]>): string {
  return [title, ...rows.map(([label, value]) => `${label}: ${value.trim() || "not provided"}`)].join("\n");
}

function hasUsefulText(text: string): boolean {
  return text
    .split("\n")
    .slice(1)
    .some((line) => !line.endsWith("not provided"));
}

function inferType(file: File): Exclude<DocumentType, "SAMPLE" | "TEXT_NOTE" | "VOICE_TRANSCRIPT"> {
  return file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf") ? "PDF" : "IMAGE";
}

async function fetchWithTimeout(input: RequestInfo | URL, init: RequestInit, timeoutMs = 15000): Promise<Response> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    window.clearTimeout(timeout);
  }
}
