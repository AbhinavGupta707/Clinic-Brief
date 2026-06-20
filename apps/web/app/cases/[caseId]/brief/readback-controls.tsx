"use client";

import { Square, Volume2 } from "lucide-react";
import { Events } from "@clinicbrief/events";
import type { BriefType, CaseMode } from "@clinicbrief/types";
import { useBrowserTextToSpeech } from "../../../../lib/client/speech";

export function BriefReadbackControls({ briefType, mode, text }: { briefType: BriefType; mode: CaseMode; text: string }) {
  const { capability, error, isSpeaking, startSpeaking, stopSpeaking } = useBrowserTextToSpeech();

  function handleToggle() {
    if (isSpeaking) {
      stopSpeaking();
      return;
    }

    if (startSpeaking(text)) {
      window.pendo?.track?.(Events.ReadbackStarted, { mode, briefType });
    }
  }

  return (
    <section className="print:hidden rounded-2xl border border-[#EFE2D2] bg-[#F8F1E7] p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-semibold text-[#3D2F26]">Read-back</h2>
          <p className="mt-1 text-sm font-medium leading-6 text-[#8A7A6E]">
            Browser speech only. No audio is uploaded or stored by ClinicBrief.
          </p>
        </div>
        <button
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[#C8553D] px-5 py-3 font-extrabold text-white transition hover:bg-[#B84B36] disabled:cursor-not-allowed disabled:bg-[#D8C9BA]"
          disabled={capability === "unsupported"}
          onClick={handleToggle}
          type="button"
        >
          {isSpeaking ? <Square size={18} aria-hidden /> : <Volume2 size={18} aria-hidden />}
          {isSpeaking ? "Stop" : "Read story"}
        </button>
      </div>
      <p className="mt-3 text-sm font-medium leading-6 text-[#8A7A6E]" role="status">
        {error ?? (capability === "unsupported" ? "Read-back is unavailable in this browser." : isSpeaking ? "Reading the story aloud." : "Ready to read the story aloud.")}
      </p>
    </section>
  );
}
