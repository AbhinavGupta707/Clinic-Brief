"use client";

import { Events, trackEvent } from "@clinicbrief/events";
import type { ApiResponse, ExtractCaseResponse, ExtractedFact, MissingQuestion, UpdateFactResponse } from "@clinicbrief/types";
import { Check, ChevronDown, Pencil, RotateCcw, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

export function ReviewClient({ caseId }: { caseId: string }) {
  const [facts, setFacts] = useState<ExtractedFact[]>([]);
  const [questions, setQuestions] = useState<MissingQuestion[]>([]);
  const [source, setSource] = useState<ExtractCaseResponse["source"]>("fixture");
  const [status, setStatus] = useState<string | null>(null);
  const [editingFactId, setEditingFactId] = useState<string | null>(null);
  const [draftText, setDraftText] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [pendingFactId, setPendingFactId] = useState<string | null>(null);
  const [savedFactId, setSavedFactId] = useState<string | null>(null);
  const isDemoCase = caseId === "sample-preop";
  const confirmedCount = facts.filter((fact) => fact.userStatus === "CONFIRMED" || fact.userStatus === "EDITED").length;
  const rejectedCount = facts.filter((fact) => fact.userStatus === "REJECTED").length;
  const needsReviewCount = facts.length - confirmedCount - rejectedCount;

  useEffect(() => {
    void loadExtraction();
  }, []);

  async function loadExtraction(): Promise<boolean> {
    setIsLoading(true);
    const response = await fetch(`/api/cases/${caseId}/extract`);
    const payload = (await response.json()) as ApiResponse<ExtractCaseResponse>;
    setIsLoading(false);

    if (!payload.ok || !payload.data) {
      setStatus(payload.error?.message ?? "Run extraction from intake first.");
      return false;
    }

    setFacts(payload.data.facts);
    setQuestions(payload.data.questions);
    setSource(payload.data.source);
    setStatus(null);
    return true;
  }

  async function runExtraction() {
    setStatus(null);

    if (isDemoCase) {
      const loaded = await loadExtraction();
      if (loaded) {
        setStatus("Sample facts refreshed. Review choices in the demo are saved in this browser view only.");
      }
      return;
    }

    const response = await fetch(`/api/cases/${caseId}/extract`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({})
    });
    const payload = (await response.json()) as ApiResponse<ExtractCaseResponse>;

    if (!payload.ok || !payload.data) {
      setStatus(payload.error?.message ?? "Could not run extraction.");
      return;
    }

    setFacts(payload.data.facts);
    setQuestions(payload.data.questions);
    setSource(payload.data.source);
    trackEvent(Events.ExtractionCompleted, {
      source: payload.data.source,
      factCount: payload.data.facts.length,
      questionCount: payload.data.questions.length
    });
  }

  async function updateFactState(fact: ExtractedFact, userStatus: ExtractedFact["userStatus"], displayText = fact.displayText) {
    const cleanDisplayText = displayText.trim();

    if (userStatus === "EDITED" && cleanDisplayText.length === 0) {
      setStatus("Edited facts need text before they can be saved.");
      return;
    }

    const nextFact: ExtractedFact = {
      ...fact,
      displayText: cleanDisplayText,
      userStatus
    };

    setPendingFactId(fact.id);
    setSavedFactId(null);
    setStatus(null);
    setFacts((current) => current.map((item) => (item.id === fact.id ? nextFact : item)));
    setEditingFactId(null);
    setDraftText("");

    if (isDemoCase) {
      setPendingFactId(null);
      setSavedFactId(fact.id);
      setStatus(userStatus === "EDITED" ? "Demo edit saved for this view." : null);
      window.setTimeout(() => setSavedFactId((current) => (current === fact.id ? null : current)), 3000);
      trackReviewEvent(userStatus, fact.category);
      return;
    }

    let saved = false;

    try {
      const response = await fetch(`/api/cases/${caseId}/facts/${fact.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayText: cleanDisplayText, userStatus })
      });
      const payload = (await response.json().catch(() => null)) as ApiResponse<UpdateFactResponse> | null;

      if (payload?.ok && payload.data) {
        const updated = payload.data.fact;
        setFacts((current) => current.map((item) => (item.id === fact.id ? updated : item)));
        setSavedFactId(fact.id);
        setStatus(userStatus === "EDITED" ? "Edit saved. This wording will be used in the timeline and brief." : null);
        saved = true;
        window.setTimeout(() => setSavedFactId((current) => (current === fact.id ? null : current)), 3000);
      } else {
        setFacts((current) => current.map((item) => (item.id === fact.id ? fact : item)));
        setStatus(payload?.error?.message ?? "Could not save this review change. Try again.");
      }
    } catch {
      setFacts((current) => current.map((item) => (item.id === fact.id ? fact : item)));
      setStatus("Could not save this review change. Check your connection and try again.");
    } finally {
      setPendingFactId(null);
    }

    if (saved) {
      trackReviewEvent(userStatus, fact.category);
    }
  }

  function startEdit(fact: ExtractedFact) {
    setEditingFactId(fact.id);
    setDraftText(fact.displayText);
    setStatus(null);
    setSavedFactId(null);
  }

  if (isLoading) {
    return <p className="rounded-md border border-clinic-line bg-white p-5 text-clinic-muted">Loading your review list...</p>;
  }

  return (
    <div className="grid gap-5">
      <div className="grid gap-4 rounded-md border border-clinic-line bg-white p-4 shadow-soft sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="max-w-2xl">
            <h2 className="text-2xl font-semibold leading-tight text-clinic-ink">Check what should go in your brief</h2>
            <p className="mt-2 text-base leading-7 text-clinic-muted">Start with the simple list. Open source details only when you want to check where something came from.</p>
          </div>
          <button className="inline-flex min-h-11 items-center gap-2 rounded-md border border-clinic-line bg-white px-4 py-2 font-semibold text-clinic-ink hover:bg-cyan-50" onClick={runExtraction} type="button">
            <RotateCcw aria-hidden className="h-5 w-5" />
            Run extraction
          </button>
        </div>
        <div className="grid gap-2 text-sm sm:grid-cols-3">
          <ReviewStat label="Ready for brief" value={confirmedCount} tone="ready" />
          <ReviewStat label="Still to check" value={Math.max(needsReviewCount, 0)} tone="pending" />
          <ReviewStat label="Hidden from brief" value={rejectedCount} tone="hidden" />
        </div>
        <p className="text-sm leading-6 text-clinic-muted">
          Source: {source === "fireworks" ? "Fireworks extraction" : "deterministic fallback"}
          {isDemoCase ? ". This sample is read-only, so review choices stay local to this page." : "."}
        </p>
      </div>

      {status ? <p className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm font-medium text-clinic-warning">{status}</p> : null}

      <div className="grid gap-3">
        {facts.length === 0 ? <p className="rounded-md border border-dashed border-clinic-line bg-white p-5 text-sm text-clinic-muted">No review items yet. Add a note or document, then run extraction.</p> : null}
        {facts.map((fact) => (
          <article key={fact.id} className="grid gap-4 rounded-md border border-clinic-line bg-white p-4 shadow-soft sm:p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <span className="w-fit rounded-md bg-clinic-surface px-2 py-1 text-xs font-semibold uppercase text-clinic-primary">{fact.category.replace("_", " ")}</span>
                {editingFactId === fact.id ? (
                  <textarea className="mt-3 min-h-24 w-full rounded-md border border-clinic-line p-3 text-base leading-7 text-clinic-ink" onChange={(event) => setDraftText(event.target.value)} value={draftText} />
                ) : (
                  <h3 className="mt-3 text-lg font-semibold leading-7 text-clinic-ink">{fact.displayText}</h3>
                )}
              </div>
              <span className={statusClassName(fact.userStatus)}>{fact.userStatus.replace("_", " ").toLowerCase()}</span>
            </div>

            <div className="flex flex-wrap gap-3">
              {editingFactId === fact.id ? (
                <>
                  <button
                    className="inline-flex min-h-11 items-center gap-2 rounded-md bg-clinic-success px-4 py-2 font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={pendingFactId === fact.id || draftText.trim().length === 0 || draftText.trim() === fact.displayText.trim()}
                    onClick={() => updateFactState(fact, "EDITED", draftText)}
                    type="button"
                  >
                    <Check aria-hidden className="h-5 w-5" />
                    {pendingFactId === fact.id ? "Saving edit..." : "Save edit"}
                  </button>
                  <button
                    className="inline-flex min-h-11 items-center rounded-md border border-clinic-line bg-white px-4 py-2 font-semibold text-clinic-ink hover:bg-cyan-50"
                    disabled={pendingFactId === fact.id}
                    onClick={() => {
                      setEditingFactId(null);
                      setDraftText("");
                    }}
                    type="button"
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <>
                  <button
                    className="inline-flex min-h-11 items-center gap-2 rounded-md bg-clinic-success px-4 py-2 font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={pendingFactId === fact.id || fact.userStatus === "CONFIRMED"}
                    onClick={() => updateFactState(fact, "CONFIRMED")}
                    type="button"
                  >
                    <Check aria-hidden className="h-5 w-5" />
                    {fact.userStatus === "CONFIRMED" ? "Confirmed" : "Confirm"}
                  </button>
                  <button className="inline-flex min-h-11 items-center gap-2 rounded-md border border-clinic-line bg-white px-4 py-2 font-semibold text-clinic-ink hover:bg-cyan-50" onClick={() => startEdit(fact)} type="button">
                    <Pencil aria-hidden className="h-5 w-5" />
                    Edit
                  </button>
                  <button
                    className="inline-flex min-h-11 items-center gap-2 rounded-md border border-rose-200 bg-white px-4 py-2 font-semibold text-rose-700 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={pendingFactId === fact.id || fact.userStatus === "REJECTED"}
                    onClick={() => updateFactState(fact, "REJECTED")}
                    type="button"
                  >
                    <X aria-hidden className="h-5 w-5" />
                    {fact.userStatus === "REJECTED" ? "Rejected" : "Reject"}
                  </button>
                </>
              )}
            </div>
            <details className="group rounded-md bg-clinic-surface px-4 py-3">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold text-clinic-ink">
                <span>Source details</span>
                <ChevronDown aria-hidden className="h-4 w-4 transition group-open:rotate-180" />
              </summary>
              <div className="mt-3 grid gap-2 text-sm leading-6 text-clinic-muted sm:grid-cols-3">
                <p>
                  <span className="font-semibold text-clinic-ink">Confidence:</span> {Math.round(fact.confidence * 100)}%
                </p>
                <p>
                  <span className="font-semibold text-clinic-ink">Source:</span> {fact.sourceDocId ?? "source pending"}
                </p>
                <p>
                  <span className="font-semibold text-clinic-ink">Review:</span> user-controlled
                </p>
              </div>
              {fact.sourceQuote ? <p className="mt-3 rounded-md bg-white p-3 text-sm leading-6 text-clinic-muted">Source snippet: {fact.sourceQuote}</p> : null}
            </details>
            {savedFactId === fact.id ? <p className="text-sm font-semibold text-clinic-success">Saved.</p> : null}
          </article>
        ))}
      </div>

      {questions.length > 0 ? (
        <details className="group rounded-md border border-clinic-line bg-white p-5 shadow-soft">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-clinic-ink">Questions to consider</h2>
              <p className="mt-1 text-sm text-clinic-muted">{questions.length} optional prompt{questions.length === 1 ? "" : "s"} found. Open when you want to prepare more context.</p>
            </div>
            <ChevronDown aria-hidden className="h-5 w-5 text-clinic-muted transition group-open:rotate-180" />
          </summary>
          <div className="mt-4 grid gap-3">
            {questions.map((question) => (
              <article key={question.id} className="rounded-md border border-cyan-100 p-4">
                <div className="flex flex-wrap gap-2">
                  <span className="rounded-md bg-clinic-surface px-2 py-1 text-xs font-semibold uppercase text-clinic-primary">{question.priority}</span>
                  <span className="rounded-md bg-emerald-50 px-2 py-1 text-xs font-semibold uppercase text-emerald-700">{question.answerType.replace("_", " ")}</span>
                </div>
                <h3 className="mt-3 font-semibold text-clinic-ink">{question.question}</h3>
                <p className="mt-1 text-sm leading-6 text-clinic-muted">{question.whyItMattersForAppointment}</p>
              </article>
            ))}
          </div>
        </details>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <Link className="inline-flex min-h-11 items-center rounded-md bg-clinic-primary px-5 py-3 font-semibold text-white hover:bg-clinic-primaryDark" href={`/cases/${caseId}`}>
          View dashboard
        </Link>
        <Link className="inline-flex min-h-11 items-center rounded-md border border-clinic-line bg-white px-5 py-3 font-semibold text-clinic-ink hover:bg-cyan-50" href={`/cases/${caseId}/brief`}>
          Generate brief
        </Link>
        <Link className="inline-flex min-h-11 items-center rounded-md border border-clinic-line bg-white px-5 py-3 font-semibold text-clinic-ink hover:bg-cyan-50" href={`/cases/${caseId}/intake`}>
          Add more sources
        </Link>
      </div>
    </div>
  );
}

function statusClassName(status: ExtractedFact["userStatus"]): string {
  const base = "rounded-md px-3 py-1 text-sm font-semibold";

  if (status === "CONFIRMED") {
    return `${base} bg-emerald-50 text-emerald-700`;
  }

  if (status === "EDITED") {
    return `${base} bg-cyan-50 text-clinic-primary`;
  }

  if (status === "REJECTED") {
    return `${base} bg-rose-50 text-rose-700`;
  }

  return `${base} bg-clinic-surface text-clinic-muted`;
}

function ReviewStat({ label, value, tone }: { label: string; value: number; tone: "ready" | "pending" | "hidden" }) {
  const toneClassName = {
    ready: "border-emerald-100 bg-emerald-50 text-emerald-700",
    pending: "border-cyan-100 bg-clinic-surface text-clinic-primary",
    hidden: "border-rose-100 bg-rose-50 text-rose-700"
  }[tone];

  return (
    <div className={`rounded-md border px-4 py-3 ${toneClassName}`}>
      <p className="text-2xl font-semibold leading-none">{value}</p>
      <p className="mt-1 text-sm font-semibold">{label}</p>
    </div>
  );
}

function trackReviewEvent(userStatus: ExtractedFact["userStatus"], category: ExtractedFact["category"]) {
  if (userStatus === "CONFIRMED") {
    trackEvent(Events.FactConfirmed, { category });
  }

  if (userStatus === "EDITED") {
    trackEvent(Events.FactEdited, { category });
  }
}
