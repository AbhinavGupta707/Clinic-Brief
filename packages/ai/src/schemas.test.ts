import { describe, expect, it } from "vitest";

import { ExtractionResultSchema, getSafetyRedirect } from "./index";

describe("AI extraction contracts", () => {
  it("accepts source-linked extraction output", () => {
    const parsed = ExtractionResultSchema.parse({
      facts: [
        {
          sourceDocId: "doc-source-1",
          category: "SYMPTOM",
          displayText: "Source mentions knee pain after walking.",
          value: { text: "knee pain after walking" },
          confidence: 0.82,
          sourceQuote: "knee pain after walking"
        }
      ],
      questions: []
    });

    expect(parsed.facts[0]?.sourceDocId).toBe("doc-source-1");
  });

  it("redirects prohibited medical advice requests", () => {
    expect(getSafetyRedirect("Should I stop taking this medicine?")).toContain("cannot diagnose or recommend treatment");
  });
});
