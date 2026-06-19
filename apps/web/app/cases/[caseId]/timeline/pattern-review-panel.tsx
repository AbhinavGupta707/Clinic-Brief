"use client";

import type { ApiResponse, GeneratePatternCardsResponse, PatternCard, UpdatePatternCardResponse } from "@clinicbrief/types";
import { Check, Lightbulb, Loader2, Pencil, X } from "lucide-react";
import { useState } from "react";

export function PatternReviewPanel({ caseId, initialPatternCards }: { caseId: string; initialPatternCards: PatternCard[] }) {
  const [cards, setCards] = useState(initialPatternCards);
  const [status, setStatus] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const [draftText, setDraftText] = useState("");

  async function generatePatterns() {
    setIsGenerating(true);
    setStatus(null);

    try {
      const response = await fetch(`/api/cases/${caseId}/patterns`, { method: "POST" });
      const payload = (await response.json()) as ApiResponse<GeneratePatternCardsResponse>;

      if (!payload.ok || !payload.data) {
        setStatus(payload.error?.message ?? "Could not generate pattern cards.");
        return;
      }

      setCards(payload.data.patternCards);
      setStatus(payload.data.patternCards.length > 0 ? "Pattern cards are ready for review." : "No reviewed source-backed patterns are available yet.");
    } finally {
      setIsGenerating(false);
    }
  }

  async function updatePattern(card: PatternCard, userStatus: PatternCard["userStatus"], suggestedBriefText = card.suggestedBriefText) {
    const nextCard: PatternCard = {
      ...card,
      suggestedBriefText,
      userStatus,
      reviewerEditedText: userStatus === "EDITED" ? suggestedBriefText : card.reviewerEditedText
    };

    setCards((current) => current.map((item) => (item.id === card.id ? nextCard : item)));
    setEditingCardId(null);
    setDraftText("");

    const response = await fetch(`/api/cases/${caseId}/patterns/${card.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ suggestedBriefText, userStatus })
    });
    const payload = (await response.json().catch(() => null)) as ApiResponse<UpdatePatternCardResponse> | null;

    if (!payload?.ok || !payload.data) {
      setStatus(payload?.error?.message ?? "Could not update this pattern card.");
      setCards((current) => current.map((item) => (item.id === card.id ? card : item)));
      return;
    }

    const updatedCard = payload.data.patternCard;
    setCards((current) => current.map((item) => (item.id === card.id ? updatedCard : item)));
    setStatus("Pattern card review saved.");
  }

  function startEdit(card: PatternCard) {
    setEditingCardId(card.id);
    setDraftText(card.suggestedBriefText);
  }

  return (
    <section className="rounded-md border border-clinic-line bg-white p-5 shadow-soft">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-semibold text-clinic-ink">
            <Lightbulb aria-hidden className="h-5 w-5 text-clinic-primary" />
            Possible patterns to discuss
          </h2>
          <p className="mt-2 text-sm leading-6 text-clinic-muted">Generated cards are hypotheses for appointment prep only. Confirm, edit, or reject them before they can be reused.</p>
        </div>
        <button className="inline-flex min-h-11 items-center gap-2 rounded-md border border-clinic-line bg-white px-4 py-2 font-semibold text-clinic-ink hover:bg-cyan-50 disabled:opacity-60" disabled={isGenerating} onClick={generatePatterns} type="button">
          {isGenerating ? <Loader2 aria-hidden className="h-5 w-5 animate-spin" /> : <Lightbulb aria-hidden className="h-5 w-5" />}
          Generate
        </button>
      </div>

      {status ? <p className="mt-4 rounded-md border border-cyan-100 bg-clinic-surface p-3 text-sm font-medium text-clinic-muted">{status}</p> : null}

      <div className="mt-4 grid gap-3">
        {cards.length === 0 ? <p className="rounded-md border border-dashed border-clinic-line p-4 text-sm text-clinic-muted">Review at least one extracted fact, then generate source-backed pattern cards.</p> : null}
        {cards.map((card) => (
          <article key={card.id} className="grid gap-3 rounded-md border border-cyan-100 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="grid gap-2">
                <span className="w-fit rounded-md bg-clinic-surface px-2 py-1 text-xs font-semibold uppercase text-clinic-primary">{card.safetyLabel.replaceAll("_", " ")}</span>
                <h3 className="font-semibold text-clinic-ink">{card.title}</h3>
                <p className="text-sm leading-6 text-clinic-muted">{card.summary}</p>
              </div>
              <span className={statusClassName(card.userStatus)}>{card.userStatus.toLowerCase()}</span>
            </div>

            {editingCardId === card.id ? (
              <textarea className="min-h-24 rounded-md border border-clinic-line p-3 text-sm leading-6 text-clinic-ink" onChange={(event) => setDraftText(event.target.value)} value={draftText} />
            ) : (
              <p className="rounded-md bg-clinic-surface p-3 text-sm leading-6 text-clinic-muted">{card.suggestedBriefText}</p>
            )}

            <p className="text-xs font-semibold uppercase text-clinic-muted">Sources: {card.sourceFactIds.length} reviewed facts</p>

            <div className="flex flex-wrap gap-2">
              {editingCardId === card.id ? (
                <button className="inline-flex min-h-11 items-center gap-2 rounded-md bg-clinic-success px-4 py-2 font-semibold text-white hover:bg-emerald-700" onClick={() => updatePattern(card, "EDITED", draftText)} type="button">
                  <Check aria-hidden className="h-5 w-5" />
                  Save edit
                </button>
              ) : (
                <>
                  <button className="inline-flex min-h-11 items-center gap-2 rounded-md bg-clinic-success px-4 py-2 font-semibold text-white hover:bg-emerald-700 disabled:opacity-60" disabled={card.userStatus === "CONFIRMED"} onClick={() => updatePattern(card, "CONFIRMED")} type="button">
                    <Check aria-hidden className="h-5 w-5" />
                    Confirm
                  </button>
                  <button className="inline-flex min-h-11 items-center gap-2 rounded-md border border-clinic-line bg-white px-4 py-2 font-semibold text-clinic-ink hover:bg-cyan-50" onClick={() => startEdit(card)} type="button">
                    <Pencil aria-hidden className="h-5 w-5" />
                    Edit
                  </button>
                  <button className="inline-flex min-h-11 items-center gap-2 rounded-md border border-rose-200 bg-white px-4 py-2 font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-60" disabled={card.userStatus === "REJECTED"} onClick={() => updatePattern(card, "REJECTED")} type="button">
                    <X aria-hidden className="h-5 w-5" />
                    Reject
                  </button>
                </>
              )}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function statusClassName(status: PatternCard["userStatus"]): string {
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
