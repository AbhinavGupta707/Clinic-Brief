import { describe, expect, it } from "vitest";
import { GuidedAiUnavailableError } from "./guided-interviewer";
import { parseGuidedProfileDraft } from "./guided-profile";

describe("guided profile autofill", () => {
  it("uses conservative local parsing only when AI is not required", async () => {
    const originalKey = process.env.FIREWORKS_API_KEY;
    const originalModel = process.env.FIREWORKS_MODEL;
    const originalRequireAi = process.env.CLINICBRIEF_REQUIRE_AI;
    delete process.env.FIREWORKS_API_KEY;
    delete process.env.FIREWORKS_MODEL;
    delete process.env.CLINICBRIEF_REQUIRE_AI;

    const draft = await parseGuidedProfileDraft("My name is Alex, I am preparing for myself and prefer simple language.");

    expect(draft.profile).toMatchObject({
      firstName: "Alex",
      preparingFor: "self",
      simpleLanguage: true
    });
    expect(draft.confidence).toBeGreaterThan(0);

    restoreEnv(originalKey, originalModel, originalRequireAi);
  });

  it("does not silently autofill when AI is required but Fireworks is missing", async () => {
    const originalKey = process.env.FIREWORKS_API_KEY;
    const originalModel = process.env.FIREWORKS_MODEL;
    const originalRequireAi = process.env.CLINICBRIEF_REQUIRE_AI;
    delete process.env.FIREWORKS_API_KEY;
    delete process.env.FIREWORKS_MODEL;
    process.env.CLINICBRIEF_REQUIRE_AI = "true";

    await expect(parseGuidedProfileDraft("My name is Alex.")).rejects.toBeInstanceOf(GuidedAiUnavailableError);

    restoreEnv(originalKey, originalModel, originalRequireAi);
  });
});

function restoreEnv(originalKey: string | undefined, originalModel: string | undefined, originalRequireAi: string | undefined) {
  if (originalKey) {
    process.env.FIREWORKS_API_KEY = originalKey;
  } else {
    delete process.env.FIREWORKS_API_KEY;
  }

  if (originalModel) {
    process.env.FIREWORKS_MODEL = originalModel;
  } else {
    delete process.env.FIREWORKS_MODEL;
  }

  if (originalRequireAi) {
    process.env.CLINICBRIEF_REQUIRE_AI = originalRequireAi;
  } else {
    delete process.env.CLINICBRIEF_REQUIRE_AI;
  }
}
