import { REHEARSAL_PROMPT, RehearsalAgentOutputSchema, getSafetyRedirect, runClinicJson } from "@clinicbrief/ai";
import type { ExtractedFact, MissingQuestion, RehearsalAgentOutput, RehearsalMessage, RehearsalSession } from "@clinicbrief/types";

export type RehearsalReply = RehearsalAgentOutput;

export function buildInitialRehearsalMessage(questions: MissingQuestion[]): string {
  const firstQuestion = questions[0]?.question ?? "What would you like to make sure you say at the appointment?";
  return `Let's practice one appointment-prep question at a time. First: ${firstQuestion}`;
}

export async function buildRehearsalReply({
  message,
  facts = [],
  questions,
  session
}: {
  message: string;
  facts?: ExtractedFact[];
  questions: MissingQuestion[];
  session: RehearsalSession;
}): Promise<RehearsalReply> {
  const redirect = getSafetyRedirect(message);
  const answeredCount = session.messages.filter((item) => item.role === "user").length;
  const currentQuestion = questions[answeredCount];

  if (redirect) {
    return {
      assistantMessage: `${redirect} Let's stay with appointment preparation. ${currentQuestion?.question ?? questions[0]?.question ?? "What would you like to make sure you say?"}`,
      blocked: true
    };
  }

  try {
    const reply = await runClinicJson({
      task: "rehearsal-reply",
      system: REHEARSAL_PROMPT,
      user: buildRehearsalUserPrompt({ message, facts, questions, session, answeredCount }),
      schema: RehearsalAgentOutputSchema
    });

    return normalizeRehearsalReply(reply, questions);
  } catch {
    return buildDeterministicRehearsalReply({ questions, session });
  }
}

export function buildDeterministicRehearsalReply({
  questions,
  session
}: {
  questions: MissingQuestion[];
  session: RehearsalSession;
}): RehearsalReply {
  const answeredCount = session.messages.filter((item) => item.role === "user").length;
  const currentQuestion = questions[answeredCount];
  const nextQuestion = questions[answeredCount + 1];

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

function buildRehearsalUserPrompt({
  message,
  facts,
  questions,
  session,
  answeredCount
}: {
  message: string;
  facts: ExtractedFact[];
  questions: MissingQuestion[];
  session: RehearsalSession;
  answeredCount: number;
}): string {
  const reviewedFacts = facts.filter((fact) => fact.userStatus === "CONFIRMED" || fact.userStatus === "EDITED");

  return JSON.stringify({
    task: "Reply as an appointment-preparation rehearsal coach. Ask exactly one safe appointment-prep question at a time. Suggested fact updates must be user-review-gated missing_question_answer updates only.",
    mode: session.mode,
    currentUserMessage: message,
    currentMissingQuestion: questions[answeredCount] ?? null,
    nextMissingQuestion: questions[answeredCount + 1] ?? null,
    reviewedFacts: reviewedFacts.map((fact) => ({
      id: fact.id,
      category: fact.category,
      displayText: fact.displayText,
      value: fact.value,
      sourceDocId: fact.sourceDocId
    })),
    missingQuestions: questions.map((question) => ({
      id: question.id,
      priority: question.priority,
      question: question.question,
      whyItMattersForAppointment: question.whyItMattersForAppointment,
      answerType: question.answerType
    })),
    conversation: session.messages.map((item) => ({
      role: item.role,
      content: item.content
    }))
  });
}

function normalizeRehearsalReply(reply: RehearsalReply, questions: MissingQuestion[]): RehearsalReply {
  const allowedQuestionIds = new Set(questions.map((question) => question.id));

  if (!reply.blocked && questionMarkCount(reply.assistantMessage) > 1) {
    throw new Error("Rehearsal reply asked more than one question.");
  }

  const suggestedFactUpdates = reply.blocked
    ? undefined
    : reply.suggestedFactUpdates?.filter((update) => allowedQuestionIds.has(update.questionId) && update.requiresUserReview === true);

  return {
    assistantMessage: reply.assistantMessage,
    blocked: reply.blocked,
    suggestedFactUpdates: suggestedFactUpdates && suggestedFactUpdates.length > 0 ? suggestedFactUpdates : undefined
  };
}

function questionMarkCount(value: string): number {
  return value.split("?").length - 1;
}

export function makeRehearsalMessage(role: RehearsalMessage["role"], content: string): RehearsalMessage {
  return {
    id: crypto.randomUUID(),
    role,
    content,
    createdAt: new Date().toISOString()
  };
}
