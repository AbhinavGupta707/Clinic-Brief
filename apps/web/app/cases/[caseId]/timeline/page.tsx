import { preopCase } from "@clinicbrief/fixtures";
import { AppShell } from "../../../../components/app-shell";
import { Chip, DemoCta, DemoFlowNav, SectionHeader, TimelineRow } from "../../../../components/demo/demo-case-components";

const filterLabels = ["All", "Appointment", "Medication", "Symptom", "Note"];

export default async function TimelinePage({ params }: { params: Promise<{ caseId: string }> }) {
  const { caseId } = await params;
  const brief = preopCase.expectedBrief;

  return (
    <AppShell eyebrow={`Case ${caseId}`} title="Timeline">
      <DemoFlowNav current="Timeline" />

      <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        <section className="grid content-start gap-4">
          <SectionHeader
            eyebrow="Chronological story"
            title="From scattered notes to a pre-op timeline"
            body="Events are grouped in a patient-readable order with source-backed summaries, not clinical interpretation."
          />

          <div className="flex flex-wrap gap-2 rounded-md border border-clinic-line bg-white p-3 shadow-soft" aria-label="Timeline filters">
            {filterLabels.map((label, index) => (
              <button
                key={label}
                type="button"
                className={`inline-flex min-h-11 items-center justify-center rounded-md px-4 text-sm font-semibold transition ${
                  index === 0 ? "bg-clinic-primary text-white" : "border border-clinic-line bg-white text-clinic-muted hover:bg-clinic-surface"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <ol className="grid gap-3">
            {preopCase.expectedTimeline.map((event) => (
              <TimelineRow key={event.id} event={event} />
            ))}
          </ol>
        </section>

        <aside className="grid content-start gap-4">
          <section className="rounded-md border border-clinic-line bg-white p-5 shadow-soft">
            <div className="flex flex-wrap items-center gap-2">
              <Chip tone="primary">What changed</Chip>
              <Chip>Since last appointment</Chip>
            </div>
            <h2 className="mt-4 text-xl font-semibold text-clinic-ink">Ready for the next conversation</h2>
            <ul className="mt-4 grid gap-3 text-sm leading-6 text-clinic-muted">
              {brief.whatChangedSinceLastAppointment.map((item) => (
                <li key={item} className="rounded-md border border-cyan-100 bg-clinic-surface p-3">
                  {item}
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-md border border-clinic-line bg-white p-5 shadow-soft">
            <h2 className="text-xl font-semibold text-clinic-ink">Open uncertainties</h2>
            <ul className="mt-4 grid gap-2">
              {brief.openUncertainties.map((item) => (
                <li key={item}>
                  <Chip tone="warning">{item}</Chip>
                </li>
              ))}
            </ul>
          </section>
        </aside>
      </div>

      <div className="flex flex-wrap gap-3">
        <DemoCta href="/cases/sample-preop/brief">Generate one-page brief</DemoCta>
        <DemoCta href="/cases/sample-preop/review" secondary>
          Back to review
        </DemoCta>
      </div>
    </AppShell>
  );
}
