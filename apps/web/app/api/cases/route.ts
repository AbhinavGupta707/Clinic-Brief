import { createSourceSnippet, parseTextNote } from "@clinicbrief/documents";
import type { ApiResponse, CreateCaseInitialSource, CreateCaseResponse, HealthDocument, HealthDocumentMetadata } from "@clinicbrief/types";
import { z } from "zod";
import { getClinicRepository, makeSourcePreview } from "../../../lib/server/clinic-repository";
import { hashText } from "../../../lib/server/private-storage";

const CreateCaseSchema = z.object({
  title: z.string().trim().min(2).max(120),
  mode: z.enum(["PREOP", "CHRONIC", "CARER", "GENERAL"]),
  consent: z.literal(true),
  initialSource: z
    .object({
      text: z.string().trim().min(1).max(24000),
      sourceLabel: z.string().trim().min(2).max(80).optional(),
      captureMethod: z.enum(["typed", "pasted", "browser_speech_transcript"]),
      userReviewed: z.literal(true),
      storesAudio: z.literal(false)
    })
    .optional()
});

export async function POST(request: Request): Promise<Response> {
  const json = await request.json().catch(() => null);
  const parsed = CreateCaseSchema.safeParse(json);

  if (!parsed.success) {
    return Response.json(
      {
        ok: false,
        error: {
          code: "CONSENT_REQUIRED",
          message: "Consent and a short case title are required before creating case data."
        }
      } satisfies ApiResponse<CreateCaseResponse>,
      { status: 400 }
    );
  }

  const repository = await getClinicRepository();
  const record = await repository.createCase({ title: parsed.data.title, mode: parsed.data.mode });

  if (parsed.data.initialSource) {
    const source = await makeInitialSourceDocument(record.id, parsed.data.initialSource);
    await repository.addDocument(record.id, source.document, source.sourcePreview);
  }

  return Response.json({
    ok: true,
    data: { caseId: record.id }
  } satisfies ApiResponse<CreateCaseResponse>);
}

async function makeInitialSourceDocument(caseId: string, initialSource: CreateCaseInitialSource) {
  const now = new Date().toISOString();
  const rawText = initialSource.text.trim();
  const sourceLabel = initialSource.sourceLabel?.trim() || "Story dump transcript";
  const isSpeechTranscript = initialSource.captureMethod === "browser_speech_transcript";
  const textCaptureMethod = initialSource.captureMethod === "pasted" ? "pasted" : "typed";
  const metadata: HealthDocumentMetadata = isSpeechTranscript
    ? {
        kind: "voice_transcript",
        sourceLabel,
        userReviewed: true,
        storesAudio: false,
        browserSpeech: {
          capability: "supported",
          transcriptReviewed: true,
          audioStored: false,
          submittedByUser: true
        }
      }
    : {
        kind: "text_note",
        sourceLabel,
        captureMethod: textCaptureMethod,
        userReviewed: true
      };
  const document: HealthDocument = {
    id: crypto.randomUUID(),
    caseId,
    type: isSpeechTranscript ? "VOICE_TRANSCRIPT" : "TEXT_NOTE",
    fileName: isSpeechTranscript ? "story-dump-reviewed-transcript.txt" : "story-dump-text.txt",
    rawText,
    sourceHash: hashText(rawText),
    metadata,
    createdAt: now
  };
  const parsed = await parseTextNote(rawText);
  const sourcePreview = makeSourcePreview({
    document,
    snippet: createSourceSnippet(parsed.text),
    confidence: parsed.confidence,
    parser: parsed.parser,
    needsManualFallback: parsed.needsManualFallback
  });

  return { document, sourcePreview };
}
