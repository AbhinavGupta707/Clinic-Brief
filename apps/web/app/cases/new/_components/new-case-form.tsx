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
  getGuidedQuestionAt,
  getInitialGuidedQuestion,
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

type GuidedProfileDraftResponse = {
  profile: Partial<GuidedProfile>;
  confidence: number;
};

const safetyCopy =
  "ClinicBrief organizes information you provide so you can prepare for appointments. It does not diagnose, recommend treatment, or replace medical advice. Review everything before sharing it with a clinician.";

const steps = ["Welcome", "About you", "Appointment type", "Guided conversation", "Optional documents", "Review key points", "Outcome hub"] as const;
const maxGuidedQuestions = 5;

const emptyProfile: GuidedProfile = {
  firstName: "",
  preparingFor: "self",
  age: "",
  gender: "",
  aboutYou: "",
  simpleLanguage: false,
  largerText: false
};

const demoProfile: GuidedProfile = {
  firstName: "Alex",
  preparingFor: "self",
  age: "68",
  gender: "Not specified",
  aboutYou: "Synthetic pre-op preparation case for a planned procedure.",
  simpleLanguage: false,
  largerText: false
};

const demoAnswers: ConversationAnswer[] = [
];

export function NewCaseForm({ guidedDemo = false }: { guidedDemo?: boolean }) {
  const router = useRouter();
  const isGuidedDemo = guidedDemo;
  const [stepIndex, setStepIndex] = useState(0);
  const [profile, setProfile] = useState<GuidedProfile>(isGuidedDemo ? demoProfile : emptyProfile);
  const [appointmentType, setAppointmentType] = useState<AppointmentPrepType>(isGuidedDemo ? "preop" : "upcoming");
  const [consent, setConsent] = useState(isGuidedDemo);
  const [question, setQuestion] = useState(isGuidedDemo ? getInitialGuidedQuestion("preop") : "");
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
  const [profileDraft, setProfileDraft] = useState("");
  const [isProfileParsing, setIsProfileParsing] = useState(false);

  const speech = useBrowserSpeechToText({
    onTranscript: useCallback((transcript: string) => {
      setCurrentAnswer((current) => `${current}${current ? " " : ""}${transcript}`.trim());
    }, [])
  });
  const profileSpeech = useBrowserSpeechToText({
    onTranscript: useCallback((transcript: string) => {
      setProfileDraft((current) => `${current}${current ? " " : ""}${transcript}`.trim());
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
  const currentQuestionNumber = Math.min(answers.length + 1, maxGuidedQuestions);

  useEffect(() => {
    if (!question && stepIndex === 3 && answers.length === 0 && !isQuestionLoading) {
      setQuestion(getInitialGuidedQuestion(appointmentType));
    }
  }, [answers.length, appointmentType, question, stepIndex, isQuestionLoading]);

  useEffect(() => {
    setProfile(isGuidedDemo ? demoProfile : emptyProfile);
    setAppointmentType(isGuidedDemo ? "preop" : "upcoming");
    setConsent(isGuidedDemo);
    setQuestion(isGuidedDemo ? getInitialGuidedQuestion("preop") : "");
    setCurrentAnswer("");
    setAnswers(isGuidedDemo ? demoAnswers : []);
    setConversationComplete(isGuidedDemo);
    setPastedDocumentText("");
    setSelectedFile(null);
    setManualFallbackText("");
    setSkipDocuments(isGuidedDemo);
    setStatus(isGuidedDemo ? "Synthetic demo: this flow is prefilled and opens the built-in sample pre-op review, not your personal data." : null);
    setError(null);
    setCreatedCaseId(null);
    setProfileDraft("");
  }, [isGuidedDemo]);

  function updateProfile(next: Partial<GuidedProfile>) {
    setProfile((current) => ({ ...current, ...next }));
  }

  async function loadNextQuestion(latestAnswer: string, answerHistory = answers) {
    setIsQuestionLoading(true);
    setError(null);

    try {
      const response = await fetchWithTimeout(
        "/api/guided-interviewer",
        {
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
        },
        8000
      );
      const payload = (await response.json()) as ApiResponse<GuidedQuestionResponse>;

      if (!payload.ok || !payload.data) {
        setQuestion(getGuidedQuestionAt(appointmentType, answerHistory.length));
        setStatus("Using a quick safe question so you can keep going.");
        setError(payload.error?.message ?? "ClinicBrief could not tailor the next question.");
        return;
      }

      setQuestion(payload.data.question);
      setConversationComplete(Boolean(payload.data.complete));

      if (payload.data.safetyRedirect) {
        setStatus(payload.data.safetyRedirect);
      } else {
        setStatus(null);
      }
    } catch {
      setQuestion(getGuidedQuestionAt(appointmentType, answerHistory.length));
      setStatus("Using a quick safe question so you can keep going.");
      setError("ClinicBrief could not tailor the next question quickly enough.");
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

    if (nextAnswers.length >= maxGuidedQuestions) {
      setConversationComplete(true);
      setStatus("You have answered the guided questions. Continue to add documents or skip that step.");
      return;
    }

    await loadNextQuestion(answer, nextAnswers);
  }

  async function autofillProfileFromDraft() {
    const transcript = profileDraft.trim();

    if (!transcript) {
      setError("Say or type a short introduction before using autofill.");
      return;
    }

    setIsProfileParsing(true);
    setError(null);
    setStatus("ClinicBrief is filling the basics from your reviewed words...");

    try {
      const response = await fetch("/api/guided-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript })
      });
      const payload = (await response.json()) as ApiResponse<GuidedProfileDraftResponse>;

      if (!payload.ok || !payload.data) {
        updateProfile(parseProfileDraftLocally(transcript));
        setError(null);
        setStatus("Filled the basic fields locally. Please review them before continuing.");
        return;
      }

      updateProfile({
        ...payload.data.profile,
        firstName: payload.data.profile.firstName || profile.firstName,
        age: payload.data.profile.age || profile.age,
        gender: payload.data.profile.gender || profile.gender,
        aboutYou: payload.data.profile.aboutYou || profile.aboutYou
      });
      setStatus(`Autofilled what ClinicBrief could read clearly. Confidence: ${Math.round(payload.data.confidence * 100)}%. Please review before continuing.`);
    } catch {
      const localProfile = parseProfileDraftLocally(transcript);
      updateProfile(localProfile);
      setError(null);
      setStatus("Filled the basic fields locally. Please review them before continuing.");
    } finally {
      setIsProfileParsing(false);
    }
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

    if (!profile.age.trim()) {
      setError("Add an age before creating the appointment pack.");
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
    <form onSubmit={createAndAnalyzeCase} className={`mx-auto grid w-full max-w-[31rem] gap-3 rounded-[1.75rem] bg-[#F8F1E7] p-4 text-[#3D2F26] shadow-[0_24px_70px_rgba(61,47,38,0.16)] sm:p-5 lg:max-w-[44rem] ${profile.largerText ? "text-lg" : ""}`}>
      <div className="grid gap-3">
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm font-extrabold uppercase tracking-[0.08em] text-[#8A7A6E]">Step {stepIndex + 1} of {steps.length}</span>
          <span className="rounded-full bg-[#F6DFD2] px-3 py-1 text-xs font-extrabold uppercase tracking-[0.06em] text-[#C8553D]">{steps[stepIndex]}</span>
        </div>
        <div className="flex gap-2" aria-label="Progress">
          {steps.map((step, index) => (
            <span key={step} className={`h-2 rounded-full transition-all ${index <= stepIndex ? "w-7 bg-[#C8553D]" : "w-2 bg-[#E6D6C6]"}`} />
          ))}
        </div>
      </div>

      {status ? (
        <p className="rounded-2xl border border-[#EFE2D2] bg-[#FFFDF8] p-4 text-sm font-semibold leading-6 text-[#8A7A6E]" role="status">
          {status}
        </p>
      ) : null}
      {error ? <p className="rounded-2xl border border-[#E8956D] bg-[#FFF6EF] p-4 text-sm font-semibold leading-6 text-[#C8553D]">{error}</p> : null}

      <section className="grid gap-4 rounded-[1.4rem] border border-[#EFE2D2] bg-[#FFFDF8] p-4 shadow-[0_8px_24px_rgba(141,122,110,0.12)] sm:p-5 lg:p-4">
        {stepIndex === 0 ? (
          <div className="grid min-h-[30rem] content-center gap-5 lg:min-h-[21rem]">
            <div className="grid gap-4 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F6DFD2] text-[#C8553D]">
                <ClipboardCheck aria-hidden className="h-6 w-6" />
              </div>
              <h3 className="text-4xl font-semibold leading-tight text-[#3D2F26] lg:text-5xl">Tell it once. Bring it clearly.</h3>
              <p className="text-base font-medium leading-7 text-[#8A7A6E]">
                ClinicBrief will ask a few calm questions, organize your notes, and let you review everything before it becomes an appointment pack.
              </p>
            </div>
            <label className="flex gap-3 rounded-2xl bg-[#F2ECE0] p-4 text-sm font-semibold leading-6 text-[#5C4A3E]">
              <input checked={consent} className="mt-1 h-5 w-5 accent-[#C8553D]" disabled={isGuidedDemo} onChange={(event) => setConsent(event.target.checked)} required type="checkbox" />
              <span>I understand this app processes health information I provide. It organizes information for appointment preparation only and does not provide medical advice.</span>
            </label>
            <p className="rounded-2xl border border-[#EFE2D2] p-4 text-sm font-medium leading-6 text-[#8A7A6E]">{safetyCopy}</p>
          </div>
        ) : null}

        {stepIndex === 1 ? (
          <div className="grid gap-4">
            <div className="grid gap-4 rounded-[1.25rem] bg-[#F8F1E7] p-4">
              <div className="grid gap-2">
                <h3 className="text-2xl font-semibold text-[#3D2F26]">A little about you</h3>
                <p className="text-sm font-medium leading-6 text-[#8A7A6E]">
                  Say it in one go, or fill the fields yourself. You can correct anything before continuing.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <button className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[#C8553D] px-4 py-2 font-extrabold text-white shadow-[0_8px_18px_rgba(200,85,61,0.26)] hover:bg-[#B84B36] disabled:opacity-60" disabled={profileSpeech.capability === "unsupported" || profileSpeech.isListening} onClick={profileSpeech.startListening} type="button">
                  <Mic aria-hidden className="h-5 w-5" />
                  Speak
                </button>
                <button className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[#E4D8C8] bg-[#FFFDF8] px-4 py-2 font-extrabold text-[#5C4A3E] hover:bg-[#F2ECE0] disabled:opacity-60" disabled={!profileSpeech.isListening} onClick={profileSpeech.stopListening} type="button">
                  <MicOff aria-hidden className="h-5 w-5" />
                  Stop
                </button>
                <button className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[#9CAD86] px-4 py-2 font-extrabold text-white hover:bg-[#879974] disabled:opacity-60" disabled={isProfileParsing || !profileDraft.trim()} onClick={autofillProfileFromDraft} type="button">
                  {isProfileParsing ? <Loader2 aria-hidden className="h-5 w-5 animate-spin" /> : <Sparkles aria-hidden className="h-5 w-5" />}
                  Fill fields
                </button>
              </div>
              {profileSpeech.error ? <p className="rounded-2xl border border-[#E8956D] bg-[#FFF6EF] p-3 text-sm font-semibold text-[#C8553D]">{profileSpeech.error}</p> : null}
              <label className="grid gap-2 text-sm font-extrabold text-[#3D2F26]">
                Spoken or typed intro
                <textarea className={`min-h-24 rounded-2xl border-2 border-[#EFE2D2] bg-[#FFFDF8] p-3 ${textSizeClass} leading-7 text-[#3D2F26] placeholder:text-[#A89788] focus:border-[#C8553D] focus:outline-none`} onChange={(event) => setProfileDraft(event.target.value)} placeholder="Example: My name is Alex. I am 52, male, and I am preparing for myself." value={profileDraft} />
              </label>
              <p className="text-sm font-medium leading-6 text-[#8A7A6E]">{profileSpeech.capability === "unsupported" ? "Speech recognition is not available in this browser. Typed autofill still works." : "Audio is not stored. Only the reviewed words in this box are sent for autofill."}</p>
            </div>
            <label className="grid gap-2 text-sm font-extrabold text-[#3D2F26]">
              First name
              <input className={`min-h-12 rounded-2xl border-2 border-[#EFE2D2] bg-[#FFFDF8] px-4 ${textSizeClass} text-[#3D2F26] focus:border-[#C8553D] focus:outline-none`} onChange={(event) => updateProfile({ firstName: event.target.value })} placeholder="First name" value={profile.firstName} />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="grid gap-2 text-sm font-extrabold text-[#3D2F26]">
                Age
                <input className={`min-h-12 rounded-2xl border-2 border-[#EFE2D2] bg-[#FFFDF8] px-4 ${textSizeClass} text-[#3D2F26] focus:border-[#C8553D] focus:outline-none`} onChange={(event) => updateProfile({ age: event.target.value })} placeholder="Example: 68" value={profile.age} />
              </label>
              <label className="grid gap-2 text-sm font-extrabold text-[#3D2F26]">
                Gender
                <input className={`min-h-12 rounded-2xl border-2 border-[#EFE2D2] bg-[#FFFDF8] px-4 ${textSizeClass} text-[#3D2F26] focus:border-[#C8553D] focus:outline-none`} onChange={(event) => updateProfile({ gender: event.target.value })} placeholder="Optional" value={profile.gender} />
              </label>
            </div>
            <label className="grid gap-2 text-sm font-extrabold text-[#3D2F26]">
              About you
              <textarea className={`min-h-24 rounded-2xl border-2 border-[#EFE2D2] bg-[#FFFDF8] p-3 ${textSizeClass} leading-7 text-[#3D2F26] focus:border-[#C8553D] focus:outline-none`} onChange={(event) => updateProfile({ aboutYou: event.target.value })} placeholder="Anything useful for the appointment, access needs, or how you prefer information." value={profile.aboutYou} />
            </label>
            <fieldset className="grid gap-3">
              <legend className="text-sm font-extrabold text-[#3D2F26]">Who are you preparing for?</legend>
              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  ["self", "Myself"],
                  ["someone_else", "Someone else"]
                ].map(([value, label]) => (
                  <label key={value} className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-2xl border-2 p-3 font-extrabold ${profile.preparingFor === value ? "border-[#C8553D] bg-[#FBE6DE] text-[#C8553D]" : "border-[#EFE2D2] bg-[#FFFDF8] text-[#5C4A3E]"}`}>
                    <input checked={profile.preparingFor === value} className="h-5 w-5 accent-[#C8553D]" onChange={() => updateProfile({ preparingFor: value as GuidedProfile["preparingFor"] })} type="radio" />
                    {label}
                  </label>
                ))}
              </div>
            </fieldset>
          </div>
        ) : null}

        {stepIndex === 2 ? (
          <div className="grid gap-4">
            <div>
              <h3 className="text-2xl font-semibold text-[#3D2F26]">What are you getting ready for?</h3>
              <p className="mt-2 text-sm font-medium leading-6 text-[#8A7A6E]">Pick the closest option. You can still explain the details in your own words next.</p>
            </div>
            <div className="grid gap-3">
              {appointmentTypeOptions.map((option) => (
                <button
                  className={`grid min-h-24 content-start gap-2 rounded-2xl border-2 p-4 text-left transition ${
                    appointmentType === option.id ? "border-[#C8553D] bg-[#FBE6DE] text-[#C8553D]" : "border-[#EFE2D2] bg-[#FFFDF8] text-[#3D2F26] hover:bg-[#F8F1E7]"
                  }`}
                  key={option.id}
                  onClick={() => setAppointmentType(option.id)}
                  type="button"
                >
                  <span className="text-lg font-extrabold">{option.label}</span>
                  <span className="text-sm font-medium leading-6 text-[#8A7A6E]">{option.description}</span>
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {stepIndex === 3 ? (
          <div className="grid gap-5">
            <div className="grid gap-2 rounded-[1.25rem] bg-[#F8F1E7] p-4">
              <div className="flex items-center justify-between gap-3">
                <span className="w-fit rounded-full bg-[#F6DFD2] px-3 py-1 text-xs font-extrabold uppercase tracking-[0.08em] text-[#C8553D]">Quick question</span>
                <span className="rounded-full bg-[#FFFDF8] px-3 py-1 text-xs font-extrabold text-[#8A7A6E]">Question {currentQuestionNumber} of {maxGuidedQuestions}</span>
              </div>
              <h3 className="text-2xl font-semibold leading-snug text-[#3D2F26]">{isQuestionLoading && answers.length > 0 ? "Preparing your next question..." : question || getInitialGuidedQuestion(appointmentType)}</h3>
              {isQuestionLoading ? <p className="text-sm font-semibold text-[#8A7A6E]">Preparing the next safe question...</p> : null}
            </div>
            <div className="grid gap-3 rounded-2xl border border-[#EFE2D2] bg-[#FFFDF8] p-3">
              <div className="flex flex-wrap items-center gap-3">
                <button className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[#C8553D] px-4 py-2 font-extrabold text-white shadow-[0_8px_18px_rgba(200,85,61,0.26)] hover:bg-[#B84B36] disabled:opacity-60" disabled={speech.capability === "unsupported" || speech.isListening} onClick={speech.startListening} type="button">
                  <Mic aria-hidden className="h-5 w-5" />
                  Speak
                </button>
                <button className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[#E4D8C8] bg-[#FFFDF8] px-4 py-2 font-extrabold text-[#5C4A3E] hover:bg-[#F2ECE0] disabled:opacity-60" disabled={!speech.isListening} onClick={speech.stopListening} type="button">
                  <MicOff aria-hidden className="h-5 w-5" />
                  Stop
                </button>
              </div>
              <p className="text-sm font-medium leading-6 text-[#8A7A6E]">{speech.capability === "unsupported" ? "Speech recognition is not available in this browser. Typed answers still work." : "Audio is not stored. Only reviewed text can be saved."}</p>
            </div>
            {speech.error ? <p className="rounded-2xl border border-[#E8956D] bg-[#FFF6EF] p-3 text-sm font-semibold text-[#C8553D]">{speech.error}</p> : null}
            <label className="grid gap-2 text-sm font-extrabold text-[#3D2F26]">
              Your answer
              <textarea className={`min-h-40 rounded-2xl border-2 border-[#EFE2D2] bg-[#FFFDF8] p-3 ${textSizeClass} leading-7 text-[#3D2F26] placeholder:text-[#A89788] focus:border-[#C8553D] focus:outline-none`} onChange={(event) => setCurrentAnswer(event.target.value)} placeholder={profile.simpleLanguage ? "Use your own words. Short answers are fine." : "Type or edit the answer you want saved."} value={currentAnswer} />
            </label>
            <div className="flex flex-wrap gap-3">
              <button className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[#9CAD86] px-5 py-3 font-extrabold text-white hover:bg-[#879974] disabled:opacity-60" disabled={isQuestionLoading || !currentAnswer.trim()} onClick={saveConversationAnswer} type="button">
                <CheckCircle2 aria-hidden className="h-5 w-5" />
                Save answer
              </button>
              <button className="inline-flex min-h-11 items-center rounded-full border border-[#E4D8C8] bg-[#FFFDF8] px-5 py-3 font-extrabold text-[#5C4A3E] hover:bg-[#F2ECE0]" onClick={() => setConversationComplete(true)} type="button">
                Finish conversation
              </button>
            </div>
            {answers.length > 0 ? (
              <details className="group rounded-2xl border border-[#EFE2D2] bg-[#FFFDF8] p-4">
                <summary className="cursor-pointer list-none font-extrabold text-[#3D2F26]">{answers.length} saved answer{answers.length === 1 ? "" : "s"}</summary>
                <ol className="mt-3 grid gap-3">
                  {answers.map((answer, index) => (
                    <li className="rounded-2xl bg-[#F8F1E7] p-3 text-sm font-medium leading-6 text-[#8A7A6E]" key={`${answer.question}-${index}`}>
                      <span className="font-extrabold text-[#3D2F26]">{answer.question}</span>
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
            <div className="grid gap-4 rounded-[1.25rem] border-2 border-dashed border-[#E4D8C8] bg-[#F8F1E7] p-5">
              <div className="flex items-start gap-3">
                <FileText aria-hidden className="mt-1 h-5 w-5 text-[#C8553D]" />
                <div>
                  <h3 className="text-xl font-semibold text-[#3D2F26]">Add documents if you have them</h3>
                  <p className="mt-1 text-sm font-medium leading-6 text-[#8A7A6E]">Drop in a PDF/image, paste notes, or skip. You can still create a pack from the conversation.</p>
                </div>
              </div>
              <input accept="application/pdf,image/*" className="min-h-12 rounded-2xl border-2 border-[#EFE2D2] bg-[#FFFDF8] px-3 py-2 text-sm font-semibold text-[#5C4A3E]" onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)} type="file" />
              <details className="rounded-2xl bg-[#FFFDF8] p-3">
                <summary className="cursor-pointer list-none font-extrabold text-[#3D2F26]">Paste text instead</summary>
                <textarea className={`mt-3 min-h-32 w-full rounded-2xl border-2 border-[#EFE2D2] p-3 ${textSizeClass} leading-7 text-[#3D2F26] focus:border-[#C8553D] focus:outline-none`} onChange={(event) => setPastedDocumentText(event.target.value)} placeholder="Paste copied letter text, portal notes, diary entries, or document text here." value={pastedDocumentText} />
              </details>
              <details className="rounded-2xl bg-[#FFFDF8] p-3">
                <summary className="cursor-pointer list-none font-extrabold text-[#3D2F26]">Manual fallback for scanned files</summary>
                <textarea className="mt-3 min-h-24 w-full rounded-2xl border-2 border-[#EFE2D2] p-3 text-base leading-7 text-[#3D2F26] focus:border-[#C8553D] focus:outline-none" onChange={(event) => setManualFallbackText(event.target.value)} placeholder="Optional text if the PDF or image cannot be extracted." value={manualFallbackText} />
              </details>
            </div>
            <button className="inline-flex min-h-11 w-fit items-center gap-2 rounded-full border border-[#E4D8C8] bg-[#FFFDF8] px-5 py-3 font-extrabold text-[#5C4A3E] hover:bg-[#F2ECE0]" onClick={() => setSkipDocuments(true)} type="button">
              <Upload aria-hidden className="h-5 w-5" />
              Skip for now
            </button>
          </div>
        ) : null}

        {stepIndex === 5 ? (
          <div className="grid gap-5">
            <div className="grid gap-3 rounded-[1.25rem] bg-[#F8F1E7] p-4">
              <SummaryTile icon={<MessageCircle aria-hidden className="h-5 w-5" />} label="Conversation answers" value={answers.length.toString()} />
              <SummaryTile icon={<ShieldCheck aria-hidden className="h-5 w-5" />} label="Audio stored" value="No" />
              <SummaryTile icon={<FileText aria-hidden className="h-5 w-5" />} label="Optional documents" value={hasDocumentInput ? "Added" : "Skipped"} />
            </div>
            <p className="text-base font-medium leading-7 text-[#8A7A6E]">
              ClinicBrief will now organize this into review cards. You will confirm, edit, or hide key points before opening the outcome hub, brief, export, or practice tools.
            </p>
            <button className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-[#C8553D] px-5 py-3 font-extrabold text-white shadow-[0_10px_22px_rgba(200,85,61,0.32)] hover:bg-[#B84B36] disabled:opacity-60" disabled={isSubmitting} type="submit">
              {isSubmitting ? <Loader2 aria-hidden className="h-5 w-5 animate-spin" /> : <Sparkles aria-hidden className="h-5 w-5" />}
              {isSubmitting ? "Organizing..." : isGuidedDemo ? "Open demo review" : "Organize key points"}
            </button>
          </div>
        ) : null}

        {stepIndex === 6 ? (
          <div className="grid gap-5">
            <h3 className="text-3xl font-semibold text-[#3D2F26]">Your appointment pack is ready.</h3>
            <p className="max-w-3xl text-base font-medium leading-7 text-[#8A7A6E]">
              After review, the hub gives you large simple paths for the appointment brief, timeline, questions to ask, practice, and export. Settings and delete controls stay available but secondary.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link className="inline-flex min-h-12 items-center rounded-full bg-[#C8553D] px-5 py-3 font-extrabold text-white hover:bg-[#B84B36]" href={createdCaseId ? `/cases/${createdCaseId}` : "/cases/sample-preop"}>
                Open outcome hub
              </Link>
              <Link className="inline-flex min-h-12 items-center rounded-full border border-[#E4D8C8] bg-[#FFFDF8] px-5 py-3 font-extrabold text-[#5C4A3E] hover:bg-[#F2ECE0]" href="/cases/new">
                Start another pack
              </Link>
            </div>
          </div>
        ) : null}
      </section>

      <div className="flex flex-wrap justify-between gap-3">
        <button className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[#E4D8C8] bg-[#FFFDF8] px-4 py-2 font-extrabold text-[#5C4A3E] hover:bg-[#F2ECE0] disabled:opacity-50" disabled={stepIndex === 0 || isSubmitting} onClick={() => setStepIndex((index) => Math.max(0, index - 1))} type="button">
          <ArrowLeft aria-hidden className="h-5 w-5" />
          Back
        </button>
        {stepIndex < 5 ? (
          <button className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[#C8553D] px-5 py-3 font-extrabold text-white shadow-[0_10px_22px_rgba(200,85,61,0.32)] hover:bg-[#B84B36] disabled:opacity-50" disabled={!canMoveNext || isSubmitting} onClick={() => setStepIndex((index) => Math.min(steps.length - 1, index + 1))} type="button">
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
    <div className="grid gap-2 rounded-2xl border border-[#EFE2D2] bg-[#FFFDF8] p-3">
      <div className="flex items-center gap-2 text-[#C8553D]">
        {icon}
        <span className="text-xs font-semibold uppercase">{label}</span>
      </div>
      <p className="text-xl font-semibold text-[#3D2F26]">{value}</p>
    </div>
  );
}

function parseProfileDraftLocally(transcript: string): Partial<GuidedProfile> {
  const clean = transcript.trim();
  const firstNameMatch = clean.match(/\b(?:my name is|name is|i am|i'm)\s+([A-Za-z][A-Za-z'-]{1,40})\b/i);
  const ageMatch = clean.match(/\b(?:i am|i'm|age|aged)\s+(\d{1,3})(?:\s*years?\s*old)?\b/i) ?? clean.match(/\b(\d{1,3})\s*years?\s*old\b/i);
  const genderMatch = clean.match(/\b(?:i am a|i'm a|gender is|sex is)\s+(woman|man|female|male|non-binary|nonbinary)\b/i);
  const preparingFor = /\b(my dad|my mum|my mom|my mother|my father|my parent|my child|my partner|someone else|for him|for her|for them)\b/i.test(clean) ? "someone_else" : "self";

  return {
    firstName: firstNameMatch?.[1] ?? "",
    age: ageMatch?.[1] ?? "",
    gender: genderMatch?.[1] ?? "",
    preparingFor,
    aboutYou: clean.slice(0, 180)
  };
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
    return state.profile.firstName.trim().length > 0 && state.profile.age.trim().length > 0;
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
