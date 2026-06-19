"use client";

import { Events, trackEvent } from "@clinicbrief/events";
import type { ApiResponse, ExtractCaseResponse, ExtractedFact, MissingQuestion, UpdateFactResponse } from "@clinicbrief/types";
import { Check, Pencil, RotateCcw, X } from "lucide-react";
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

  useEffect(() => {
    void loadExtraction();
  }, []);

  async function loadExtraction() {
    setIsLoading(true);
    const response = await fetch(`/api/cases/${caseId}/extract`);
    const payload = (await response.json()) as ApiResponse<ExtractCaseResponse>;
    setIsLoading(false);

    if (!payload.ok || !payload.data) {
      setStatus(payload.error?.message ?? "Run extraction from intake first.");
      return;
    }

    setFacts(payload.data.facts);
    setQuestions(payload.data.questions);
    setSource(payload.data.source);
  }

  async function runExtraction() {
    setStatus(null);
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
    const nextFact: ExtractedFact = {
      ...fact,
      displayText,
      userStatus
    };

    setPendingFactId(fact.id);
    setFacts((current) => current.map((item) => (item.id === fact.id ? nextFact : item)));
    setEditingFactId(null);
    setDraftText("");

    try {
      const response = await fetch(`/api/cases/${caseId}/facts/${fact.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayText, userStatus })
      });
      const payload = (await response.json().catch(() => null)) as ApiResponse<UpdateFactResponse> | null;

      if (payload?.ok && payload.data) {
        const updated = payload.data.fact;
        setFacts((current) => current.map((item) => (item.id === fact.id ? updated : item)));
      }
    } finally {
      setPendingFactId(null);
    }

    if (userStatus === "CONFIRMED") {
      trackEvent(Events.FactConfirmed, { category: fact.category });
    }

    if (userStatus === "EDITED") {
      trackEvent(Events.FactEdited, { category: fact.category });
    }
  }

  function startEdit(fact: ExtractedFact) {
    setEditingFactId(fact.id);
    setDraftText(fact.displayText);
  }

  if (isLoading) {
    return <p className="rounded-md border border-clinic-line bg-white p-5 text-clinic-muted">Loading extracted facts...</p>;
  }

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-clinic-line bg-white p-4">
        <div>
          <h2 className="text-lg font-semibold text-clinic-ink">Fact review workspace</h2>
          <p className="mt-1 text-sm text-clinic-muted">Source: {source === "fireworks" ? "Fireworks extraction" : "deterministic fixture fallback"}. Confirm, edit, or reject before using these facts in a brief.</p>
        </div>
        <button className="inline-flex min-h-11 items-center gap-2 rounded-md border border-clinic-line bg-white px-4 py-2 font-semibold text-clinic-ink hover:bg-cyan-50" onClick={runExtraction} type="button">
          <RotateCcw aria-hidden className="h-5 w-5" />
          Run extraction
        </button>
      </div>

      {status ? <p className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm font-medium text-clinic-warning">{status}</p> : null}

      <div className="grid gap-3">
        {facts.length === 0 ? <p className="rounded-md border border-dashed border-clinic-line bg-white p-5 text-sm text-clinic-muted">No facts yet. Run extraction after adding notes in intake.</p> : null}
        {facts.map((fact) => (
          <article key={fact.id} className="grid gap-4 rounded-md border border-clinic-line bg-white p-5 shadow-soft">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="grid gap-2">
                <span className="w-fit rounded-md bg-clinic-surface px-2 py-1 text-xs font-semibold uppercase text-clinic-primary">{fact.category.replace("_", " ")}</span>
                {editingFactId === fact.id ? (
                  <textarea className="min-h-24 rounded-md border border-clinic-line p-3 text-base leading-7 text-clinic-ink" onChange={(event) => setDraftText(event.target.value)} value={draftText} />
                ) : (
                  <h3 className="text-lg font-semibold text-clinic-ink">{fact.displayText}</h3>
                )}
              </div>
              <span className={statusClassName(fact.userStatus)}>{fact.userStatus.replace("_", " ").toLowerCase()}</span>
            </div>
            <div className="grid gap-2 text-sm leading-6 text-clinic-muted sm:grid-cols-3">
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
            {fact.sourceQuote ? <p className="rounded-md bg-clinic-surface p-3 text-sm leading-6 text-clinic-muted">Source snippet: {fact.sourceQuote}</p> : null}
            <div className="flex flex-wrap gap-3">
              {editingFactId === fact.id ? (
                <button className="inline-flex min-h-11 items-center gap-2 rounded-md bg-clinic-success px-4 py-2 font-semibold text-white hover:bg-emerald-700" onClick={() => updateFactState(fact, "EDITED", draftText)} type="button">
                  <Check aria-hidden className="h-5 w-5" />
                  Save edit
                </button>
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
          </article>
        ))}
      </div>

      <section className="grid gap-3 rounded-md border border-clinic-line bg-white p-5">
        <h2 className="text-lg font-semibold text-clinic-ink">Missing-context questions</h2>
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
      </section>

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
