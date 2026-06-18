import { REQUIRED_DISCLAIMER } from "@clinicbrief/ai";

export function SafetyDisclaimer({ compact = false }: { compact?: boolean }) {
  return (
    <div className="rounded-md border border-clinic-line bg-white/85 p-4 text-sm leading-6 text-clinic-muted">
      <strong className="font-semibold text-clinic-ink">Preparation only. </strong>
      <span>{compact ? REQUIRED_DISCLAIMER.replace("ClinicBrief ", "") : REQUIRED_DISCLAIMER}</span>
    </div>
  );
}
