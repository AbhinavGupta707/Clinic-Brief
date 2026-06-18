const prohibitedPatterns = [
  /\bwhat (condition|disease|illness) do i have\b/i,
  /\bshould i (take|stop|start|change)\b/i,
  /\bdo i need surgery\b/i,
  /\bis this (an )?emergency\b/i,
  /\bwhat dose should i take\b/i,
  /\bdiagnos(e|is)\b/i,
  /\btreatment recommendation\b/i
];

export const SAFE_MEDICAL_REDIRECT =
  "I can help organize your notes and list questions to ask. I cannot diagnose or recommend treatment. If symptoms feel urgent or severe, contact emergency or urgent medical services.";

export function isProhibitedMedicalAdviceRequest(input: string): boolean {
  return prohibitedPatterns.some((pattern) => pattern.test(input));
}

export function getSafetyRedirect(input: string): string | null {
  return isProhibitedMedicalAdviceRequest(input) ? SAFE_MEDICAL_REDIRECT : null;
}
