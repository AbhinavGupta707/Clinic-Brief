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
