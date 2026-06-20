import { getSafetyRedirect, runClinicJson } from "@clinicbrief/ai";
import { z } from "zod";
import type { AppointmentPrepType } from "../../app/cases/new/guided-flow";

export type GuidedInterviewInput = {
  appointmentType: AppointmentPrepType;
  firstName?: string;
  preparingFor?: "self" | "someone_else";
  simpleLanguage?: boolean;
  previousQuestions: string[];
  previousAnswers: string[];
  latestAnswer?: string;
};

export type GuidedInterviewQuestion = {
  question: string;
  source: "fireworks" | "fixture";
  safetyRedirect?: string;
  complete?: boolean;
};

const GuidedQuestionSchema = z
  .object({
    question: z.string().trim().min(1).max(240),
    complete: z.boolean().optional()
  })
  .strict();

const fallbackQuestions: Record<AppointmentPrepType, string[]> = {
  upcoming: [
    "What do you most want to make sure the clinician understands at this appointment?",
    "When did this story begin, or what date should the timeline start from?",
    "What has changed since the last appointment or update?",
    "Which documents, notes, or results do you want to bring into the appointment pack?"
  ],
  chronic: [
    "What is the main thing you want this chronic review to cover?",
    "What is your usual baseline, in your own words?",
    "What has changed recently compared with that baseline?",
    "How is this affecting daily activities, work, study, sleep, mobility, or caring responsibilities?"
  ],
  symptoms: [
    "What changed, and when did you first notice it?",
    "What does a typical day or episode look like in your own words?",
    "What details are easy to forget when you are in the appointment?",
    "What question do you most want to ask the clinician?"
  ],
  preop: [
    "What operation or pre-op appointment are you preparing for, if you know?",
    "What medicines, supplements, allergies, or previous reactions do you want listed for the team to confirm?",
    "Have you had a previous anaesthetic, operation, or hospital stay you want to mention?",
    "What transport, home support, or practical recovery details do you want to remember?"
  ],
  medication: [
    "What do you want the clinician to understand about your current medication list?",
    "Are there medicines, supplements, allergies, or reactions you want listed as user-reported notes?",
    "What medication questions do you want to ask the clinician, without asking ClinicBrief for advice?",
    "Which labels, letters, portal notes, or pharmacy records could help make this list accurate?"
  ]
};

export async function getGuidedInterviewQuestion(input: GuidedInterviewInput): Promise<GuidedInterviewQuestion> {
  const redirect = getSafetyRedirect(input.latestAnswer ?? "");
  const fallback = getFallbackQuestion(input);

  if (redirect) {
    return {
      question: fallback.question,
      source: "fixture",
      safetyRedirect: `${redirect} Let's keep this to appointment preparation.`,
      complete: fallback.complete
    };
  }

  if (!isFireworksConfigured()) {
    return { ...fallback, source: "fixture" };
  }

  try {
    const generated = await runClinicJson({
      task: "guided-interviewer-question",
      system:
        "You help a patient or carer prepare for an appointment. Ask exactly one preparation question. Do not diagnose, recommend treatment, suggest medication changes, decide urgency, or ask for emergency triage. If enough has been collected, set complete=true and ask a final review-oriented question.",
      user: buildPrompt(input, fallback.question),
      schema: GuidedQuestionSchema
    });

    const normalizedQuestion = normalizeOneQuestion(generated.question);

    return {
      question: normalizedQuestion || fallback.question,
      source: "fireworks",
      complete: generated.complete ?? fallback.complete
    };
  } catch {
    return { ...fallback, source: "fixture" };
  }
}

export function getFallbackQuestion(input: GuidedInterviewInput): Omit<GuidedInterviewQuestion, "source" | "safetyRedirect"> {
  const questions = fallbackQuestions[input.appointmentType] ?? fallbackQuestions.upcoming;
  const answeredCount = input.previousAnswers.filter((answer) => answer.trim()).length;
  const question = questions[Math.min(answeredCount, questions.length - 1)];

  return {
    question,
    complete: answeredCount >= questions.length
  };
}

function buildPrompt(input: GuidedInterviewInput, fallbackQuestion: string): string {
  return JSON.stringify({
    task: "Ask one appointment-preparation question only.",
    appointmentType: input.appointmentType,
    preparingFor: input.preparingFor ?? "self",
    firstName: input.firstName?.trim() || undefined,
    simpleLanguage: Boolean(input.simpleLanguage),
    previousQuestions: input.previousQuestions.slice(-6),
    previousAnswerCount: input.previousAnswers.filter((answer) => answer.trim()).length,
    latestAnswerSummary: input.latestAnswer?.trim() ? "A reviewed user answer was provided. Do not repeat it." : "No latest answer.",
    fallbackQuestion,
    safetyRules: [
      "Preparation questions only.",
      "No diagnosis.",
      "No treatment recommendations.",
      "No medication start, stop, dose, or change advice.",
      "No urgency or emergency triage.",
      "Ask exactly one question."
    ]
  });
}

function normalizeOneQuestion(question: string): string {
  const trimmed = question.trim();

  if (!trimmed) {
    return "";
  }

  const firstQuestionMark = trimmed.indexOf("?");

  if (firstQuestionMark >= 0) {
    return trimmed.slice(0, firstQuestionMark + 1);
  }

  return trimmed;
}

function isFireworksConfigured(): boolean {
  return Boolean(process.env.FIREWORKS_API_KEY && process.env.FIREWORKS_MODEL);
}
