export type ParsedDocument = {
  text: string;
  needsManualFallback: boolean;
  parser: "pdf" | "image" | "text";
};

export async function parseTextNote(text: string): Promise<ParsedDocument> {
  return {
    text: text.trim(),
    needsManualFallback: text.trim().length === 0,
    parser: "text"
  };
}

export async function parsePdfBuffer(_buffer: ArrayBuffer): Promise<ParsedDocument> {
  return {
    text: "",
    needsManualFallback: true,
    parser: "pdf"
  };
}

export async function parseImageBuffer(_buffer: ArrayBuffer): Promise<ParsedDocument> {
  return {
    text: "",
    needsManualFallback: true,
    parser: "image"
  };
}
