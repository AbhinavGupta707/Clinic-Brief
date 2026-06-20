import type { CaseMode, CreateCaseInitialSource } from "@clinicbrief/types";

export type AppointmentPrepType = "upcoming" | "chronic" | "symptoms" | "preop" | "medication";

export type GuidedProfile = {
  firstName: string;
  preparingFor: "self" | "someone_else";
  age: string;
  gender: string;
  aboutYou: string;
  simpleLanguage: boolean;
  largerText: boolean;
};

export type ConversationAnswer = {
  question: string;
  answer: string;
};

export const appointmentTypeOptions: Array<{
  id: AppointmentPrepType;
  label: string;
  description: string;
  mode: CaseMode;
}> = [
  {
    id: "upcoming",
    label: "Upcoming appointment",
    description: "A focused brief for a GP, nurse, specialist, or clinic visit.",
    mode: "GENERAL"
  },
  {
    id: "chronic",
    label: "Chronic condition review",
    description: "Longer-running history, changes, function, and questions to discuss.",
    mode: "CHRONIC"
  },
  {
    id: "symptoms",
    label: "New or changing symptoms",
    description: "Organize what changed, when it started, and what to ask.",
    mode: "GENERAL"
  },
  {
    id: "preop",
    label: "Surgery / pre-op",
    description: "Prepare medicines, allergies, previous reactions, and support notes.",
    mode: "PREOP"
  },
  {
    id: "medication",
    label: "Medication review",
    description: "List user-reported medicines, supplements, questions, and notes.",
    mode: "GENERAL"
  }
];

export function mapAppointmentTypeToMode(type: AppointmentPrepType, preparingFor: GuidedProfile["preparingFor"] = "self"): CaseMode {
  if (preparingFor === "someone_else") {
    return "CARER";
  }

  return appointmentTypeOptions.find((option) => option.id === type)?.mode ?? "GENERAL";
}

export function labelForAppointmentType(type: AppointmentPrepType): string {
  return appointmentTypeOptions.find((option) => option.id === type)?.label ?? "Upcoming appointment";
}

export function getInitialGuidedQuestion(type: AppointmentPrepType): string {
  return getGuidedQuestionAt(type, 0);
}

export function getGuidedQuestionAt(type: AppointmentPrepType, index: number): string {
  const questions: Record<AppointmentPrepType, string[]> = {
    upcoming: [
      "What do you most want to make sure the clinician understands at this appointment?",
      "When did this story begin, or what date should the timeline start from?",
      "What has changed since the last appointment or update?",
      "Which documents, notes, or results do you want to bring into the appointment pack?",
      "What question do you most want to remember to ask?"
    ],
    chronic: [
      "What is the main thing you want this chronic review to cover?",
      "What is your usual baseline, in your own words?",
      "What has changed recently compared with that baseline?",
      "How is this affecting daily activities, work, study, sleep, mobility, or caring responsibilities?",
      "What question do you most want to ask at the review?"
    ],
    symptoms: [
      "What changed, and when did you first notice it?",
      "What does a typical day or episode look like in your own words?",
      "What details are easy to forget when you are in the appointment?",
      "What documents, notes, or photos do you want to bring in?",
      "What question do you most want to ask the clinician?"
    ],
    preop: [
      "What operation or pre-op appointment are you preparing for, if you know?",
      "What medicines, supplements, allergies, or previous reactions do you want listed for the team to confirm?",
      "Have you had a previous anaesthetic, operation, or hospital stay you want to mention?",
      "What transport, home support, or practical recovery details do you want to remember?",
      "What question do you most want to ask before the procedure?"
    ],
    medication: [
      "What do you want the clinician to understand about your current medication list?",
      "Are there medicines, supplements, allergies, or reactions you want listed as user-reported notes?",
      "What medication questions do you want to ask the clinician, without asking ClinicBrief for advice?",
      "Which labels, letters, portal notes, or pharmacy records could help make this list accurate?",
      "What detail is easiest to forget during medication appointments?"
    ]
  };

  const list = questions[type] ?? questions.upcoming;
  return list[Math.min(Math.max(index, 0), list.length - 1)] ?? list[0];
}

export function buildGuidedConversationSourceText({
  profile,
  appointmentType,
  answers
}: {
  profile: GuidedProfile;
  appointmentType: AppointmentPrepType;
  answers: ConversationAnswer[];
}): string {
  const lines = [
    "Guided appointment-prep conversation",
    `First name: ${profile.firstName.trim() || "not provided"}`,
    `Preparing for: ${profile.preparingFor === "someone_else" ? "someone else" : "self"}`,
    `Age: ${profile.age.trim() || "not provided"}`,
    `Gender: ${profile.gender.trim() || "not provided"}`,
    `About user: ${profile.aboutYou.trim() || "not provided"}`,
    `Accessibility preference: ${[
      profile.simpleLanguage ? "simple language" : undefined,
      profile.largerText ? "larger text" : undefined
    ]
      .filter(Boolean)
      .join(", ") || "not provided"}`,
    `Appointment type: ${labelForAppointmentType(appointmentType)}`,
    "",
    "Conversation answers:"
  ];

  const answeredLines = answers
    .filter((item) => item.answer.trim())
    .flatMap((item, index) => [`Question ${index + 1}: ${item.question.trim()}`, `Answer ${index + 1}: ${item.answer.trim()}`]);

  return [...lines, ...(answeredLines.length > 0 ? answeredLines : ["No guided conversation answers provided."])].join("\n");
}

export function makeGuidedInitialSource(text: string): CreateCaseInitialSource {
  return {
    text,
    sourceLabel: "Guided appointment-prep conversation",
    captureMethod: "typed",
    userReviewed: true,
    storesAudio: false
  };
}
