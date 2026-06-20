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
    age: z.string().trim().max(40).optional().default(""),
    gender: z.string().trim().max(80).optional().default(""),
    aboutYou: z.string().trim().max(240).optional().default(""),
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
          age: "Age or age range only if clearly stated.",
          gender: "Gender only if clearly stated; preserve user wording.",
          aboutYou: "Only extra context, preferences, access needs, or useful background. Leave blank when the text only contains name, age, gender, or who the user is preparing for.",
          simpleLanguage: "true only if the user asks for simpler wording.",
          largerText: "true only if the user asks for larger text."
        },
        safetyRules: [
          "No diagnosis.",
          "No treatment advice.",
          "No medication change advice.",
          "No emergency triage.",
          "Do not copy the transcript into aboutYou.",
          "Do not put name, age, gender, or preparing-for statements into aboutYou."
        ]
      }),
      schema: GuidedProfileDraftSchema
    });

    return {
      profile: {
        firstName: parsed.firstName,
        preparingFor: parsed.preparingFor,
        age: parsed.age,
        gender: parsed.gender,
        aboutYou: parsed.aboutYou,
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
      age: transcript.match(/\b(?:age|aged|i am|i'm)\s+(\d{1,3})\b/i)?.[1] ?? (/\bolder adult\b/i.test(transcript) ? "Older adult" : ""),
      gender: transcript.match(/\b(?:gender is|sex is|i am|i'm|and|,)\s+(?:a\s+)?(woman|man|female|male|non-binary|nonbinary)\b/i)?.[1] ?? "",
      aboutYou: extractAdditionalProfileContext(transcript),
      simpleLanguage: /\bsimple language|plain english|plain language\b/i.test(transcript),
      largerText: /\blarger text|large text|bigger text\b/i.test(transcript)
    },
    confidence: firstNameMatch ? 0.55 : 0.25
  };
}

function isFireworksConfigured(): boolean {
  return Boolean(process.env.FIREWORKS_API_KEY && process.env.FIREWORKS_MODEL);
}

function extractAdditionalProfileContext(text: string): string {
  return text.match(/\b(?:about me|about them|additional(?:ly)?|also|one more thing|worth knowing)[:,]?\s+(.{8,180})$/i)?.[1]?.trim() ?? "";
}
