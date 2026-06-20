"use client";

import { Events, trackEvent } from "@clinicbrief/events";
import type { ApiResponse, CaseMode, CreateCaseInitialSource, CreateCaseResponse } from "@clinicbrief/types";
import { ClipboardList } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { StoryDumpInput } from "./story-dump-input";

const modes: Array<{ value: CaseMode; label: string; description: string }> = [
  { value: "PREOP", label: "Pre-op", description: "Surgery-readiness notes, allergies, medicines, and practical support." },
  { value: "GENERAL", label: "General", description: "A focused brief for a GP, nurse, or other appointment." },
  { value: "CHRONIC", label: "Chronic / ongoing history", description: "Longitudinal symptoms, flares, functional impact, and questions to discuss." },
  { value: "CARER", label: "Carer-managed", description: "A consistent handoff when helping someone else prepare." }
];

export function NewCaseForm() {
  const router = useRouter();
  const [title, setTitle] = useState("Upcoming appointment brief");
  const [mode, setMode] = useState<CaseMode>("GENERAL");
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [dashboardUrl, setDashboardUrl] = useState<string | null>(null);
  const [storyText, setStoryText] = useState("");
  const [storyCaptureMethod, setStoryCaptureMethod] = useState<CreateCaseInitialSource["captureMethod"]>("typed");
  const [storyReviewed, setStoryReviewed] = useState(false);
  const [modeOverride, setModeOverride] = useState(false);
  const [modeSuggestion, setModeSuggestion] = useState("Suggested general mode because no supported workflow cue was found.");

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setDashboardUrl(null);

    if (!consent) {
      setError("Consent is required before ClinicBrief can create or store case information.");
      return;
    }

    const reviewedStoryText = storyText.trim();

    if (reviewedStoryText && !storyReviewed) {
      setError("Review the story text before creating the case. ClinicBrief saves only the reviewed text, never audio.");
      return;
    }

    let didCreateCase = false;

    try {
      setIsSubmitting(true);
      setStatus("Creating your private case...");
      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => controller.abort(), 15000);
      const response = await fetch("/api/cases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          mode,
          consent,
          initialSource: reviewedStoryText
            ? {
                text: reviewedStoryText,
                sourceLabel: "Story dump transcript",
                captureMethod: storyCaptureMethod,
                userReviewed: true,
                storesAudio: false
              }
            : undefined
        }),
        signal: controller.signal
      });
      window.clearTimeout(timeoutId);
      const payload = (await response.json().catch(() => ({
        ok: false,
        error: { message: "The case service returned an unreadable response." }
      }))) as ApiResponse<CreateCaseResponse>;

      if (!response.ok || !payload.ok || !payload.data) {
        setError(payload.error?.message ?? "Could not create the case yet.");
        return;
      }

      setStatus("Opening case dashboard...");
      trackEvent(Events.ConsentAccepted, { mode });
      trackEvent(Events.CaseCreated, { mode, sourceCount: reviewedStoryText ? 1 : 0 });
      const nextDashboardUrl = `/cases/${payload.data.caseId}`;
      didCreateCase = true;
      setDashboardUrl(nextDashboardUrl);
      router.push(nextDashboardUrl);
      window.setTimeout(() => {
        if (window.location.pathname !== nextDashboardUrl) {
          setStatus("Still opening your dashboard. Use the link below if this takes more than a few seconds.");
        }
      }, 2500);
      window.setTimeout(() => {
        if (window.location.pathname !== nextDashboardUrl) {
          window.location.assign(nextDashboardUrl);
        }
      }, 6000);
    } catch (caughtError) {
      setStatus(null);
      setError(caughtError instanceof DOMException && caughtError.name === "AbortError" ? "Creating the case took too long. Refresh and try again, or use the sample demo while the live service warms up." : "Could not create the case yet. Check the deployment configuration and try again.");
    } finally {
      if (!didCreateCase) {
        setIsSubmitting(false);
      }
    }
  }

  return (
    <form onSubmit={onSubmit} className="grid max-w-3xl gap-5 rounded-md border border-clinic-line bg-white p-5 shadow-soft">
      <label className="grid gap-2 text-sm font-medium text-clinic-ink">
        Case title
        <input
          className="min-h-11 rounded-md border border-clinic-line px-3 text-base text-clinic-ink"
          name="title"
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Upcoming pre-op appointment"
          value={title}
        />
      </label>
      <StoryDumpInput
        captureMethod={storyCaptureMethod}
        disabled={isSubmitting}
        mode={mode}
        onCaptureMethodChange={setStoryCaptureMethod}
        onReviewedChange={setStoryReviewed}
        onSuggestedModeChange={(suggestedMode, explanation) => {
          setModeSuggestion(explanation);
          if (!modeOverride) {
            setMode(suggestedMode);
          }
        }}
        onTextChange={setStoryText}
        reviewed={storyReviewed}
        text={storyText}
      />
      <fieldset className="grid gap-3">
        <legend className="text-sm font-semibold text-clinic-ink">Appointment context</legend>
        {storyText.trim() ? <p className="text-sm leading-6 text-clinic-muted">{modeSuggestion} You can override the suggestion here.</p> : null}
        <div className="grid gap-3 sm:grid-cols-2">
          {modes.map((item) => (
            <label key={item.value} className="flex min-h-11 cursor-pointer items-start gap-3 rounded-md border border-clinic-line px-3 py-3 text-sm text-clinic-muted">
              <input
                checked={mode === item.value}
                className="mt-1"
                name="mode"
                onChange={() => {
                  setMode(item.value);
                  setModeOverride(true);
                }}
                type="radio"
                value={item.value}
              />
              <span className="grid gap-1">
                <span className="font-semibold text-clinic-ink">{item.label}</span>
                <span className="leading-5">{item.description}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <label className="flex gap-3 rounded-md border border-cyan-100 bg-clinic-surface p-4 text-sm leading-6 text-clinic-muted">
        <input checked={consent} className="mt-1 h-5 w-5" name="consent" onChange={(event) => setConsent(event.target.checked)} required type="checkbox" />
        <span>
          I understand this app processes health information I provide. It organizes information for appointment preparation only and does not provide medical advice.
        </span>
      </label>
      {error ? <p className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm font-medium text-clinic-warning">{error}</p> : null}
      {status ? <p className="text-sm font-medium text-clinic-muted" role="status">{status}</p> : null}
      {dashboardUrl ? (
        <a className="text-sm font-semibold text-clinic-primary underline-offset-4 hover:underline" href={dashboardUrl}>
          Open dashboard directly
        </a>
      ) : null}
      <button
        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-clinic-success px-5 py-3 font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
        disabled={isSubmitting}
        type="submit"
      >
        <ClipboardList aria-hidden className="h-5 w-5" />
        {isSubmitting ? "Creating case..." : "Open dashboard"}
      </button>
    </form>
  );
}
