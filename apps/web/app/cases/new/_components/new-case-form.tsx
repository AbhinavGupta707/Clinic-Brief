"use client";

import { Events, trackEvent } from "@clinicbrief/events";
import type { AddDocumentResponse, ApiResponse, CreateCaseResponse, ExtractCaseResponse } from "@clinicbrief/types";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
  FileText,
  Loader2,
  MessageCircle,
  Mic,
  MicOff,
  ShieldCheck,
  Sparkles,
  Upload
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { FormEvent, ReactNode } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useBrowserSpeechToText } from "../../../../lib/client/speech";
import {
  appointmentTypeOptions,
  buildGuidedConversationSourceText,
  labelForAppointmentType,
  makeGuidedInitialSource,
  mapAppointmentTypeToMode,
  type AppointmentPrepType,
  type ConversationAnswer,
  type GuidedProfile
} from "../guided-flow";

type GuidedQuestionResponse = {
  question: string;
  source: "fireworks" | "fixture";
  safetyRedirect?: string;
  complete?: boolean;
};

const safetyCopy =
  "ClinicBrief organizes information you provide so you can prepare for appointments. It does not diagnose, recommend treatment, or replace medical advice. Review everything before sharing it with a clinician.";

const steps = ["Welcome", "About you", "Appointment type", "Guided conversation", "Optional documents", "Review key points", "Outcome hub"] as const;

const emptyProfile: GuidedProfile = {
  firstName: "",
  preparingFor: "self",
  ageRange: "",
  basicContext: "",
  simpleLanguage: false,
  largerText: false
};

const demoProfile: GuidedProfile = {
  firstName: "Alex",
  preparingFor: "self",
  ageRange: "Adult",
  basicContext: "Synthetic pre-op preparation case for a planned procedure.",
  simpleLanguage: true,
  largerText: false
};

const demoAnswers: ConversationAnswer[] = [
  {
    question: "What operation or pre-op appointment are you preparing for, if you know?",
    answer: "Synthetic answer: planned procedure with a pre-op nurse call."
  },
  {
    question: "What medicines, supplements, allergies, or previous reactions do you want listed for the team to confirm?",
    answer: "Synthetic answer: medication list, allergy note, and previous anaesthetic question are included in the demo documents."
  }
];

