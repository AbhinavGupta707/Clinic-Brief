import { describe, expect, it } from "vitest";
import { getFallbackQuestion, getGuidedInterviewQuestion } from "./guided-interviewer";

describe("guided interviewer", () => {
  it("uses deterministic fallback questions by appointment type when Fireworks is not configured", async () => {
    const originalKey = process.env.FIREWORKS_API_KEY;
    const originalModel = process.env.FIREWORKS_MODEL;
    delete process.env.FIREWORKS_API_KEY;
    delete process.env.FIREWORKS_MODEL;

    const reply = await getGuidedInterviewQuestion({
      appointmentType: "preop",
      previousQuestions: [],
      previousAnswers: []
    });

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

    expect(reply).toEqual({
      question: "What operation or pre-op appointment are you preparing for, if you know?",
      source: "fixture",
      complete: false
    });
  });

  it("redirects unsafe medical requests without diagnosis or treatment advice", async () => {
    const reply = await getGuidedInterviewQuestion({
      appointmentType: "medication",
      previousQuestions: ["What do you want the clinician to understand about your current medication list?"],
      previousAnswers: ["I want to prepare notes."],
      latestAnswer: "Should I stop taking this medication?"
    });

    expect(reply.source).toBe("fixture");
    expect(reply.safetyRedirect).toContain("I cannot diagnose or recommend treatment");
    expect(reply.question).toBe("Are there medicines, supplements, allergies, or reactions you want listed as user-reported notes?");
  });

  it("advances fallback questions one answer at a time", () => {
    expect(
      getFallbackQuestion({
        appointmentType: "chronic",
        previousQuestions: ["What is the main thing you want this chronic review to cover?"],
        previousAnswers: ["I want to organize changes since the last visit."]
      }).question
    ).toBe("What is your usual baseline, in your own words?");
  });
});
