"use client";

import { Events, trackEvent } from "@clinicbrief/events";
import type { ApiResponse, CaseMode, CreateCaseResponse } from "@clinicbrief/types";
import { ClipboardList } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

const modes: Array<{ value: CaseMode; label: string }> = [
  { value: "PREOP", label: "Pre-op" },
  { value: "GENERAL", label: "General" },
  { value: "CHRONIC", label: "Ongoing history" },
  { value: "CARER", label: "Carer-managed" }
];

export function NewCaseForm() {
  const router = useRouter();
  const [title, setTitle] = useState("Upcoming appointment brief");
  const [mode, setMode] = useState<CaseMode>("GENERAL");
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!consent) {
      setError("Consent is required before ClinicBrief can create or store case information.");
      return;
    }

    try {
      setIsSubmitting(true);
      setStatus("Creating your private case...");
      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => controller.abort(), 15000);
      const response = await fetch("/api/cases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, mode, consent }),
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
      trackEvent(Events.CaseCreated, { mode });
      const dashboardUrl = `/cases/${payload.data.caseId}`;
      router.push(dashboardUrl);
      window.setTimeout(() => {
        if (window.location.pathname !== dashboardUrl) {
          window.location.assign(dashboardUrl);
        }
      }, 400);
    } catch (caughtError) {
      setStatus(null);
      setError(caughtError instanceof DOMException && caughtError.name === "AbortError" ? "Creating the case took too long. Refresh and try again, or use the sample demo while the live service warms up." : "Could not create the case yet. Check the deployment configuration and try again.");
    } finally {
      setIsSubmitting(false);
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
      <fieldset className="grid gap-3">
        <legend className="text-sm font-semibold text-clinic-ink">Appointment context</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          {modes.map((item) => (
            <label key={item.value} className="flex min-h-11 cursor-pointer items-center gap-3 rounded-md border border-clinic-line px-3 py-2 text-sm font-medium text-clinic-muted">
              <input checked={mode === item.value} name="mode" onChange={() => setMode(item.value)} type="radio" value={item.value} />
              {item.label}
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
