"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, Mic, Send, ShieldAlert } from "lucide-react";
import { Events, trackEvent } from "@clinicbrief/events";
import type { ApiResponse, BriefType, MissingQuestion, RehearsalMessageResponse, RehearsalSession } from "@clinicbrief/types";
import { useBrowserSpeechToText } from "../../../../lib/client/speech";

type Message = {
  role: "assistant" | "user";
  body: string;
  blocked?: boolean;
};

export function RehearsalClient({
  briefType,
  caseId,
  questions,
  story
}: {
  briefType: BriefType;
  caseId: string;
  questions: MissingQuestion[];
  story: string;
}) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [draft, setDraft] = useState("");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const firstQuestion = questions[0]?.question ?? "What would you like to make sure you say at the appointment?";
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      body: `Let's practice your opening, then I will ask one appointment-prep question at a time. First: ${firstQuestion}`
    }
  ]);
  const speech = useBrowserSpeechToText({
    onTranscript: useCallback((transcript: string) => {
      setDraft((value) => [value, transcript].filter(Boolean).join(" ").trim());
    }, [])
  });

  const answeredCount = useMemo(() => countAnsweredQuestions(messages), [messages]);

  useEffect(() => {
    trackEvent(Events.RehearsalStarted, { mode: "PREOP", briefType, questionCount: questions.length });
    void startSession();
  }, [briefType, questions.length]);

  async function startSession() {
    const payload = await sendRehearsalMessage("Start rehearsal", null);

    if (payload?.ok && payload.data) {
      setSessionId(payload.data.sessionId);
      setMessages(mapSessionMessages(payload.data.session));
    }
  }

  async function handleSubmit() {
    const answer = draft.trim();
    if (!answer) {
      return;
    }

    setIsSending(true);
    const payload = await sendRehearsalMessage(answer, sessionId);
    setIsSending(false);

    if (payload?.ok && payload.data) {
      const mappedMessages = mapSessionMessages(payload.data.session);
      const nextMessages = markLatestUserMessageBlocked(mappedMessages, payload.data.blocked === true);
      const nextAnsweredCount = countAnsweredQuestions(nextMessages);

      setSessionId(payload.data.sessionId);
      setMessages(nextMessages);
      setCurrentQuestionIndex(Math.min(nextAnsweredCount, questions.length));
    } else {
      setMessages((items) => [
        ...items,
        { role: "user", body: answer },
        {
          role: "assistant",
          body: `${payload?.error?.message ?? "I could not save that rehearsal answer."} Try again, or continue from the brief.`
        }
      ]);
    }

    setDraft("");
    trackEvent(Events.RehearsalMessageSent, {
      mode: "PREOP",
      briefType,
      questionCount: questions.length,
      answeredQuestionCount: answeredCount + (payload?.data?.blocked ? 0 : 1)
    });
  }

  async function sendRehearsalMessage(message: string, activeSessionId: string | null) {
    const response = await fetch(`/api/cases/${caseId}/rehearsal`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId: activeSessionId ?? undefined,
        message,
        mode: rehearsalModeForBrief(briefType)
      })
    });

    return (await response.json().catch(() => null)) as ApiResponse<RehearsalMessageResponse> | null;
  }

  return (
    <section className="grid gap-5 lg:grid-cols-[1fr_20rem]">
      <div className="grid gap-4 rounded-[1.25rem] border border-[#EFE2D2] bg-[#FFFDF8] p-5 shadow-[0_10px_28px_rgba(61,47,38,0.08)]">
        <div className="rounded-2xl border border-[#EFE2D2] bg-[#F8F1E7] p-4 text-sm font-medium leading-6 text-[#8A7A6E]">
          <strong className="text-[#3D2F26]">Practice opener: </strong>
          {story}
        </div>

        <div aria-live="polite" className="grid max-h-[32rem] gap-3 overflow-auto pr-1">
          {messages.map((message, index) => (
            <div
              key={`${message.role}-${index}`}
              className={`rounded-2xl border p-4 text-sm font-medium leading-6 ${
                message.role === "assistant"
                  ? "border-[#EFE2D2] bg-[#F8F1E7] text-[#8A7A6E]"
                  : "ml-auto max-w-[88%] border-[#D9E5CF] bg-[#EEF3E8] text-[#3D2F26]"
              }`}
            >
              <span className="mb-1 block text-xs font-extrabold uppercase tracking-[0.08em] text-[#C8553D]">
                {message.role === "assistant" ? "ClinicBrief rehearsal" : "Your answer"}
              </span>
              {message.body}
            </div>
          ))}
        </div>

        <div className="grid gap-3 border-t border-[#EFE2D2] pt-4">
          <label htmlFor="rehearsal-answer" className="font-semibold text-[#3D2F26]">
            Your answer
          </label>
          <textarea
            id="rehearsal-answer"
            className="min-h-32 rounded-2xl border-2 border-[#EFE2D2] bg-[#FFFDF8] p-3 text-sm leading-6 text-[#3D2F26] shadow-inner focus:border-[#C8553D] focus:outline-none"
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Type how you would answer at the appointment..."
            value={draft}
          />
          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[#9CAD86] px-5 py-3 font-extrabold text-white transition hover:bg-[#879974]"
              disabled={isSending}
              onClick={handleSubmit}
              type="button"
            >
              <Send size={18} aria-hidden />
              {isSending ? "Sending" : "Send answer"}
            </button>
            <button
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-[#E4D8C8] bg-[#FFFDF8] px-5 py-3 font-extrabold text-[#5C4A3E] transition hover:bg-[#F2ECE0] disabled:cursor-not-allowed disabled:opacity-60"
              disabled={speech.capability === "unsupported" || speech.isListening}
              onClick={speech.startListening}
              type="button"
            >
              <Mic size={18} aria-hidden />
              {speech.isListening ? "Listening" : "Use microphone"}
            </button>
          </div>
          <p className="text-sm font-medium leading-6 text-[#8A7A6E]">
            {speech.error ?? (speech.capability === "unsupported" ? "Speech input is unavailable in this browser. Typed answers always work." : speech.isListening ? "Listening. Review the transcript before sending." : "Typed answers are always available.")}
          </p>
        </div>
      </div>

      <aside className="grid content-start gap-4">
        <section className="rounded-[1.25rem] border border-[#EFE2D2] bg-[#FFFDF8] p-5 shadow-[0_10px_28px_rgba(61,47,38,0.08)]">
          <h2 className="flex items-center gap-2 font-semibold text-[#3D2F26]">
            <CheckCircle2 size={18} aria-hidden />
            Progress
          </h2>
          <p className="mt-2 text-sm font-medium leading-6 text-[#8A7A6E]">
            {Math.min(currentQuestionIndex, questions.length)} of {questions.length} appointment-prep questions answered.
          </p>
        </section>
        <section className="rounded-[1.25rem] border border-[#F0C8BE] bg-[#FFF0EA] p-5">
          <h2 className="flex items-center gap-2 font-semibold text-[#B84B36]">
            <ShieldAlert size={18} aria-hidden />
            Safety boundary
          </h2>
          <p className="mt-2 text-sm font-medium leading-6 text-[#5C4A3E]">
            The rehearsal can help phrase facts and questions. It cannot diagnose, recommend treatment, advise on medication, or decide urgency.
          </p>
        </section>
      </aside>
    </section>
  );
}

function rehearsalModeForBrief(briefType: BriefType): "PREOP_NURSE" | "CONSULTANT" | "GP" {
  if (briefType === "PREOP") {
    return "PREOP_NURSE";
  }

  if (briefType === "CONSULTANT") {
    return "CONSULTANT";
  }

  return "GP";
}

function mapSessionMessages(session: RehearsalSession): Message[] {
  const mappedMessages = session.messages
    .filter((message): message is RehearsalSession["messages"][number] & { role: Message["role"] } => message.role === "assistant" || message.role === "user")
    .map((message) => ({
      role: message.role,
      body: message.content
    }));

  return mappedMessages.map((message, index) =>
    message.role === "user" && isSafetyRedirectMessage(mappedMessages[index + 1]) ? { ...message, blocked: true } : message
  );
}

function markLatestUserMessageBlocked(messages: Message[], blocked: boolean): Message[] {
  if (!blocked) {
    return messages;
  }

  let lastUserIndex = -1;

  for (let index = messages.length - 1; index >= 0; index -= 1) {
    if (messages[index]?.role === "user") {
      lastUserIndex = index;
      break;
    }
  }

  if (lastUserIndex === -1) {
    return messages;
  }

  return messages.map((message, index) => (index === lastUserIndex ? { ...message, blocked: true } : message));
}

function countAnsweredQuestions(messages: Message[]): number {
  return messages.filter((message) => message.role === "user" && !message.blocked).length;
}

function isSafetyRedirectMessage(message: Message | undefined): boolean {
  return message?.role === "assistant" && message.body.includes("I cannot diagnose or recommend treatment");
}
