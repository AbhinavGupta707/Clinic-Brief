import Link from "next/link";
import { preopCase } from "@clinicbrief/fixtures";
import { AppShell } from "../../../components/app-shell";
import { StatusCard } from "../../../components/status-card";

export default function PreopDemoPage() {
  return (
    <AppShell eyebrow="Synthetic demo" title="Sample pre-op case">
      <div className="grid gap-4 md:grid-cols-3">
        <StatusCard title="Documents">
          <p>{preopCase.documents.length} synthetic documents are ready for extraction.</p>
        </StatusCard>
        <StatusCard title="Facts">
          <p>{preopCase.expectedFacts.length} expected facts provide deterministic fallback.</p>
        </StatusCard>
        <StatusCard title="Brief">
          <p>{preopCase.expectedBrief.title}</p>
        </StatusCard>
      </div>
      <div className="rounded-md border border-clinic-line bg-white p-5">
        <h2 className="text-xl font-semibold text-clinic-ink">Expected missing-context questions</h2>
        <ul className="mt-4 grid gap-3">
          {preopCase.expectedQuestions.map((question) => (
            <li key={question.id} className="rounded-md border border-cyan-100 p-4 text-sm text-clinic-muted">
              <span className="font-semibold text-clinic-ink">{question.question}</span>
              <p className="mt-1">{question.whyItMattersForAppointment}</p>
            </li>
          ))}
        </ul>
      </div>
      <div className="flex flex-wrap gap-3">
        <Link className="rounded-md bg-clinic-success px-5 py-3 font-semibold text-white hover:bg-emerald-700" href="/cases/sample-preop/review">
          Review extracted facts
        </Link>
        <Link className="rounded-md border border-clinic-line bg-white px-5 py-3 font-semibold text-clinic-ink hover:bg-cyan-50" href="/cases/sample-preop/brief">
          View brief
        </Link>
        <Link className="rounded-md border border-clinic-line bg-white px-5 py-3 font-semibold text-clinic-ink hover:bg-cyan-50" href="/cases/sample-preop/rehearsal">
          Rehearse
        </Link>
        <Link className="rounded-md border border-clinic-line bg-white px-5 py-3 font-semibold text-clinic-ink hover:bg-cyan-50" href="/cases/sample-preop/export">
          Export
        </Link>
        <Link className="rounded-md border border-clinic-line bg-white px-5 py-3 font-semibold text-clinic-ink hover:bg-cyan-50" href="/cases/sample-preop/settings">
          Privacy controls
        </Link>
        <Link className="rounded-md border border-clinic-line bg-white px-5 py-3 font-semibold text-clinic-ink hover:bg-cyan-50" href="/novus-proof">
          Novus proof
        </Link>
      </div>
    </AppShell>
  );
}
