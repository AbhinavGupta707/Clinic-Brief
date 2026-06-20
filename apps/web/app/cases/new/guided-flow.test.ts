import { describe, expect, it } from "vitest";
import { buildGuidedConversationSourceText, mapAppointmentTypeToMode, makeGuidedInitialSource, type GuidedProfile } from "./guided-flow";

const profile: GuidedProfile = {
  firstName: "Alex",
  preparingFor: "self",
  ageRange: "Adult",
  basicContext: "Preparing for a clinic appointment.",
  simpleLanguage: true,
  largerText: false
};

describe("guided flow helpers", () => {
  it("maps appointment type cards to backward-compatible case modes", () => {
    expect(mapAppointmentTypeToMode("preop")).toBe("PREOP");
    expect(mapAppointmentTypeToMode("chronic")).toBe("CHRONIC");
    expect(mapAppointmentTypeToMode("upcoming")).toBe("GENERAL");
    expect(mapAppointmentTypeToMode("symptoms")).toBe("GENERAL");
    expect(mapAppointmentTypeToMode("medication")).toBe("GENERAL");
    expect(mapAppointmentTypeToMode("preop", "someone_else")).toBe("CARER");
  });

  it("formats reviewed guided answers as source material", () => {
    const text = buildGuidedConversationSourceText({
      profile,
      appointmentType: "preop",
      answers: [{ question: "What are you preparing for?", answer: "A synthetic pre-op appointment." }]
    });
    const source = makeGuidedInitialSource(text);

    expect(text).toContain("Guided appointment-prep conversation");
    expect(text).toContain("Question 1: What are you preparing for?");
    expect(text).toContain("Answer 1: A synthetic pre-op appointment.");
    expect(source).toEqual({
      text,
      sourceLabel: "Guided appointment-prep conversation",
      captureMethod: "typed",
      userReviewed: true,
      storesAudio: false
    });
  });
});