export function NewCaseForm({ guidedDemo = false }: { guidedDemo?: boolean }) {
  const router = useRouter();
  const isGuidedDemo = guidedDemo;
  const [stepIndex, setStepIndex] = useState(0);
  const [profile, setProfile] = useState<GuidedProfile>(isGuidedDemo ? demoProfile : emptyProfile);
  const [appointmentType, setAppointmentType] = useState<AppointmentPrepType>(isGuidedDemo ? "preop" : "upcoming");
  const [consent, setConsent] = useState(isGuidedDemo);
  const [question, setQuestion] = useState(isGuidedDemo ? demoAnswers[0]?.question ?? "" : "");
  const [questionSource, setQuestionSource] = useState<GuidedQuestionResponse["source"]>("fixture");
  const [currentAnswer, setCurrentAnswer] = useState("");
  const [answers, setAnswers] = useState<ConversationAnswer[]>(isGuidedDemo ? demoAnswers : []);
  const [conversationComplete, setConversationComplete] = useState(isGuidedDemo);
  const [isQuestionLoading, setIsQuestionLoading] = useState(false);
  const [pastedDocumentText, setPastedDocumentText] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [manualFallbackText, setManualFallbackText] = useState("");
  const [skipDocuments, setSkipDocuments] = useState(isGuidedDemo);
  const [status, setStatus] = useState<string | null>(isGuidedDemo ? "Guided demo uses synthetic prefilled data and does not persist fixture facts." : null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdCaseId, setCreatedCaseId] = useState<string | null>(null);

  const speech = useBrowserSpeechToText({
    onTranscript: useCallback((transcript: string) => {
      setCurrentAnswer((current) => `${current}${current ? " " : ""}${transcript}`.trim());
    }, [])
  });

  const selectedMode = useMemo(() => mapAppointmentTypeToMode(appointmentType, profile.preparingFor), [appointmentType, profile.preparingFor]);
  const hasDocumentInput = pastedDocumentText.trim().length > 0 || Boolean(selectedFile);
  const canMoveNext = isStepReady(stepIndex, {
    consent,
    profile,
    answers,
    conversationComplete,
    hasDocumentInput,
    skipDocuments,
    isGuidedDemo
  });
  const textSizeClass = profile.largerText ? "text-lg" : "text-base";

  useEffect(() => {
    if (!question && stepIndex >= 3 && !isGuidedDemo) {
      void loadNextQuestion("");
    }
  }, [question, stepIndex, isGuidedDemo]);

  function updateProfile(next: Partial<GuidedProfile>) {
    setProfile((current) => ({ ...current, ...next }));
  }

  async function loadNextQuestion(latestAnswer: string, answerHistory = answers) {
    setIsQuestionLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/guided-interviewer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appointmentType,
          firstName: profile.firstName,
          preparingFor: profile.preparingFor,
          simpleLanguage: profile.simpleLanguage,
          previousQuestions: answerHistory.map((answer) => answer.question),
          previousAnswers: answerHistory.map((answer) => answer.answer),
          latestAnswer
        })
      });
      const payload = (await response.json()) as ApiResponse<GuidedQuestionResponse>;

      if (!payload.ok || !payload.data) {
        setError(payload.error?.message ?? "ClinicBrief could not prepare the next question.");
        return;
      }

      setQuestion(payload.data.question);
      setQuestionSource(payload.data.source);
      setConversationComplete(Boolean(payload.data.complete));

      if (payload.data.safetyRedirect) {
        setStatus(payload.data.safetyRedirect);
      } else {
        setStatus(null);
      }
    } catch {
      setError("ClinicBrief could not prepare the next question. You can still type what you want included.");
    } finally {
      setIsQuestionLoading(false);
    }
  }

  async function saveConversationAnswer() {
    const answer = currentAnswer.trim();

    if (!answer) {
      setError("Add an answer or skip the conversation when you are ready.");
      return;
    }

    const savedQuestion = question || "What would you like ClinicBrief to organize for this appointment?";
    const nextAnswers = [...answers, { question: savedQuestion, answer }];
    setAnswers(nextAnswers);
    setCurrentAnswer("");
    setStatus("Answer saved as reviewed conversation text. Audio is not stored.");
    setQuestion("");

    await loadNextQuestion(answer, nextAnswers);
  }

  async function createAndAnalyzeCase(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    setError(null);

    if (isGuidedDemo) {
      router.push("/cases/sample-preop/review?guided=1");
      return;
    }

    if (!consent) {
      setError("Consent is required before ClinicBrief can create or store case information.");
      return;
    }

    if (!profile.firstName.trim()) {
      setError("Add a first name before creating the appointment pack.");
      setStepIndex(1);
      return;
    }

    const conversationSourceText = buildGuidedConversationSourceText({ profile, appointmentType, answers });
    const title = `${profile.firstName.trim()}'s ${labelForAppointmentType(appointmentType).toLowerCase()} brief`;

    setIsSubmitting(true);
    setStatus("Creating your appointment pack...");

    try {
      const caseResponse = await fetchWithTimeout("/api/cases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          mode: selectedMode,
          consent: true,
          initialSource: makeGuidedInitialSource(conversationSourceText)
        })
      });
      const casePayload = (await caseResponse.json()) as ApiResponse<CreateCaseResponse>;

      if (!casePayload.ok || !casePayload.data) {
        setError(casePayload.error?.message ?? "Could not create the case yet.");
        return;
      }

      const caseId = casePayload.data.caseId;
      setCreatedCaseId(caseId);
      trackEvent(Events.ConsentAccepted, { mode: selectedMode });
      trackEvent(Events.CaseCreated, { mode: selectedMode, sourceCount: 1 });

      await saveOptionalDocuments(caseId);

      setStatus("ClinicBrief is organizing your appointment pack for review...");
      trackEvent(Events.ExtractionStarted, { sourceCount: 1 + (hasDocumentInput ? 1 : 0) });
      const extractResponse = await fetchWithTimeout(
        `/api/cases/${caseId}/extract`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ request: "Organize appointment-preparation facts only." })
        },
        30000
      );
      const extractPayload = (await extractResponse.json()) as ApiResponse<ExtractCaseResponse>;

      if (!extractPayload.ok || !extractPayload.data) {
        setError(extractPayload.error?.message ?? "The appointment pack was created, but analysis did not finish.");
        return;
      }

      if (extractPayload.data.safetyRedirect) {
        setError(extractPayload.data.safetyRedirect);
        return;
      }

      trackEvent(Events.ExtractionCompleted, {
        factCount: extractPayload.data.facts.length,
        questionCount: extractPayload.data.questions.length
      });
      setStepIndex(6);
      setStatus("Your key points are ready to review before any brief or export.");
      router.push(`/cases/${caseId}/review?guided=1`);
    } catch (caughtError) {
      setError(caughtError instanceof DOMException && caughtError.name === "AbortError" ? "That took longer than expected. Try again, or use the guided demo." : "Could not finish the guided flow. Try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function saveOptionalDocuments(caseId: string) {
    if (pastedDocumentText.trim()) {
      const response = await fetchWithTimeout(`/api/cases/${caseId}/documents`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "TEXT_NOTE",
          fileName: "guided-optional-pasted-source.txt",
          text: pastedDocumentText,
          metadata: {
            kind: "text_note",
            sourceLabel: "Guided flow: optional pasted source",
            captureMethod: "pasted",
            userReviewed: true
          }
        })
      });
      const payload = (await response.json()) as ApiResponse<AddDocumentResponse>;

      if (payload.ok) {
        trackEvent(Events.TextNoteAdded, { documentCount: 1 });
      }
    }

    if (selectedFile) {
      const formData = new FormData();
      const type = selectedFile.type === "application/pdf" || selectedFile.name.toLowerCase().endsWith(".pdf") ? "PDF" : "IMAGE";
      formData.append("file", selectedFile);
      formData.append("type", type);
      formData.append(
        "metadata",
        JSON.stringify({
          kind: "uploaded_document",
          sourceLabel: "Guided flow: optional uploaded source",
          originalContentType: selectedFile.type,
          needsManualFallback: Boolean(manualFallbackText.trim())
        })
      );

      if (manualFallbackText.trim()) {
        formData.append("fallbackText", manualFallbackText);
      }

      const response = await fetchWithTimeout(`/api/cases/${caseId}/documents`, {
        method: "POST",
        body: formData
      });
      const payload = (await response.json()) as ApiResponse<AddDocumentResponse>;

      if (payload.ok) {
        trackEvent(Events.DocumentUploaded, { documentCount: 1 });
      }
    }
  }

  return (
    <form onSubmit={createAndAnalyzeCase} className={`grid gap-5 ${profile.largerText ? "text-lg" : ""}`}>
      <div className="grid gap-4 rounded-md border border-clinic-line bg-white p-4 shadow-soft sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-clinic-primary">Step {stepIndex + 1} of {steps.length}</p>
            <h2 className="mt-1 text-2xl font-semibold text-clinic-ink">{steps[stepIndex]}</h2>
          </div>
          <span className="rounded-md border border-cyan-100 bg-clinic-surface px-3 py-2 text-sm font-semibold text-clinic-primary">
            {selectedMode.toLowerCase()} mode
          </span>
        </div>
        <ol className="grid gap-2 sm:grid-cols-7">
          {steps.map((step, index) => (
            <li key={step}>
              <button
                className={`min-h-11 w-full rounded-md border px-2 py-2 text-sm font-semibold transition ${
                  index === stepIndex ? "border-clinic-primary bg-clinic-surface text-clinic-primary" : index < stepIndex ? "border-emerald-100 bg-emerald-50 text-emerald-700" : "border-clinic-line bg-white text-clinic-muted"
                }`}
                disabled={index > stepIndex || isSubmitting}
                onClick={() => setStepIndex(index)}
                type="button"
              >
                {step}
              </button>
            </li>
          ))}
        </ol>
      </div>

      {status ? (
        <p className="rounded-md border border-cyan-100 bg-white p-4 text-sm font-medium leading-6 text-clinic-muted" role="status">
          {status}
        </p>
      ) : null}
      {error ? <p className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm font-medium leading-6 text-clinic-warning">{error}</p> : null}

      <section className="grid gap-5 rounded-md border border-clinic-line bg-white p-5 shadow-soft">
        {stepIndex === 0 ? (
          <div className="grid gap-5">
            <div className="grid gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-md bg-clinic-surface text-clinic-primary">
                <ClipboardCheck aria-hidden className="h-6 w-6" />
              </div>
              <h3 className="text-2xl font-semibold text-clinic-ink">Let’s prepare one appointment pack at a time.</h3>
              <p className="max-w-3xl text-base leading-7 text-clinic-muted">
                ClinicBrief will ask a few simple preparation questions, save reviewed answers as source material, optionally add documents, then show key points for you to confirm before any brief or export.
              </p>
            </div>
            <label className="flex gap-3 rounded-md border border-cyan-100 bg-clinic-surface p-4 text-sm leading-6 text-clinic-muted">
              <input checked={consent} className="mt-1 h-5 w-5 accent-clinic-success" disabled={isGuidedDemo} onChange={(event) => setConsent(event.target.checked)} required type="checkbox" />
              <span>I understand this app processes health information I provide. It organizes information for appointment preparation only and does not provide medical advice.</span>
            </label>
            <p className="rounded-md border border-clinic-line p-4 text-sm leading-6 text-clinic-muted">{safetyCopy}</p>
          </div>
        ) : null}

        {stepIndex === 1 ? (
          <div className="grid gap-4">
            <label className="grid gap-2 text-sm font-medium text-clinic-ink">
              First name
              <input className={`min-h-11 rounded-md border border-clinic-line px-3 ${textSizeClass} text-clinic-ink`} onChange={(event) => updateProfile({ firstName: event.target.value })} placeholder="First name" value={profile.firstName} />
            </label>
            <fieldset className="grid gap-3">
              <legend className="text-sm font-semibold text-clinic-ink">Who are you preparing for?</legend>
              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  ["self", "Myself"],
                  ["someone_else", "Someone else"]
                ].map(([value, label]) => (
                  <label key={value} className="flex min-h-11 cursor-pointer items-center gap-3 rounded-md border border-clinic-line p-3 font-semibold text-clinic-ink">
                    <input checked={profile.preparingFor === value} className="h-5 w-5 accent-clinic-success" onChange={() => updateProfile({ preparingFor: value as GuidedProfile["preparingFor"] })} type="radio" />
                    {label}
                  </label>
                ))}
              </div>
            </fieldset>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-2 text-sm font-medium text-clinic-ink">
                Optional age range
                <input className={`min-h-11 rounded-md border border-clinic-line px-3 ${textSizeClass} text-clinic-ink`} onChange={(event) => updateProfile({ ageRange: event.target.value })} placeholder="Adult, older adult, child, teenager..." value={profile.ageRange} />
              </label>
              <label className="grid gap-2 text-sm font-medium text-clinic-ink">
                Optional basic context
                <input className={`min-h-11 rounded-md border border-clinic-line px-3 ${textSizeClass} text-clinic-ink`} onChange={(event) => updateProfile({ basicContext: event.target.value })} placeholder="Anything that helps frame the appointment" value={profile.basicContext} />
              </label>
            </div>
            <fieldset className="grid gap-3">
              <legend className="text-sm font-semibold text-clinic-ink">Accessibility preferences</legend>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="flex min-h-11 items-center gap-3 rounded-md border border-clinic-line p-3 font-semibold text-clinic-ink">
                  <input checked={profile.simpleLanguage} className="h-5 w-5 accent-clinic-success" onChange={(event) => updateProfile({ simpleLanguage: event.target.checked })} type="checkbox" />
                  Simple language
                </label>
                <label className="flex min-h-11 items-center gap-3 rounded-md border border-clinic-line p-3 font-semibold text-clinic-ink">
                  <input checked={profile.largerText} className="h-5 w-5 accent-clinic-success" onChange={(event) => updateProfile({ largerText: event.target.checked })} type="checkbox" />
                  Larger text
                </label>
              </div>
            </fieldset>
          </div>
        ) : null}

        {stepIndex === 2 ? (
          <div className="grid gap-4">
            <p className="text-base leading-7 text-clinic-muted">Choose the closest preparation shape. ClinicBrief maps this to the existing case modes so older APIs and routes keep working.</p>
            <div className="grid gap-3 md:grid-cols-2">
              {appointmentTypeOptions.map((option) => (
                <button
                  className={`grid min-h-32 content-start gap-2 rounded-md border p-4 text-left transition ${
                    appointmentType === option.id ? "border-clinic-primary bg-clinic-surface text-clinic-primary" : "border-clinic-line bg-white text-clinic-ink hover:bg-cyan-50"
                  }`}
                  key={option.id}
                  onClick={() => setAppointmentType(option.id)}
                  type="button"
                >
                  <span className="text-lg font-semibold">{option.label}</span>
                  <span className="text-sm leading-6 text-clinic-muted">{option.description}</span>
                  <span className="mt-auto w-fit rounded-md bg-white px-2 py-1 text-xs font-semibold uppercase text-clinic-primary">{mapAppointmentTypeToMode(option.id, profile.preparingFor)} mode</span>
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {stepIndex === 3 ? (
          <div className="grid gap-5">
            <div className="rounded-md border border-cyan-100 bg-clinic-surface p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="text-lg font-semibold text-clinic-ink">{question || "What would you like ClinicBrief to organize for this appointment?"}</h3>
                <span className="rounded-md bg-white px-2 py-1 text-xs font-semibold uppercase text-clinic-primary">{questionSource === "fireworks" ? "AI question" : "Fallback question"}</span>
              </div>
              {isQuestionLoading ? <p className="mt-2 text-sm text-clinic-muted">Preparing the next safe question...</p> : null}
            </div>
            <div className="flex flex-wrap items-center gap-3 rounded-md border border-clinic-line p-3">
              <button className="inline-flex min-h-11 items-center gap-2 rounded-md bg-clinic-primary px-4 py-2 font-semibold text-white hover:bg-clinic-primaryDark disabled:opacity-60" disabled={speech.capability === "unsupported" || speech.isListening} onClick={speech.startListening} type="button">
                <Mic aria-hidden className="h-5 w-5" />
                Speak answer
              </button>
              <button className="inline-flex min-h-11 items-center gap-2 rounded-md border border-clinic-line bg-white px-4 py-2 font-semibold text-clinic-ink hover:bg-cyan-50 disabled:opacity-60" disabled={!speech.isListening} onClick={speech.stopListening} type="button">
                <MicOff aria-hidden className="h-5 w-5" />
                Stop
              </button>
              <p className="text-sm leading-6 text-clinic-muted">{speech.capability === "unsupported" ? "Speech recognition is not available in this browser. Typed answers still work." : "Browser speech-to-text is optional. Audio is not stored; only reviewed text can be saved."}</p>
            </div>
            {speech.error ? <p className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-clinic-warning">{speech.error}</p> : null}
            <label className="grid gap-2 text-sm font-medium text-clinic-ink">
              Your answer
              <textarea className={`min-h-40 rounded-md border border-clinic-line p-3 ${textSizeClass} leading-7 text-clinic-ink`} onChange={(event) => setCurrentAnswer(event.target.value)} placeholder={profile.simpleLanguage ? "Use your own words. Short answers are fine." : "Type or edit the answer you want saved as reviewed source material."} value={currentAnswer} />
            </label>
            <div className="flex flex-wrap gap-3">
              <button className="inline-flex min-h-11 items-center gap-2 rounded-md bg-clinic-success px-5 py-3 font-semibold text-white hover:bg-emerald-700 disabled:opacity-60" disabled={isQuestionLoading || !currentAnswer.trim()} onClick={saveConversationAnswer} type="button">
                <CheckCircle2 aria-hidden className="h-5 w-5" />
                Save answer
              </button>
              <button className="inline-flex min-h-11 items-center rounded-md border border-clinic-line bg-white px-5 py-3 font-semibold text-clinic-ink hover:bg-cyan-50" onClick={() => setConversationComplete(true)} type="button">
                Finish conversation
              </button>
            </div>
            {answers.length > 0 ? (
              <details className="group rounded-md border border-clinic-line p-4">
                <summary className="cursor-pointer list-none font-semibold text-clinic-ink">{answers.length} saved answer{answers.length === 1 ? "" : "s"}</summary>
                <ol className="mt-3 grid gap-3">
                  {answers.map((answer, index) => (
                    <li className="rounded-md bg-clinic-surface p-3 text-sm leading-6 text-clinic-muted" key={`${answer.question}-${index}`}>
                      <span className="font-semibold text-clinic-ink">{answer.question}</span>
                      <br />
                      {answer.answer}
                    </li>
                  ))}
                </ol>
              </details>
            ) : null}
          </div>
        ) : null}

        {stepIndex === 4 ? (
          <div className="grid gap-5">
            <div className="grid gap-3 rounded-md border border-clinic-line p-4">
              <div className="flex items-start gap-3">
                <FileText aria-hidden className="mt-1 h-5 w-5 text-clinic-primary" />
                <div>
                  <h3 className="font-semibold text-clinic-ink">One optional source area</h3>
                  <p className="mt-1 text-sm leading-6 text-clinic-muted">Paste text, choose a PDF/image, or skip for now. Manual fallback text helps when a PDF or image cannot be read.</p>
                </div>
              </div>
              <textarea className={`min-h-36 rounded-md border border-clinic-line p-3 ${textSizeClass} leading-7 text-clinic-ink`} onChange={(event) => setPastedDocumentText(event.target.value)} placeholder="Paste copied letter text, portal notes, diary entries, or document text here." value={pastedDocumentText} />
              <input accept="application/pdf,image/*" className="min-h-11 rounded-md border border-clinic-line bg-white px-3 py-2 text-sm text-clinic-muted" onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)} type="file" />
              <textarea className="min-h-24 rounded-md border border-clinic-line p-3 text-base leading-7 text-clinic-ink" onChange={(event) => setManualFallbackText(event.target.value)} placeholder="Optional manual fallback if the PDF or image text cannot be extracted." value={manualFallbackText} />
            </div>
            <button className="inline-flex min-h-11 w-fit items-center gap-2 rounded-md border border-clinic-line bg-white px-5 py-3 font-semibold text-clinic-ink hover:bg-cyan-50" onClick={() => setSkipDocuments(true)} type="button">
              <Upload aria-hidden className="h-5 w-5" />
              Skip for now
            </button>
          </div>
        ) : null}

        {stepIndex === 5 ? (
          <div className="grid gap-5">
            <div className="grid gap-3 rounded-md border border-cyan-100 bg-clinic-surface p-4 sm:grid-cols-3">
              <SummaryTile icon={<MessageCircle aria-hidden className="h-5 w-5" />} label="Conversation answers" value={answers.length.toString()} />
              <SummaryTile icon={<ShieldCheck aria-hidden className="h-5 w-5" />} label="Audio stored" value="No" />
              <SummaryTile icon={<FileText aria-hidden className="h-5 w-5" />} label="Optional documents" value={hasDocumentInput ? "Added" : "Skipped"} />
            </div>
            <p className="text-base leading-7 text-clinic-muted">
              ClinicBrief will now organize this into review cards. You will confirm, edit, or hide key points before opening the outcome hub, brief, export, or practice tools.
            </p>
            <button className="inline-flex min-h-11 w-fit items-center gap-2 rounded-md bg-clinic-primary px-5 py-3 font-semibold text-white hover:bg-clinic-primaryDark disabled:opacity-60" disabled={isSubmitting} type="submit">
              {isSubmitting ? <Loader2 aria-hidden className="h-5 w-5 animate-spin" /> : <Sparkles aria-hidden className="h-5 w-5" />}
              {isSubmitting ? "Organizing..." : isGuidedDemo ? "Open demo review" : "Organize key points"}
            </button>
          </div>
        ) : null}

        {stepIndex === 6 ? (
          <div className="grid gap-5">
            <h3 className="text-2xl font-semibold text-clinic-ink">Your outcome hub is next.</h3>
            <p className="max-w-3xl text-base leading-7 text-clinic-muted">
              After review, the hub gives you large simple paths for the appointment brief, timeline, questions to ask, practice, and export. Settings and delete controls stay available but secondary.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link className="inline-flex min-h-11 items-center rounded-md bg-clinic-primary px-5 py-3 font-semibold text-white hover:bg-clinic-primaryDark" href={createdCaseId ? `/cases/${createdCaseId}` : "/cases/sample-preop"}>
                Open outcome hub
              </Link>
              <Link className="inline-flex min-h-11 items-center rounded-md border border-clinic-line bg-white px-5 py-3 font-semibold text-clinic-ink hover:bg-cyan-50" href="/cases/new">
                Start another pack
              </Link>
            </div>
          </div>
        ) : null}
      </section>

      <div className="flex flex-wrap justify-between gap-3">
        <button className="inline-flex min-h-11 items-center gap-2 rounded-md border border-clinic-line bg-white px-4 py-2 font-semibold text-clinic-ink hover:bg-cyan-50 disabled:opacity-50" disabled={stepIndex === 0 || isSubmitting} onClick={() => setStepIndex((index) => Math.max(0, index - 1))} type="button">
          <ArrowLeft aria-hidden className="h-5 w-5" />
          Back
        </button>
        {stepIndex < 5 ? (
          <button className="inline-flex min-h-11 items-center gap-2 rounded-md bg-clinic-success px-5 py-3 font-semibold text-white hover:bg-emerald-700 disabled:opacity-50" disabled={!canMoveNext || isSubmitting} onClick={() => setStepIndex((index) => Math.min(steps.length - 1, index + 1))} type="button">
            Next
            <ArrowRight aria-hidden className="h-5 w-5" />
          </button>
        ) : null}
      </div>
    </form>
  );
}

function SummaryTile({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="grid gap-2 rounded-md border border-clinic-line bg-white p-3">
      <div className="flex items-center gap-2 text-clinic-primary">
        {icon}
        <span className="text-xs font-semibold uppercase">{label}</span>
      </div>
      <p className="text-xl font-semibold text-clinic-ink">{value}</p>
    </div>
  );
}

function isStepReady(
  stepIndex: number,
  state: {
    consent: boolean;
    profile: GuidedProfile;
    answers: ConversationAnswer[];
    conversationComplete: boolean;
    hasDocumentInput: boolean;
    skipDocuments: boolean;
    isGuidedDemo: boolean;
  }
): boolean {
  if (state.isGuidedDemo) {
    return true;
  }

  if (stepIndex === 0) {
    return state.consent;
  }

  if (stepIndex === 1) {
    return state.profile.firstName.trim().length > 0;
  }

  if (stepIndex === 3) {
    return state.answers.length > 0 || state.conversationComplete;
  }

  if (stepIndex === 4) {
    return state.hasDocumentInput || state.skipDocuments;
  }

  return true;
}

async function fetchWithTimeout(input: RequestInfo | URL, init: RequestInit, timeoutMs = 15000): Promise<Response> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    window.clearTimeout(timeout);
  }
}
