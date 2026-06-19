import { createSourceSnippet, parseImageBuffer, parsePdfBuffer, parseTextNote } from "@clinicbrief/documents";
import type { AddDocumentResponse, ApiResponse, DocumentType, HealthDocumentMetadata, ListDocumentsResponse } from "@clinicbrief/types";
import { z } from "zod";
import { getClinicRepository, makeSourcePreview } from "../../../../../lib/server/clinic-repository";
import { hashText, savePrivateFile } from "../../../../../lib/server/private-storage";

const JsonDocumentSchema = z.object({
  type: z.enum(["PDF", "IMAGE", "TEXT_NOTE", "VOICE_TRANSCRIPT"]),
  fileName: z.string().trim().max(120).optional(),
  text: z.string().optional(),
  metadata: z.unknown().optional()
});

const MetadataSchema = z
  .object({
    kind: z.enum(["guided_intake", "uploaded_document", "text_note", "voice_transcript", "sample"])
  })
  .passthrough();

export async function GET(_request: Request, { params }: { params: Promise<{ caseId: string }> }): Promise<Response> {
  const { caseId } = await params;
  const repository = await getClinicRepository();
  const record = await repository.getCase(caseId);

  if (!record) {
    return notFound<ListDocumentsResponse>("CASE_NOT_FOUND", "Create a consented case before adding documents.");
  }

  return Response.json({
    ok: true,
    data: {
      documents: record.documents,
      sourcePreviews: record.sourcePreviews
    }
  } satisfies ApiResponse<ListDocumentsResponse>);
}

export async function POST(request: Request, { params }: { params: Promise<{ caseId: string }> }): Promise<Response> {
  const { caseId } = await params;
  const repository = await getClinicRepository();
  const record = await repository.getCase(caseId);

  if (!record || !record.consentAccepted || caseId === "sample-preop") {
    return notFound<AddDocumentResponse>("CASE_NOT_FOUND", "Create a consented case before adding documents.");
  }

  const payload = await readDocumentPayload(request);

  if (!payload.success) {
    return Response.json(
      {
        ok: false,
        error: {
          code: "INVALID_DOCUMENT",
          message: payload.message
        }
      } satisfies ApiResponse<AddDocumentResponse>,
      { status: 400 }
    );
  }

  const parsed = await parseDocumentPayload(payload.data);
  const now = new Date().toISOString();
  let storage: Awaited<ReturnType<typeof savePrivateFile>> | null = null;

  try {
    storage = payload.data.fileBuffer
      ? await savePrivateFile({
          caseId,
          fileName: payload.data.fileName,
          contentType: payload.data.contentType ?? "application/octet-stream",
          bytes: payload.data.fileBuffer
        })
      : null;
  } catch {
    return Response.json(
      {
        ok: false,
        error: {
          code: "STORAGE_UNAVAILABLE",
          message: "Private file storage is not available. Check storage backend configuration before uploading files."
        }
      } satisfies ApiResponse<AddDocumentResponse>,
      { status: 503 }
    );
  }

  const rawText = parsed.text || payload.data.fallbackText || undefined;
  const document = {
    id: crypto.randomUUID(),
    caseId,
    type: payload.data.type,
    fileName: payload.data.fileName,
    fileUrl: storage?.fileUrl,
    rawText,
    sourceHash: storage?.sourceHash ?? (rawText ? hashText(rawText) : undefined),
    metadata: payload.data.metadata,
    createdAt: now
  };
  const sourcePreview = makeSourcePreview({
    document,
    snippet: parsed.fallbackReason ?? createSourceSnippet(document.rawText ?? parsed.text),
    confidence: parsed.confidence,
    parser: parsed.parser,
    needsManualFallback: parsed.needsManualFallback
  });

  await repository.addDocument(caseId, document, sourcePreview);

  return Response.json({
    ok: true,
    data: {
      document,
      sourcePreview
    }
  } satisfies ApiResponse<AddDocumentResponse>);
}

type DocumentPayload =
  | {
      success: true;
      data: {
        type: Exclude<DocumentType, "SAMPLE">;
        fileName: string;
        text?: string;
        fallbackText?: string;
        fileBuffer?: ArrayBuffer;
        contentType?: string;
        metadata?: HealthDocumentMetadata;
      };
    }
  | { success: false; message: string };

