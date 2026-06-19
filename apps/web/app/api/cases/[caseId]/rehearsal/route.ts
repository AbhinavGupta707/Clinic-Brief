import type { ApiResponse, RehearsalMessageResponse, RehearsalSession } from "@clinicbrief/types";
import { z } from "zod";

import { getClinicRepository } from "../../../../../lib/server/clinic-repository";
import { buildInitialRehearsalMessage, buildRehearsalReply, makeRehearsalMessage } from "../../../../../lib/server/rehearsal-service";

const RehearsalMessageSchema = z.object({
  sessionId: z.string().optional(),
  message: z.string().trim().min(1).max(1200),
  mode: z.enum(["PREOP_NURSE", "CONSULTANT", "GP"])
});

declare global {
  // eslint-disable-next-line no-var
  var clinicBriefEphemeralRehearsals: Map<string, RehearsalSession> | undefined;
}

const ephemeralRehearsals = globalThis.clinicBriefEphemeralRehearsals ?? new Map<string, RehearsalSession>();
globalThis.clinicBriefEphemeralRehearsals = ephemeralRehearsals;

export async function POST(request: Request, { params }: { params: Promise<{ caseId: string }> }): Promise<Response> {
  const { caseId } = await params;
  const json = await request.json().catch(() => null);
  const parsed = RehearsalMessageSchema.safeParse(json);

  if (!parsed.success) {
    return Response.json(
      {
        ok: false,
        error: {
          code: "INVALID_REHEARSAL_MESSAGE",
          message: "Send a short appointment-prep rehearsal message."
        }
      } satisfies ApiResponse<RehearsalMessageResponse>,
      { status: 400 }
    );
  }

  const repository = await getClinicRepository();
  const record = await repository.getCase(caseId);

  if (!record || !record.consentAccepted) {
    return Response.json(
      {
        ok: false,
        error: {
          code: "CASE_NOT_FOUND",
          message: "Create a consented case before starting rehearsal."
        }
      } satisfies ApiResponse<RehearsalMessageResponse>,
      { status: 404 }
    );
  }

  const input = parsed.data;
  const existingSession = input.sessionId ? record.rehearsals.find((session) => session.id === input.sessionId) ?? ephemeralRehearsals.get(input.sessionId) : undefined;
  const session = existingSession ?? (await repository.createRehearsalSession(caseId, { mode: input.mode })) ?? createEphemeralSession(caseId, input.mode);

  if (!existingSession) {
    const assistantMessage = buildInitialRehearsalMessage(record.questions);
    const updatedSession = await appendOrEphemeral(repository, caseId, session, makeRehearsalMessage("assistant", assistantMessage));

    return Response.json({
      ok: true,
      data: {
        sessionId: updatedSession.id,
        session: updatedSession,
        assistantMessage
      }
    } satisfies ApiResponse<RehearsalMessageResponse>);
  }

  const reply = await buildRehearsalReply({ message: input.message, facts: record.facts, questions: record.questions, session });
  const withUser = await appendOrEphemeral(repository, caseId, session, makeRehearsalMessage("user", input.message));
  const withAssistant = await appendOrEphemeral(repository, caseId, withUser, makeRehearsalMessage("assistant", reply.assistantMessage));

  return Response.json({
    ok: true,
    data: {
      sessionId: withAssistant.id,
      session: withAssistant,
      assistantMessage: reply.assistantMessage,
      suggestedFactUpdates: reply.suggestedFactUpdates
    }
  } satisfies ApiResponse<RehearsalMessageResponse>);
}

async function appendOrEphemeral(
  repository: Awaited<ReturnType<typeof getClinicRepository>>,
  caseId: string,
  session: RehearsalSession,
  message: RehearsalSession["messages"][number]
): Promise<RehearsalSession> {
  const updated = await repository.appendRehearsalMessage(caseId, session.id, message);
  const fallback = { ...session, messages: [...session.messages, message] };

  if (!updated) {
    ephemeralRehearsals.set(fallback.id, fallback);
  }

  return updated ?? fallback;
}

function createEphemeralSession(caseId: string, mode: string): RehearsalSession {
  return {
    id: `ephemeral-rehearsal-${caseId}`,
    caseId,
    mode,
    messages: [],
    createdAt: new Date().toISOString()
  };
}
