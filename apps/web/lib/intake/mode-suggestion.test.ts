import { describe, expect, it } from "vitest";

import { suggestAppointmentMode } from "./mode-suggestion";

describe("suggestAppointmentMode", () => {
  it.each([
    "Preparing for surgery next month.",
    "Questions for the pre-op team.",
    "Previous anaesthetic notes to organize.",
    "Previous anesthetic notes to organize.",
    "Upcoming operation paperwork."
  ])("suggests PREOP for surgery-preparation workflow cues: %s", (text) => {
    expect(suggestAppointmentMode(text)).toMatchObject({
      mode: "PREOP",
      explanation: expect.stringContaining("workflow")
    });
  });

  it.each([
    "Symptoms have changed over months.",
    "A few years of tracking appointment notes.",
    "Ongoing flares and baseline notes.",
    "Recurring questions for the next review.",
    "Chronic appointment preparation."
  ])("suggests CHRONIC for longitudinal workflow cues: %s", (text) => {
    expect(suggestAppointmentMode(text)).toMatchObject({
      mode: "CHRONIC",
      explanation: expect.stringContaining("ongoing")
    });
  });

  it.each([
    "I am helping my mum prepare questions.",
    "My mother asked me to organize the notes.",
    "This is for my dad before his appointment.",
    "I am caring for my child.",
    "Submitting this on behalf of someone else.",
    "Caregiver handoff notes."
  ])("suggests CARER for helper or representative workflow cues: %s", (text) => {
    expect(suggestAppointmentMode(text)).toMatchObject({
      mode: "CARER",
      explanation: expect.stringContaining("someone else")
    });
  });

  it("uses workflow priority without making clinical inferences", () => {
    const suggestion = suggestAppointmentMode("I am helping my mum prepare for a pre-op appointment after years of notes.");

    expect(suggestion).toEqual({
      mode: "PREOP",
      explanation: "Suggested pre-op mode because the wording points to a surgery-preparation workflow, not a diagnosis."
    });
  });

  it("falls back to GENERAL when no supported workflow cue is present", () => {
    expect(suggestAppointmentMode(["Notes for next week", "Questions to remember"])).toEqual({
      mode: "GENERAL",
      explanation: "Suggested general mode because no supported workflow cue was found."
    });
  });
});
