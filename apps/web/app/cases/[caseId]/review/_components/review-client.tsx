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
  const sourceLabel = source === "fireworks" ? "AI organized from reviewed sources" : isDemoCase ? "Built-in sample documents" : "Local fallback from reviewed sources";

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
    return <p className="mx-auto w-full max-w-[44rem] rounded-2xl border border-[#EFE2D2] bg-[#FFFDF8] p-5 font-medium text-[#8A7A6E]">Loading your review list...</p>;
  }

  return (
    <div className="mx-auto grid w-full max-w-[44rem] gap-4">
      <div className="grid gap-4 rounded-[1.4rem] border border-[#EFE2D2] bg-[#FFFDF8] p-4 shadow-[0_14px_38px_rgba(61,47,38,0.10)] sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="max-w-2xl">
            <h2 className="text-2xl font-semibold leading-tight text-[#3D2F26]">What should go in the brief?</h2>
            <p className="mt-2 text-base font-medium leading-7 text-[#8A7A6E]">Tap confirm, edit, or hide. Source details stay tucked away unless you want to check them.</p>
          </div>
          <button className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[#E4D8C8] bg-[#FFFDF8] px-4 py-2 font-extrabold text-[#5C4A3E] hover:bg-[#F2ECE0]" onClick={runExtraction} type="button">
            <RotateCcw aria-hidden className="h-5 w-5" />
            Refresh
          </button>
        </div>
        <div className="grid gap-2 text-sm sm:grid-cols-3">
          <ReviewStat label="Ready for brief" value={confirmedCount} tone="ready" />
          <ReviewStat label="Still to check" value={Math.max(needsReviewCount, 0)} tone="pending" />
          <ReviewStat label="Hidden from brief" value={rejectedCount} tone="hidden" />
        </div>
        <p className="text-sm font-medium leading-6 text-[#8A7A6E]">
          Source: {sourceLabel}
          {isDemoCase ? ". This is synthetic and read-only; choices stay local to this page." : "."}
        </p>
      </div>

      {status ? <p className="rounded-2xl border border-[#E8956D] bg-[#FFF6EF] p-4 text-sm font-semibold text-[#C8553D]">{status}</p> : null}

      <div className="grid gap-3">
        {facts.length === 0 ? <p className="rounded-2xl border border-dashed border-[#E4D8C8] bg-[#FFFDF8] p-5 text-sm font-medium text-[#8A7A6E]">No review items yet. Add a note or document, then run extraction.</p> : null}
        {facts.map((fact) => (
          <article key={fact.id} className="grid gap-4 rounded-[1.25rem] border border-[#EFE2D2] bg-[#FFFDF8] p-4 shadow-[0_10px_28px_rgba(61,47,38,0.08)] sm:p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <span className="w-fit rounded-full bg-[#F6DFD2] px-3 py-1 text-xs font-extrabold uppercase tracking-[0.06em] text-[#C8553D]">{fact.category.replace("_", " ")}</span>
                {editingFactId === fact.id ? (
                  <textarea className="mt-3 min-h-24 w-full rounded-2xl border-2 border-[#EFE2D2] bg-[#FFFDF8] p-3 text-base leading-7 text-[#3D2F26] focus:border-[#C8553D] focus:outline-none" onChange={(event) => setDraftText(event.target.value)} value={draftText} />
                ) : (
                  <h3 className="mt-3 text-xl font-semibold leading-7 text-[#3D2F26]">{fact.displayText}</h3>
                )}
              </div>
              <span className={statusClassName(fact.userStatus)}>{fact.userStatus.replace("_", " ").toLowerCase()}</span>
            </div>

            <div className="flex flex-wrap gap-3">
              {editingFactId === fact.id ? (
                <>
                  <button
                    className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[#9CAD86] px-4 py-2 font-extrabold text-white hover:bg-[#879974] disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={pendingFactId === fact.id || draftText.trim().length === 0 || draftText.trim() === fact.displayText.trim()}
                    onClick={() => updateFactState(fact, "EDITED", draftText)}
                    type="button"
                  >
                    <Check aria-hidden className="h-5 w-5" />
                    {pendingFactId === fact.id ? "Saving edit..." : "Save edit"}
                  </button>
                  <button
                    className="inline-flex min-h-11 items-center rounded-full border border-[#E4D8C8] bg-[#FFFDF8] px-4 py-2 font-extrabold text-[#5C4A3E] hover:bg-[#F2ECE0]"
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
                    className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[#9CAD86] px-4 py-2 font-extrabold text-white hover:bg-[#879974] disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={pendingFactId === fact.id || fact.userStatus === "CONFIRMED"}
                    onClick={() => updateFactState(fact, "CONFIRMED")}
                    type="button"
                  >
                    <Check aria-hidden className="h-5 w-5" />
                    {fact.userStatus === "CONFIRMED" ? "Confirmed" : "Confirm"}
                  </button>
                  <button className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[#E4D8C8] bg-[#FFFDF8] px-4 py-2 font-extrabold text-[#5C4A3E] hover:bg-[#F2ECE0]" onClick={() => startEdit(fact)} type="button">
                    <Pencil aria-hidden className="h-5 w-5" />
                    Edit
                  </button>
                  <button
                    className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[#F0C8BE] bg-[#FFFDF8] px-4 py-2 font-extrabold text-[#B84B36] hover:bg-[#FFF6EF] disabled:cursor-not-allowed disabled:opacity-60"
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
            <details className="group rounded-2xl bg-[#F8F1E7] px-4 py-3">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-extrabold text-[#3D2F26]">
                <span>Source details</span>
                <ChevronDown aria-hidden className="h-4 w-4 text-[#8A7A6E] transition group-open:rotate-180" />
              </summary>
              <div className="mt-3 grid gap-2 text-sm font-medium leading-6 text-[#8A7A6E] sm:grid-cols-3">
                <p>
                  <span className="font-extrabold text-[#3D2F26]">Confidence:</span> {Math.round(fact.confidence * 100)}%
                </p>
                <p>
                  <span className="font-extrabold text-[#3D2F26]">Source:</span> {fact.sourceDocId ?? "source pending"}
                </p>
                <p>
                  <span className="font-extrabold text-[#3D2F26]">Review:</span> user-controlled
                </p>
              </div>
              {fact.sourceQuote ? <p className="mt-3 rounded-2xl bg-[#FFFDF8] p-3 text-sm font-medium leading-6 text-[#8A7A6E]">Source snippet: {fact.sourceQuote}</p> : null}
            </details>
            {savedFactId === fact.id ? <p className="text-sm font-extrabold text-[#758A5F]">Saved.</p> : null}
          </article>
        ))}
      </div>

      {questions.length > 0 ? (
        <details className="group rounded-[1.25rem] border border-[#EFE2D2] bg-[#FFFDF8] p-5 shadow-[0_10px_28px_rgba(61,47,38,0.08)]">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-[#3D2F26]">Questions to consider</h2>
              <p className="mt-1 text-sm font-medium text-[#8A7A6E]">{questions.length} optional prompt{questions.length === 1 ? "" : "s"} found. Open when you want to prepare more context.</p>
            </div>
            <ChevronDown aria-hidden className="h-5 w-5 text-[#8A7A6E] transition group-open:rotate-180" />
          </summary>
          <div className="mt-4 grid gap-3">
            {questions.map((question) => (
              <article key={question.id} className="rounded-2xl border border-[#EFE2D2] p-4">
                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full bg-[#F6DFD2] px-2 py-1 text-xs font-extrabold uppercase text-[#C8553D]">{question.priority}</span>
                  <span className="rounded-full bg-[#EEF3E8] px-2 py-1 text-xs font-extrabold uppercase text-[#758A5F]">{question.answerType.replace("_", " ")}</span>
                </div>
                <h3 className="mt-3 font-semibold text-[#3D2F26]">{question.question}</h3>
                <p className="mt-1 text-sm font-medium leading-6 text-[#8A7A6E]">{question.whyItMattersForAppointment}</p>
              </article>
            ))}
          </div>
        </details>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <Link className="inline-flex min-h-11 items-center rounded-full bg-[#C8553D] px-5 py-3 font-extrabold text-white hover:bg-[#B84B36]" href={`/cases/${caseId}`}>
          Continue
        </Link>
        <Link className="inline-flex min-h-11 items-center rounded-full border border-[#E4D8C8] bg-[#FFFDF8] px-5 py-3 font-extrabold text-[#5C4A3E] hover:bg-[#F2ECE0]" href={`/cases/${caseId}/brief`}>
          Brief
        </Link>
        <Link className="inline-flex min-h-11 items-center rounded-full border border-[#E4D8C8] bg-[#FFFDF8] px-5 py-3 font-extrabold text-[#5C4A3E] hover:bg-[#F2ECE0]" href={`/cases/${caseId}/intake`}>
          Add more
        </Link>
      </div>
    </div>
  );
}

function statusClassName(status: ExtractedFact["userStatus"]): string {
  const base = "rounded-full px-3 py-1 text-sm font-extrabold";

  if (status === "CONFIRMED") {
    return `${base} bg-[#EEF3E8] text-[#758A5F]`;
  }

  if (status === "EDITED") {
    return `${base} bg-[#F6DFD2] text-[#C8553D]`;
  }

  if (status === "REJECTED") {
    return `${base} bg-[#FFF0EA] text-[#B84B36]`;
  }

  return `${base} bg-[#F2ECE0] text-[#8A7A6E]`;
}

function ReviewStat({ label, value, tone }: { label: string; value: number; tone: "ready" | "pending" | "hidden" }) {
  const toneClassName = {
    ready: "border-[#D9E5CF] bg-[#EEF3E8] text-[#758A5F]",
    pending: "border-[#E4D8C8] bg-[#F8F1E7] text-[#8A7A6E]",
    hidden: "border-[#F0C8BE] bg-[#FFF0EA] text-[#B84B36]"
  }[tone];

  return (
    <div className={`rounded-2xl border px-4 py-3 ${toneClassName}`}>
      <p className="text-2xl font-semibold leading-none">{value}</p>
      <p className="mt-1 text-sm font-extrabold">{label}</p>
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
