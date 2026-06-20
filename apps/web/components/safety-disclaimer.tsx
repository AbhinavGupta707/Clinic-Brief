import { REQUIRED_DISCLAIMER } from "@clinicbrief/ai";

export function SafetyDisclaimer({ compact = false }: { compact?: boolean }) {
  return (
    <div className="rounded-2xl border border-[#EFE2D2] bg-[#FFFDF8] p-4 text-sm font-medium leading-6 text-[#8A7A6E]">
      <strong className="font-extrabold text-[#3D2F26]">Preparation only. </strong>
      <span>{REQUIRED_DISCLAIMER}</span>
    </div>
  );
}
