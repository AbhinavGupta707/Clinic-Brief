"use client";

import { BROWSER_SPEECH_PRIVACY_NOTICE, type BrowserSpeechCapability, type CaseMode, type CreateCaseInitialSource } from "@clinicbrief/types";
import { CheckCircle2, Mic, MicOff, PencilLine, ShieldCheck } from "lucide-react";
import { useCallback } from "react";
import { suggestAppointmentMode } from "../../../../lib/intake/mode-suggestion";
import { useBrowserSpeechToText } from "../../../../lib/client/speech";

type StoryDumpInputProps = {
  captureMethod: CreateCaseInitialSource["captureMethod"];
  disabled?: boolean;
  mode: CaseMode;
  onCaptureMethodChange: (captureMethod: CreateCaseInitialSource["captureMethod"]) => void;
  onReviewedChange: (reviewed: boolean) => void;
  onSuggestedModeChange: (mode: CaseMode, explanation: string) => void;
  reviewed: boolean;
  text: string;
  onTextChange: (text: string) => void;
};

export function StoryDumpInput({
  captureMethod,
  disabled,
  mode,
  onCaptureMethodChange,
  onReviewedChange,
  onSuggestedModeChange,
  reviewed,
  text,
  onTextChange
}: StoryDumpInputProps) {
  const updateText = useCallback(
    (nextText: string, nextCaptureMethod: CreateCaseInitialSource["captureMethod"]) => {
      onTextChange(nextText);
      onCaptureMethodChange(nextCaptureMethod);
      onReviewedChange(false);

      const suggestion = suggestAppointmentMode(nextText);
      onSuggestedModeChange(suggestion.mode, suggestion.explanation);
    },
    [onCaptureMethodChange, onReviewedChange, onSuggestedModeChange, onTextChange]
  );

  const speech = useBrowserSpeechToText({
    onTranscript: useCallback(
      (transcript: string) => {
        const nextText = `${text}${text ? " " : ""}${transcript}`.trim();
        updateText(nextText, "browser_speech_transcript");
      },
      [text, updateText]
    )
  });

  const speechState = getSpeechState(speech.capability, speech.isListening, text);
  const suggestion = suggestAppointmentMode(text);
  const hasStory = text.trim().length > 0;

  return (
    <section className="grid gap-4 rounded-md border border-clinic-line bg-clinic-surface p-4">
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
        <div className="grid gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <PencilLine aria-hidden className="h-5 w-5 text-clinic-primary" />
            <h2 className="text-lg font-semibold text-clinic-ink">Start with your story</h2>
          </div>
          <p className="max-w-2xl text-sm leading-6 text-clinic-muted">
            Optional: type, paste, or dictate the messy version first. You can edit it before anything is saved.
          </p>
        </div>
        <span className="inline-flex min-h-11 items-center rounded-md border border-clinic-line bg-white px-3 text-sm font-semibold text-clinic-primary">
          {speechState}
        </span>
      </div>

      <div className="grid gap-3 rounded-md border border-cyan-100 bg-white p-3">
        <div className="flex flex-wrap items-center gap-3">
          <button
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-clinic-primary px-4 py-2 font-semibold text-white hover:bg-clinic-primaryDark disabled:cursor-not-allowed disabled:opacity-60"
            disabled={disabled || speech.capability === "unsupported" || speech.isListening}
            onClick={speech.startListening}
            type="button"
          >
            <Mic aria-hidden className="h-5 w-5" />
            Start dictation
          </button>
          <button
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-clinic-line bg-white px-4 py-2 font-semibold text-clinic-ink hover:bg-cyan-50 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={disabled || !speech.isListening}
            onClick={speech.stopListening}
            type="button"
          >
            <MicOff aria-hidden className="h-5 w-5" />
            Stop
          </button>
        </div>
        <p className="text-sm leading-6 text-clinic-muted">
          {speech.capability === "unsupported" ? "Speech recognition is not available in this browser. Typed and pasted story text still works." : BROWSER_SPEECH_PRIVACY_NOTICE}
        </p>
        {speech.error ? <p className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm font-medium text-clinic-warning">{speech.error}</p> : null}
      </div>

      <label className="grid gap-2 text-sm font-medium text-clinic-ink">
        Story text
        <textarea
          className="min-h-52 rounded-md border border-clinic-line bg-white p-3 text-base leading-7 text-clinic-ink"
          disabled={disabled}
          onChange={(event) => updateText(event.target.value, captureMethod === "browser_speech_transcript" ? "browser_speech_transcript" : "typed")}
          onPaste={(event) => {
            if (captureMethod === "browser_speech_transcript") {
              return;
            }

            const pastedText = event.clipboardData.getData("text");

            if (!pastedText) {
              return;
            }

            const target = event.currentTarget;
            const start = target.selectionStart;
            const end = target.selectionEnd;
            event.preventDefault();
            updateText(`${text.slice(0, start)}${pastedText}${text.slice(end)}`, "pasted");
          }}
          placeholder="Tell ClinicBrief what has been happening, what the appointment is for, and what you want help organizing. Keep it in your own words."
          value={text}
        />
      </label>

      {hasStory ? (
        <div className="grid gap-3">
          <label className="flex min-h-11 items-start gap-3 rounded-md border border-clinic-line bg-white p-3 text-sm font-medium leading-6 text-clinic-ink">
            <input checked={reviewed} className="mt-1 h-5 w-5 accent-clinic-success" disabled={disabled} onChange={(event) => onReviewedChange(event.target.checked)} type="checkbox" />
            <span>I reviewed and edited this story text. Save only this text as a source; do not store audio.</span>
          </label>
          <div className="grid gap-3 rounded-md border border-cyan-100 bg-white p-3 sm:grid-cols-3">
            <StoryStatusTile icon={<ShieldCheck aria-hidden className="h-5 w-5" />} label="Audio stored" value="No" />
            <StoryStatusTile icon={<CheckCircle2 aria-hidden className="h-5 w-5" />} label="Reviewed" value={reviewed ? "Yes" : "Needed"} />
            <StoryStatusTile icon={<PencilLine aria-hidden className="h-5 w-5" />} label="Source type" value={captureMethod === "browser_speech_transcript" ? "Transcript" : "Text"} />
          </div>
        </div>
      ) : null}

      {hasStory ? (
        <p className="rounded-md border border-clinic-line bg-white p-3 text-sm leading-6 text-clinic-muted">
          Suggested mode: <span className="font-semibold text-clinic-ink">{labelForMode(suggestion.mode)}</span>. {suggestion.explanation} You can override this below. Current selection:{" "}
          <span className="font-semibold text-clinic-ink">{labelForMode(mode)}</span>.
        </p>
      ) : null}
    </section>
  );
}

function StoryStatusTile({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="grid min-h-20 gap-1 rounded-md border border-clinic-line bg-clinic-surface p-3">
      <div className="flex items-center gap-2 text-clinic-primary">
        {icon}
        <span className="text-xs font-semibold uppercase">{label}</span>
      </div>
      <p className="text-base font-semibold text-clinic-ink">{value}</p>
    </div>
  );
}

function getSpeechState(capability: BrowserSpeechCapability, isListening: boolean, text: string): string {
  if (capability === "unsupported") {
    return "Speech unavailable";
  }

  if (isListening) {
    return "Listening";
  }

  if (text.trim()) {
    return "Transcript ready";
  }

  return "Idle";
}

function labelForMode(mode: CaseMode): string {
  const labels: Record<CaseMode, string> = {
    PREOP: "Pre-op",
    GENERAL: "General",
    CHRONIC: "Chronic / ongoing",
    CARER: "Carer-managed"
  };

  return labels[mode];
}
