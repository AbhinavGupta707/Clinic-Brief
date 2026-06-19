import { describe, expect, it } from "vitest";

import { createSourceTextFallbackExtraction } from "./extraction-service";

describe("extraction service fallback", () => {
  it("creates deterministic facts from the user's source text", () => {
    const extraction = createSourceTextFallbackExtraction("case-fallback", "PREOP", [
      makeDocument(
        "doc-1",
        "Medication list: Uses blue inhaler before exercise. Symptom diary: knee pain worse after walking. Pre-op appointment is next month."
      )
    ]);

    expect(extraction.source).toBe("fixture");
    expect(extraction.facts.map((fact) => fact.category)).toEqual(["MEDICATION", "SYMPTOM", "APPOINTMENT"]);
    expect(extraction.facts[0]?.sourceDocId).toBe("doc-1");
    expect(extraction.facts[0]?.value.extractionSource).toBe("fixture");
    expect(extraction.facts[0]?.displayText).toContain("Source mentions");
  });

  it("asks safe context questions when no source text is available", () => {
    const extraction = createSourceTextFallbackExtraction("case-empty", "GENERAL", []);

    expect(extraction.facts).toHaveLength(0);
    expect(extraction.questions[0]?.question).toContain("main outcome");
    expect(extraction.questions.map((question) => question.question).join(" ")).not.toMatch(/diagnos|treatment/i);
  });
});

function makeDocument(id: string, text: string) {
  return {
    id,
    type: "TEXT_NOTE" as const,
    fileName: `${id}.txt`,
    text
  };
}
