"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, Mic, Send, ShieldAlert } from "lucide-react";
import { Events, trackEvent } from "@clinicbrief/events";
import type { ApiResponse, BriefType, MissingQuestion, RehearsalMessageResponse, RehearsalSession } from "@clinicbrief/types";

type Message = {
  role: "assistant" | "user";
  body: string;
};

type SpeechRecognitionEventLike = {
  results: {
    [index: number]: {
      [index: number]: {
        transcript: string;
      };
    };
  };
};

type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

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
  const [speechSupported, setSpeechSupported] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [speechStatus, setSpeechStatus] = useState("Typed answers are always available.");
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const firstQuestion = questions[0]?.question ?? "What would you like to make sure you say at the appointment?";
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      body: `Let's practice your opening, then I will ask one appointment-prep question at a time. First: ${firstQuestion}`
    }
  ]);

  const answeredCount = useMemo(() => messages.filter((message) => message.role === "user").length, [messages]);

  useEffect(() => {
    setSpeechSupported(Boolean(window.SpeechRecognition ?? window.webkitSpeechRecognition));
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
      const nextAnsweredCount = mappedMessages.filter((message) => message.role === "user").length;

      setSessionId(payload.data.sessionId);
      setMessages(mappedMessages);
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
      answeredQuestionCount: answeredCount + 1
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

  function startSpeechInput() {
    const Recognition = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!Recognition) {
      setSpeechStatus("Speech input is unavailable in this browser. Type your answer instead.");
      return;
    }

    const recognition = new Recognition();
    recognition.lang = "en-GB";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript;
      if (transcript) {
        setDraft((value) => [value, transcript].filter(Boolean).join(" "));
      }
    };
    recognition.onerror = () => {
      setSpeechStatus("Speech input stopped. Type your answer if the microphone is unavailable.");
      setIsListening(false);
    };
    recognition.onend = () => {
      setSpeechStatus("Speech capture ended. Review the transcript before sending.");
      setIsListening(false);
    };
    recognitionRef.current = recognition;
    setIsListening(true);
    setSpeechStatus("Listening. The transcript will appear in the answer box before it is sent.");
    recognition.start();
  }

  return (
    <section className="grid gap-5 lg:grid-cols-[1fr_20rem]">
      <div className="grid gap-4 rounded-md border border-clinic-line bg-white p-5 shadow-soft">
        <div className="rounded-md border border-cyan-100 bg-clinic-surface p-4 text-sm leading-6 text-clinic-muted">
          <strong className="text-clinic-ink">Practice opener: </strong>
          {story}
        </div>

        <div aria-live="polite" className="grid max-h-[32rem] gap-3 overflow-auto pr-1">
          {messages.map((message, index) => (
            <div
              key={`${message.role}-${index}`}
              className={`rounded-md border p-4 text-sm leading-6 ${
                message.role === "assistant"
                  ? "border-clinic-line bg-clinic-surface text-clinic-muted"
                  : "ml-auto max-w-[88%] border-emerald-200 bg-emerald-50 text-clinic-ink"
              }`}
            >
              <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.08em] text-clinic-primary">
                {message.role === "assistant" ? "ClinicBrief rehearsal" : "Your answer"}
              </span>
              {message.body}
            </div>
          ))}
        </div>

        <div className="grid gap-3 border-t border-clinic-line pt-4">
          <label htmlFor="rehearsal-answer" className="font-semibold text-clinic-ink">
            Your answer
          </label>
          <textarea
            id="rehearsal-answer"
            className="min-h-32 rounded-md border border-clinic-line bg-white p-3 text-sm leading-6 text-clinic-ink shadow-inner focus:border-clinic-primary"
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Type how you would answer at the appointment..."
            value={draft}
          />
          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-clinic-success px-5 py-3 font-semibold text-white transition hover:bg-emerald-700"
              disabled={isSending}
              onClick={handleSubmit}
              type="button"
            >
              <Send size={18} aria-hidden />
              {isSending ? "Sending" : "Send answer"}
            </button>
            <button
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-clinic-line bg-white px-5 py-3 font-semibold text-clinic-ink transition hover:bg-cyan-50 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={!speechSupported || isListening}
              onClick={startSpeechInput}
              type="button"
            >
              <Mic size={18} aria-hidden />
              {isListening ? "Listening" : "Use microphone"}
            </button>
          </div>
          <p className="text-sm leading-6 text-clinic-muted">{speechStatus}</p>
        </div>
      </div>

      <aside className="grid content-start gap-4">
        <section className="rounded-md border border-clinic-line bg-white p-5 shadow-soft">
          <h2 className="flex items-center gap-2 font-semibold text-clinic-ink">
            <CheckCircle2 size={18} aria-hidden />
            Progress
          </h2>
          <p className="mt-2 text-sm leading-6 text-clinic-muted">
            {Math.min(currentQuestionIndex, questions.length)} of {questions.length} appointment-prep questions answered.
          </p>
        </section>
        <section className="rounded-md border border-amber-200 bg-amber-50 p-5">
          <h2 className="flex items-center gap-2 font-semibold text-amber-900">
            <ShieldAlert size={18} aria-hidden />
            Safety boundary
          </h2>
          <p className="mt-2 text-sm leading-6 text-amber-900">
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
  return session.messages
    .filter((message): message is RehearsalSession["messages"][number] & { role: Message["role"] } => message.role === "assistant" || message.role === "user")
    .map((message) => ({
      role: message.role,
      body: message.content
    }));
}
