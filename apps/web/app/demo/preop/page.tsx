import Link from "next/link";
import { preopCase } from "@clinicbrief/fixtures";
import { AppShell } from "../../../components/app-shell";
import { StatusCard } from "../../../components/status-card";
import { BriefPreview, DemoCta, DemoFlowNav, DocumentStack, MissingQuestionList, SectionHeader, TrustStrip } from "../../../components/demo/demo-case-components";

export default function PreopDemoPage() {
  return (
    <AppShell eyebrow="Synthetic demo" title="Sample pre-op case">
      <DemoFlowNav current="Demo" />

      <div className="grid gap-4 md:grid-cols-3">
        <StatusCard title="Documents">
          <p>{preopCase.documents.length} synthetic documents model the scattered pre-op paperwork judges need to understand.</p>
        </StatusCard>
        <StatusCard title="Facts">
          <p>{preopCase.expectedFacts.length} fixture facts include source provenance, confidence, and patient review states.</p>
        </StatusCard>
        <StatusCard title="Brief">
          <p>{preopCase.expectedBrief.title} is ready without external APIs, upload, or clinical inference.</p>
        </StatusCard>
      </div>

      <TrustStrip />

      <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <section className="grid content-start gap-4">
          <SectionHeader
            eyebrow="Scattered inputs"
            title="Synthetic documents that look like the real mess"
            body="The demo starts with referral context, a medication list, pre-op notes, a symptom diary, an allergy note, and the last appointment summary."
          />
          <DocumentStack />
        </section>

        <section className="grid content-start gap-4">
          <SectionHeader
            eyebrow="Organized output"
            title="A one-page brief emerges from reviewed facts"
            body="The fixture fallback shows exactly what ClinicBrief can organize without diagnosing or recommending treatment."
          />
          <BriefPreview />
        </section>
      </div>

      <div className="grid gap-4 rounded-md border border-clinic-line bg-white p-5 shadow-soft">
        <SectionHeader
          eyebrow="Missing context"
          title="Questions to make the appointment conversation cleaner"
          body="These are preparation prompts only: allergy wording, medication timing, prior anaesthetic experience, recent context, transport, and support."
        />
        <MissingQuestionList />
      </div>

      <div className="flex flex-wrap gap-3">
        <Link className="inline-flex min-h-11 items-center justify-center rounded-md bg-clinic-success px-5 py-3 font-semibold text-white hover:bg-emerald-700" href="/cases/new?demo=guided">
          Try guided demo
        </Link>
        <DemoCta href="/cases/sample-preop/review">Review extracted facts</DemoCta>
        <Link className="inline-flex min-h-11 items-center justify-center rounded-md border border-clinic-line bg-white px-5 py-3 font-semibold text-clinic-ink hover:bg-cyan-50" href="/cases/sample-preop/timeline">
          View timeline
        </Link>
        <Link className="inline-flex min-h-11 items-center justify-center rounded-md border border-clinic-line bg-white px-5 py-3 font-semibold text-clinic-ink hover:bg-cyan-50" href="/cases/sample-preop/brief">
          Open brief
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
