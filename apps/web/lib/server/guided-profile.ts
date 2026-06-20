import { runClinicJson } from "@clinicbrief/ai";
import { z } from "zod";
import type { GuidedProfile } from "../../app/cases/new/guided-flow";
import { GuidedAiUnavailableError, isGuidedAiRequired } from "./guided-interviewer";

export type GuidedProfileDraft = {
  profile: Partial<GuidedProfile>;
  confidence: number;
};

const GuidedProfileDraftSchema = z
  .object({
    firstName: z.string().trim().max(80).optional().default(""),
    preparingFor: z.enum(["self", "someone_else"]).optional().default("self"),
    ageRange: z.string().trim().max(80).optional().default(""),
    basicContext: z.string().trim().max(240).optional().default(""),
    simpleLanguage: z.boolean().optional().default(false),
    largerText: z.boolean().optional().default(false),
    confidence: z.number().min(0).max(1)
  })
  .strict();

export async function parseGuidedProfileDraft(transcript: string): Promise<GuidedProfileDraft> {
  const cleanTranscript = transcript.trim();

  if (!cleanTranscript) {
    return { profile: {}, confidence: 0 };
  }

  if (!isFireworksConfigured()) {
    if (isGuidedAiRequired()) {
      throw new GuidedAiUnavailableError("Fireworks is required for voice-assisted profile autofill. Set FIREWORKS_API_KEY and FIREWORKS_MODEL.");
    }

    return parseGuidedProfileFallback(cleanTranscript);
  }

  try {
    const parsed = await runClinicJson({
      task: "guided-profile-autofill",
      system:
        "Extract only basic appointment-prep onboarding fields from the user's reviewed text. Do not diagnose, summarize clinical meaning, recommend treatment, infer urgency, or include detailed health facts. Return JSON only.",
      user: JSON.stringify({
        transcript: cleanTranscript,
        fields: {
          firstName: "First name only if clearly stated.",
          preparingFor: "self or someone_else.",
          ageRange: "Short optional age range or life-stage phrase if clearly stated.",
          basicContext: "One short non-diagnostic context phrase for the appointment.",
          simpleLanguage: "true only if the user asks for simpler wording.",
          largerText: "true only if the user asks for larger text."
        },
        safetyRules: [
          "No diagnosis.",
          "No treatment advice.",
          "No medication change advice.",
          "No emergency triage.",
          "Do not copy long health narratives into basicContext."
        ]
      }),
      schema: GuidedProfileDraftSchema
    });

    return {
      profile: {
        firstName: parsed.firstName,
        preparingFor: parsed.preparingFor,
        ageRange: parsed.ageRange,
        basicContext: parsed.basicContext,
        simpleLanguage: parsed.simpleLanguage,
        largerText: parsed.largerText
      },
      confidence: parsed.confidence
    };
  } catch {
    if (isGuidedAiRequired()) {
      throw new GuidedAiUnavailableError("Fireworks could not autofill the profile. Try again or fill the fields manually.");
    }

    return parseGuidedProfileFallback(cleanTranscript);
  }
}

function parseGuidedProfileFallback(transcript: string): GuidedProfileDraft {
  const firstNameMatch = transcript.match(/\b(?:i am|i'm|my name is|name is)\s+([A-Za-z][A-Za-z'-]{1,40})/i);
  const preparingFor = /\b(my dad|my mum|my mom|my mother|my father|my parent|my child|my partner|someone else|for him|for her|for them)\b/i.test(transcript) ? "someone_else" : "self";

  return {
    profile: {
      firstName: firstNameMatch?.[1] ?? "",
      preparingFor,
      ageRange: /\bolder adult\b/i.test(transcript) ? "Older adult" : "",
      basicContext: transcript.slice(0, 180),
      simpleLanguage: /\bsimple language|plain english|plain language\b/i.test(transcript),
      largerText: /\blarger text|large text|bigger text\b/i.test(transcript)
    },
    confidence: firstNameMatch ? 0.55 : 0.25
  };
}

function isFireworksConfigured(): boolean {
  return Boolean(process.env.FIREWORKS_API_KEY && process.env.FIREWORKS_MODEL);
}
