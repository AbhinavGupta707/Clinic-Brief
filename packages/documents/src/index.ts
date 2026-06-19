import { Buffer } from "node:buffer";

export type ParsedDocument = {
  text: string;
  needsManualFallback: boolean;
  parser: "pdf" | "image" | "text";
  confidence: number;
  fallbackReason?: string;
};

export async function parseTextNote(text: string): Promise<ParsedDocument> {
  const normalized = text.trim();

  return {
    text: normalized,
    needsManualFallback: normalized.length === 0,
    parser: "text",
    confidence: normalized.length > 0 ? 0.98 : 0,
    fallbackReason: normalized.length === 0 ? "Paste or type a note to continue." : undefined
  };
}

export async function parsePdfBuffer(buffer: ArrayBuffer): Promise<ParsedDocument> {
  if (buffer.byteLength === 0) {
    return pdfFallback("The PDF was empty. Paste the important text manually so the appointment brief can still be prepared.");
  }

  try {
    const pdfParse = await loadPdfParse();
    const result = await pdfParse(Buffer.from(buffer));
    const normalized = normalizeText(result.text ?? "");

    if (normalized.length < 40) {
      return pdfFallback("The PDF did not expose enough selectable text. It may be scanned; paste the important text manually to continue.");
    }

    return {
      text: normalized,
      needsManualFallback: false,
      parser: "pdf",
      confidence: Math.min(0.94, Math.max(0.7, normalized.length / 4000))
    };
  } catch {
    return pdfFallback("PDF text extraction failed. Paste the important text manually so the appointment brief can still be prepared.");
  }
}

export async function parseImageBuffer(_buffer: ArrayBuffer): Promise<ParsedDocument> {
  return {
    text: "",
    needsManualFallback: true,
    parser: "image",
    confidence: 0,
    fallbackReason: "Image OCR is not connected yet. Type or paste the visible note text manually to continue."
  };
}

export function createSourceSnippet(text: string, maxLength = 180): string {
  const normalized = normalizeText(text);

  if (!normalized) {
    return "Manual text fallback needed before extraction.";
  }

  return normalized.length > maxLength ? `${normalized.slice(0, maxLength - 1).trim()}...` : normalized;
}

type PdfParse = (buffer: Buffer) => Promise<{ text?: string }>;

async function loadPdfParse(): Promise<PdfParse> {
  const runtimeImport = new Function("specifier", "return import(specifier)") as (specifier: string) => Promise<unknown>;
  const module = (await runtimeImport("pdf-parse")) as { default?: PdfParse } | PdfParse;

  if (typeof module === "function") {
    return module;
  }

  if (typeof module.default === "function") {
    return module.default;
  }

  throw new Error("pdf-parse did not expose a parser function.");
}

function pdfFallback(fallbackReason: string): ParsedDocument {
  return {
    text: "",
    needsManualFallback: true,
    parser: "pdf",
    confidence: 0,
    fallbackReason
  };
}

function normalizeText(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}
