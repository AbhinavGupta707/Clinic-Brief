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
      if (payload.data.patternCards.length > 0) {
        window.pendo?.track?.("pattern_cards_generated", {
          patternCardCount: payload.data.patternCards.length,
          caseId
        });
      }
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
    window.pendo?.track?.("pattern_card_reviewed", {
      userStatus,
      safetyLabel: card.safetyLabel
    });
  }

  function startEdit(card: PatternCard) {
    setEditingCardId(card.id);
    setDraftText(card.suggestedBriefText);
  }

  return (
    <section className="rounded-[1.25rem] border border-[#EFE2D2] bg-[#FFFDF8] p-5 shadow-[0_10px_28px_rgba(61,47,38,0.08)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-semibold text-[#3D2F26]">
            <Lightbulb aria-hidden className="h-5 w-5 text-[#C8553D]" />
            Possible patterns to discuss
          </h2>
          <p className="mt-2 text-sm font-medium leading-6 text-[#8A7A6E]">Generated cards are hypotheses for appointment prep only. Confirm, edit, or reject them before they can be reused.</p>
        </div>
        <button className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[#E4D8C8] bg-[#FFFDF8] px-4 py-2 font-extrabold text-[#5C4A3E] hover:bg-[#F2ECE0] disabled:opacity-60" disabled={isGenerating} onClick={generatePatterns} type="button">
          {isGenerating ? <Loader2 aria-hidden className="h-5 w-5 animate-spin" /> : <Lightbulb aria-hidden className="h-5 w-5" />}
          Generate
        </button>
      </div>

      {status ? <p className="mt-4 rounded-2xl border border-[#EFE2D2] bg-[#F8F1E7] p-3 text-sm font-medium text-[#8A7A6E]">{status}</p> : null}

      <div className="mt-4 grid gap-3">
        {cards.length === 0 ? <p className="rounded-2xl border border-dashed border-[#E4D8C8] p-4 text-sm font-medium text-[#8A7A6E]">Review at least one extracted fact, then generate source-backed pattern cards.</p> : null}
        {cards.map((card) => (
          <article key={card.id} className="grid gap-3 rounded-2xl border border-[#EFE2D2] bg-[#FFFDF8] p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="grid gap-2">
                <span className="w-fit rounded-full bg-[#F6DFD2] px-3 py-1 text-xs font-extrabold uppercase text-[#C8553D]">{card.safetyLabel.replaceAll("_", " ")}</span>
                <h3 className="font-semibold text-[#3D2F26]">{card.title}</h3>
                <p className="text-sm font-medium leading-6 text-[#8A7A6E]">{card.summary}</p>
              </div>
              <span className={statusClassName(card.userStatus)}>{card.userStatus.toLowerCase()}</span>
            </div>

            {editingCardId === card.id ? (
              <textarea className="min-h-24 rounded-2xl border border-[#EFE2D2] bg-[#FFFDF8] p-3 text-sm leading-6 text-[#3D2F26]" onChange={(event) => setDraftText(event.target.value)} value={draftText} />
            ) : (
              <p className="rounded-2xl bg-[#F8F1E7] p-3 text-sm font-medium leading-6 text-[#8A7A6E]">{card.suggestedBriefText}</p>
            )}

            <p className="text-xs font-extrabold uppercase text-[#8A7A6E]">Sources: {card.sourceFactIds.length} reviewed facts</p>

            <div className="flex flex-wrap gap-2">
              {editingCardId === card.id ? (
                <button className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[#9CAD86] px-4 py-2 font-extrabold text-white hover:bg-[#879974]" onClick={() => updatePattern(card, "EDITED", draftText)} type="button">
                  <Check aria-hidden className="h-5 w-5" />
                  Save edit
                </button>
              ) : (
                <>
                  <button className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[#9CAD86] px-4 py-2 font-extrabold text-white hover:bg-[#879974] disabled:opacity-60" disabled={card.userStatus === "CONFIRMED"} onClick={() => updatePattern(card, "CONFIRMED")} type="button">
                    <Check aria-hidden className="h-5 w-5" />
                    Confirm
                  </button>
                  <button className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[#E4D8C8] bg-[#FFFDF8] px-4 py-2 font-extrabold text-[#5C4A3E] hover:bg-[#F2ECE0]" onClick={() => startEdit(card)} type="button">
                    <Pencil aria-hidden className="h-5 w-5" />
                    Edit
                  </button>
                  <button className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[#F0C8BE] bg-[#FFFDF8] px-4 py-2 font-extrabold text-[#B84B36] hover:bg-[#FFF6EF] disabled:opacity-60" disabled={card.userStatus === "REJECTED"} onClick={() => updatePattern(card, "REJECTED")} type="button">
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

  return `${base} bg-[#F8F1E7] text-[#8A7A6E]`;
}
