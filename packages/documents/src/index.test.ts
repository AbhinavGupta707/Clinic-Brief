import { describe, expect, it } from "vitest";

import { createSourceSnippet, parseImageBuffer, parsePdfBuffer, parseTextNote } from "./index";

describe("document parsing", () => {
  it("normalizes text notes and source snippets", async () => {
    const parsed = await parseTextNote("  Appointment   note\nwith spacing.  ");

    expect(parsed.needsManualFallback).toBe(false);
    expect(parsed.parser).toBe("text");
    expect(parsed.text).toBe("Appointment   note\nwith spacing.");
    expect(createSourceSnippet("A\n\nsource     snippet")).toBe("A source snippet");
  });

  it("returns an honest fallback for malformed PDFs", async () => {
    const parsed = await parsePdfBuffer(new TextEncoder().encode("not a pdf").buffer);

    expect(parsed.parser).toBe("pdf");
    expect(parsed.needsManualFallback).toBe(true);
    expect(parsed.fallbackReason).toContain("Paste");
  });

  it("keeps image OCR as manual fallback", async () => {
    const parsed = await parseImageBuffer(new ArrayBuffer(4));

    expect(parsed.parser).toBe("image");
    expect(parsed.needsManualFallback).toBe(true);
  });
});