async function readDocumentPayload(request: Request): Promise<DocumentPayload> {
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData();
    const file = formData.get("file");
    const text = asString(formData.get("text"));
    const fallbackText = asString(formData.get("fallbackText"));
    const declaredType = asString(formData.get("type"));
    const metadata = parseMetadata(asString(formData.get("metadata")));
    const inferredType = inferDocumentType(file instanceof File ? file : null, declaredType);

    if (!inferredType) {
      return { success: false, message: "Add a text note, PDF, or image file." };
    }

    if (metadata === "invalid") {
      return { success: false, message: "Document metadata was not recognized." };
    }

    return {
      success: true,
      data: {
        type: inferredType,
        fileName: file instanceof File && file.name ? file.name : inferredType === "TEXT_NOTE" ? "manual-note.txt" : "uploaded-document",
        text,
        fallbackText,
        fileBuffer: file instanceof File ? await file.arrayBuffer() : undefined,
        contentType: file instanceof File ? file.type : undefined,
        metadata
      }
    };
  }

  const json = await request.json().catch(() => null);
  const parsed = JsonDocumentSchema.safeParse(json);

  if (!parsed.success) {
    return { success: false, message: "Add a text note, PDF boundary, or image boundary payload." };
  }

  const metadata = parseJsonMetadata(parsed.data.metadata);

  if (metadata === "invalid") {
    return { success: false, message: "Document metadata was not recognized." };
  }

  return {
    success: true,
    data: {
      type: parsed.data.type,
      fileName: parsed.data.fileName || defaultFileName(parsed.data.type),
      text: parsed.data.text,
      metadata
    }
  };
}

async function parseDocumentPayload(payload: Extract<DocumentPayload, { success: true }>["data"]) {
  if (payload.type === "TEXT_NOTE" || payload.type === "VOICE_TRANSCRIPT") {
    return parseTextNote(payload.text ?? payload.fallbackText ?? "");
  }

  if (payload.fallbackText?.trim()) {
    return parseTextNote(payload.fallbackText);
  }

  if (payload.type === "PDF") {
    return parsePdfBuffer(payload.fileBuffer ?? new ArrayBuffer(0));
  }

  return parseImageBuffer(payload.fileBuffer ?? new ArrayBuffer(0));
}

function inferDocumentType(file: File | null, declaredType?: string): Exclude<DocumentType, "SAMPLE"> | null {
  if (declaredType === "PDF" || declaredType === "IMAGE" || declaredType === "TEXT_NOTE" || declaredType === "VOICE_TRANSCRIPT") {
    return declaredType;
  }

  if (!file) {
    return "TEXT_NOTE";
  }

  if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
    return "PDF";
  }

  if (file.type.startsWith("image/")) {
    return "IMAGE";
  }

  return null;
}

function defaultFileName(type: Exclude<DocumentType, "SAMPLE">): string {
  if (type === "PDF") {
    return "uploaded-document.pdf";
  }

  if (type === "IMAGE") {
    return "uploaded-image";
  }

  return "manual-note.txt";
}

function asString(value: FormDataEntryValue | null): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function parseMetadata(value: string | undefined): HealthDocumentMetadata | undefined | "invalid" {
  if (!value?.trim()) {
    return undefined;
  }

  try {
    return parseJsonMetadata(JSON.parse(value)) ?? "invalid";
  } catch {
    return "invalid";
  }
}

function parseJsonMetadata(value: unknown): HealthDocumentMetadata | undefined | "invalid" {
  if (value == null) {
    return undefined;
  }

  const parsed = MetadataSchema.safeParse(value);

  if (!parsed.success) {
    return "invalid";
  }

  const metadata = parsed.data as HealthDocumentMetadata;

  if ("storesAudio" in metadata && metadata.storesAudio !== false) {
    return "invalid";
  }

  if ("userReviewed" in metadata && metadata.userReviewed !== true) {
    return "invalid";
  }

  return metadata;
}

function notFound<T>(code: string, message: string): Response {
  return Response.json(
    {
      ok: false,
      error: { code, message }
    } satisfies ApiResponse<T>,
    { status: 404 }
  );
}
