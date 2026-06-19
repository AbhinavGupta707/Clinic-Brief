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

export async function parsePdfBuffer(_buffer: ArrayBuffer): Promise<ParsedDocument> {
  return {
    text: "",
    needsManualFallback: true,
    parser: "pdf",
    confidence: 0,
    fallbackReason: "PDF parsing is not connected yet. Paste the important text manually so the appointment brief can still be prepared."
  };
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
  const normalized = text.replace(/\s+/g, " ").trim();

  if (!normalized) {
    return "Manual text fallback needed before extraction.";
  }

  return normalized.length > maxLength ? `${normalized.slice(0, maxLength - 1).trim()}...` : normalized;
}
