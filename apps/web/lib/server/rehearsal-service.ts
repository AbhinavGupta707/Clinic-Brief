import { getSafetyRedirect } from "@clinicbrief/ai";
import type { MissingQuestion, RehearsalAgentOutput, RehearsalMessage, RehearsalSession } from "@clinicbrief/types";

export type RehearsalReply = RehearsalAgentOutput;

export function buildInitialRehearsalMessage(questions: MissingQuestion[]): string {
  const firstQuestion = questions[0]?.question ?? "What would you like to make sure you say at the appointment?";
  return `Let's practice one appointment-prep question at a time. First: ${firstQuestion}`;
}

export function buildRehearsalReply({
  message,
  questions,
  session
}: {
  message: string;
  questions: MissingQuestion[];
  session: RehearsalSession;
}): RehearsalReply {
  const redirect = getSafetyRedirect(message);
  const answeredCount = session.messages.filter((item) => item.role === "user").length;
  const currentQuestion = questions[answeredCount];
  const nextQuestion = questions[answeredCount + 1];

  if (redirect) {
    return {
      assistantMessage: `${redirect} Let's stay with appointment preparation. ${currentQuestion?.question ?? questions[0]?.question ?? "What would you like to make sure you say?"}`,
      blocked: true
    };
  }

  return {
    assistantMessage: nextQuestion
      ? `Thank you. Next question: ${nextQuestion.question}`
      : "Thank you. That gives you a consistent practice run. Review the brief before sharing it with a clinician.",
    blocked: false,
    suggestedFactUpdates: currentQuestion
      ? [
          {
            type: "missing_question_answer",
            questionId: currentQuestion.id,
            requiresUserReview: true,
            proposedDisplayText: `Rehearsal answer captured for: ${currentQuestion.question}`
          }
        ]
      : undefined
  };
}

export function makeRehearsalMessage(role: RehearsalMessage["role"], content: string): RehearsalMessage {
  return {
    id: crypto.randomUUID(),
    role,
    content,
    createdAt: new Date().toISOString()
  };
}
