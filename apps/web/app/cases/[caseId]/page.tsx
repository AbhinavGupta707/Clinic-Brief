import Link from "next/link";
import { Activity, ArrowRight, ClipboardCheck, Download, FileText, HelpCircle, MessageSquareText, RotateCcw, ShieldCheck } from "lucide-react";
import { notFound } from "next/navigation";
import { AppShell } from "../../../components/app-shell";
import { Chip, DemoFlowNav, SectionHeader } from "../../../components/demo/demo-case-components";
import { getClinicRepository } from "../../../lib/server/clinic-repository";
import { buildCaseDashboardState, buildChronicLongitudinalDashboardState, getDashboardTimeline, getDefaultBriefType } from "./dashboard-state";

export default async function CaseDashboardPage({ params }: { params: Promise<{ caseId: string }> }) {
  const { caseId } = await params;
  const repository = await getClinicRepository();
  const record = await repository.getCase(caseId);

  if (!record) {
    notFound();
  }

  const dashboard = buildCaseDashboardState(record);
  const chronicDashboard = record.mode === "CHRONIC" ? buildChronicLongitudinalDashboardState(record) : undefined;
  const timeline = getDashboardTimeline(record);
  const briefType = getDefaultBriefType(record);
  const latestBrief = record.briefs.find((brief) => brief.briefType === briefType) ?? record.briefs[0];
  const isDemoCase = caseId === "sample-preop";

  return (
    <AppShell eyebrow={`Case ${caseId}`} title={record.title}>
      {isDemoCase ? <DemoFlowNav current="Dashboard" /> : null}

      <section className="grid gap-4 rounded-md border border-clinic-line bg-white p-5 shadow-soft">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="grid gap-2">
            <div className="flex flex-wrap gap-2">
              <Chip tone="primary">{record.mode.toLowerCase().replace("_", " ")} case</Chip>
              <Chip tone={record.status === "DELETED" ? "warning" : "success"}>{record.status.toLowerCase().replace("_", " ")}</Chip>
              <Chip>{dashboard.counts.sourcePreviews || dashboard.counts.documents} sources</Chip>
            </div>
            <h2 className="text-2xl font-semibold text-clinic-ink">Appointment preparation dashboard</h2>
            <p className="max-w-3xl text-sm leading-6 text-clinic-muted">
              This is the home base for this case: add sources, review extracted facts, check the timeline, prepare a brief, rehearse, and export.
            </p>
          </div>
          <Link
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-clinic-success px-5 py-3 font-semibold text-white transition hover:bg-emerald-700"
            href={dashboard.nextAction.href}
          >
            {dashboard.nextAction.label}
            <ArrowRight size={18} aria-hidden />
          </Link>
        </div>
        <p className="rounded-md border border-cyan-100 bg-clinic-surface p-3 text-sm leading-6 text-clinic-muted">{dashboard.nextAction.reason}</p>
      </section>

      <section className="grid gap-3 md:grid-cols-3">
        <MetricCard label="Facts" value={dashboard.counts.facts} detail={`${dashboard.counts.factsNeedingReview} need review`} />
        <MetricCard label="Open questions" value={dashboard.counts.openQuestions} detail="For appointment prep" />
        <MetricCard label="Briefs" value={dashboard.counts.briefs} detail={latestBrief ? "Draft available" : "Ready after review"} />
      </section>

      {chronicDashboard ? (
        <DashboardPanel icon={Activity} title="Longitudinal view">
          <div className="grid gap-4">
            <div className="grid gap-3 rounded-md border border-cyan-100 bg-clinic-surface p-4 md:grid-cols-[1fr_auto] md:items-start">
              <div className="grid gap-2">
                <div className="flex flex-wrap gap-2">
                  <Chip tone={chronicDashboard.readyForBrief.ready ? "success" : "warning"}>
                    {chronicDashboard.readyForBrief.ready ? "ready for brief" : "review needed"}
                  </Chip>
                  <Chip>{chronicDashboard.readyForBrief.reviewedFactCount} reviewed facts</Chip>
                </div>
                <h3 className="text-base font-semibold text-clinic-ink">Ongoing history for this appointment</h3>
                <p className="text-sm leading-6 text-clinic-muted">{chronicDashboard.readyForBrief.reason}</p>
                {chronicDashboard.appointmentGoal ? (
                  <p className="rounded-md border border-cyan-100 bg-white p-3 text-sm leading-6 text-clinic-muted">
                    <span className="font-semibold text-clinic-ink">Current appointment goal: </span>
                    {chronicDashboard.appointmentGoal}
                  </p>
                ) : null}
              </div>
              <Link
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-clinic-primary px-4 py-3 text-sm font-semibold text-white transition hover:bg-clinic-primaryDark"
                href={chronicDashboard.readyForBrief.href}
              >
                {chronicDashboard.readyForBrief.ready ? "Open brief" : "Continue"}
                <ArrowRight size={17} aria-hidden />
              </Link>
            </div>

            {chronicDashboard.emptyState ? (
              <div className="grid gap-3 rounded-md border border-dashed border-clinic-line p-4">
                <div>
                  <h3 className="font-semibold text-clinic-ink">{chronicDashboard.emptyState.title}</h3>
                  <p className="mt-1 text-sm leading-6 text-clinic-muted">{chronicDashboard.emptyState.body}</p>
                </div>
                <Link
                  className="inline-flex min-h-11 w-fit items-center justify-center gap-2 rounded-md border border-clinic-line bg-white px-4 py-3 text-sm font-semibold text-clinic-ink transition hover:bg-cyan-50"
                  href={chronicDashboard.emptyState.primaryHref}
                >
                  {chronicDashboard.emptyState.primaryLabel}
                  <ArrowRight size={17} aria-hidden />
                </Link>
              </div>
            ) : null}

            <div className="grid gap-3 md:grid-cols-2">
              {chronicDashboard.sections.map((section) => (
                <div key={section.id} className="grid content-start gap-3 rounded-md border border-cyan-100 p-4">
                  <h3 className="text-sm font-semibold text-clinic-ink">{section.title}</h3>
                  {section.items.length > 0 ? (
                    <ul className="grid gap-2">
                      {section.items.map((item) => (
                        <li key={item.id} className="rounded-md bg-clinic-surface p-3 text-sm leading-6 text-clinic-muted">
                          {item.text}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm leading-6 text-clinic-muted">Reviewed facts for this section will appear here.</p>
                  )}
                </div>
              ))}
            </div>

            <div className="grid gap-3 lg:grid-cols-2">
              <div className="grid content-start gap-3 rounded-md border border-cyan-100 p-4">
                <h3 className="text-sm font-semibold text-clinic-ink">Open uncertainties and questions to ask</h3>
                {chronicDashboard.openUncertainties.length > 0 || chronicDashboard.openQuestions.length > 0 ? (
                  <ul className="grid gap-2">
                    {chronicDashboard.openUncertainties.map((item) => (
                      <li key={item.id} className="rounded-md bg-clinic-surface p-3">
                        <div className="flex flex-wrap gap-2">
                          <Chip tone="warning">uncertainty</Chip>
                          <Chip>reviewed</Chip>
                        </div>
                        <p className="mt-2 text-sm leading-6 text-clinic-muted">{item.text}</p>
                      </li>
                    ))}
                    {chronicDashboard.openQuestions.map((question) => (
                      <li key={question.id} className="rounded-md bg-clinic-surface p-3">
                        <div className="flex flex-wrap gap-2">
                          <Chip tone={question.priority === "high" ? "warning" : "primary"}>{question.priority} priority</Chip>
                        </div>
                        <p className="mt-2 text-sm font-semibold leading-6 text-clinic-ink">{question.question}</p>
                        <p className="mt-1 text-sm leading-6 text-clinic-muted">{question.whyItMattersForAppointment}</p>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm leading-6 text-clinic-muted">Questions will appear after extraction or when the user adds clinician questions.</p>
                )}
              </div>

              <div className="grid content-start gap-3 rounded-md border border-cyan-100 p-4">
                <h3 className="text-sm font-semibold text-clinic-ink">Needs review before it can shape summaries</h3>
                {chronicDashboard.needsReview.length > 0 ? (
                  <ul className="grid gap-2">
                    {chronicDashboard.needsReview.map((item) => (
                      <li key={item.id} className="rounded-md bg-amber-50 p-3 text-sm leading-6 text-clinic-muted">
                        {item.text}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm leading-6 text-clinic-muted">No unreviewed facts are waiting. Rejected facts are not shown here or in summaries.</p>
                )}
                <Link
                  className="inline-flex min-h-11 w-fit items-center justify-center gap-2 rounded-md border border-clinic-line bg-white px-4 py-3 text-sm font-semibold text-clinic-ink transition hover:bg-cyan-50"
                  href={`/cases/${caseId}/review`}
                >
                  Review facts
                  <ArrowRight size={17} aria-hidden />
                </Link>
              </div>
            </div>
          </div>
        </DashboardPanel>
      ) : null}

      <section className="grid gap-4 rounded-md border border-clinic-line bg-white p-5 shadow-soft">
        <SectionHeader
          eyebrow="Preparation status"
          title="Where this case is in the workflow"
          body="Each step is derived from the current case data. Blocked steps become available as sources and reviewed facts are added."
        />
        <ol className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {dashboard.workflow.map((item) => (
            <li key={item.id} className="grid min-h-28 gap-3 rounded-md border border-cyan-100 p-4">
              <div className="flex items-start justify-between gap-3">
                <h3 className="font-semibold text-clinic-ink">{item.label}</h3>
                <WorkflowBadge state={item.state} />
              </div>
              <p className="text-sm leading-6 text-clinic-muted">
                {item.count ?? 0} {item.count === 1 ? "item" : "items"}
                {item.needsUserReview ? " need user review" : ""}
              </p>
            </li>
          ))}
        </ol>
      </section>

      <div className="grid gap-5 lg:grid-cols-[1fr_22rem]">
        <section className="grid content-start gap-5">
          <DashboardPanel icon={ClipboardCheck} title="Top points to raise">
            {dashboard.topPointsToRaise.length > 0 ? (
              <ul className="grid gap-3">
                {dashboard.topPointsToRaise.map((item) => (
                  <li key={item.id} className="rounded-md border border-cyan-100 bg-clinic-surface p-3 text-sm leading-6 text-clinic-muted">
                    <span className="font-semibold text-clinic-ink">{item.userReviewed ? "Reviewed: " : "Check: "}</span>
                    {item.text}
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState>Add notes or documents, then extract facts to see the main points for the appointment.</EmptyState>
            )}
          </DashboardPanel>

          <DashboardPanel icon={RotateCcw} title="What changed since last appointment">
            {dashboard.whatChangedSinceLastAppointment.length > 0 ? (
              <ul className="grid gap-3">
                {dashboard.whatChangedSinceLastAppointment.map((item) => (
                  <li key={item.id} className="rounded-md border border-cyan-100 p-3 text-sm leading-6 text-clinic-muted">
                    {item.text}
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState>Reviewed facts or timeline entries will appear here when the case has enough context.</EmptyState>
            )}
          </DashboardPanel>

          <DashboardPanel icon={HelpCircle} title="Open questions">
            {dashboard.openQuestions.length > 0 ? (
              <ul className="grid gap-3">
                {dashboard.openQuestions.map((question) => (
                  <li key={question.id} className="rounded-md border border-cyan-100 p-3">
                    <div className="flex flex-wrap gap-2">
                      <Chip tone={question.priority === "high" ? "warning" : "primary"}>{question.priority} priority</Chip>
                      <Chip>{question.answered ? "answered" : "open"}</Chip>
                    </div>
                    <p className="mt-3 text-sm font-semibold leading-6 text-clinic-ink">{question.question}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState>Missing-context questions will appear after extraction or in a generated brief.</EmptyState>
            )}
          </DashboardPanel>
        </section>

        <aside className="grid content-start gap-5">
          <DashboardPanel icon={FileText} title="Source coverage">
            <ul className="grid gap-3">
              {dashboard.sourceCoverage.map((item) => (
                <li key={`${item.section}-${item.sourceCount}`} className="flex items-start justify-between gap-3 rounded-md border border-cyan-100 p-3 text-sm">
                  <span className="font-semibold text-clinic-ink">{item.section}</span>
                  <Chip tone={item.weakOrMissingEvidence ? "warning" : "success"}>{item.sourceCount} sources</Chip>
                </li>
              ))}
            </ul>
          </DashboardPanel>

          <DashboardPanel icon={RotateCcw} title="Timeline summary">
            {timeline.length > 0 ? (
              <ol className="grid gap-3">
                {timeline.slice(0, 4).map((event) => (
                  <li key={event.id} className="rounded-md border border-cyan-100 p-3">
                    <p className="text-xs font-semibold uppercase text-clinic-primary">{event.date ?? event.approximateDate ?? "Date not provided"}</p>
                    <p className="mt-1 text-sm font-semibold text-clinic-ink">{event.title}</p>
                    <p className="mt-1 text-sm leading-6 text-clinic-muted">{event.description}</p>
                  </li>
                ))}
              </ol>
            ) : (
              <EmptyState>The timeline appears after facts are reviewed or enough high-confidence facts are available.</EmptyState>
            )}
          </DashboardPanel>

          <DashboardPanel icon={ShieldCheck} title="Preparation only">
            <p className="text-sm leading-6 text-clinic-muted">
              ClinicBrief organizes information you provide so you can prepare for appointments. It does not diagnose, recommend treatment, or replace medical advice. Review everything before sharing it with a clinician.
            </p>
          </DashboardPanel>

          <div className="grid gap-3">
            <Link
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-clinic-line bg-white px-5 py-3 font-semibold text-clinic-ink transition hover:bg-cyan-50"
              href={`/cases/${caseId}/brief?type=${briefType}`}
            >
              <FileText size={18} aria-hidden />
              Open brief
            </Link>
            <Link
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-clinic-line bg-white px-5 py-3 font-semibold text-clinic-ink transition hover:bg-cyan-50"
              href={`/cases/${caseId}/rehearsal?type=${briefType}`}
            >
              <MessageSquareText size={18} aria-hidden />
              Rehearse
            </Link>
            <Link
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-clinic-primary px-5 py-3 font-semibold text-white transition hover:bg-clinic-primaryDark"
              href={`/cases/${caseId}/export?type=${briefType}`}
            >
              <Download size={18} aria-hidden />
              Export
            </Link>
          </div>
        </aside>
      </div>
    </AppShell>
  );
}

function MetricCard({ label, value, detail }: { label: string; value: number; detail: string }) {
  return (
    <div className="rounded-md border border-clinic-line bg-white p-4 shadow-soft">
      <p className="text-sm font-semibold text-clinic-primary">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-clinic-ink">{value}</p>
      <p className="mt-1 text-sm text-clinic-muted">{detail}</p>
    </div>
  );
}

function DashboardPanel({
  icon: Icon,
  title,
  children
}: {
  icon: typeof FileText;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="grid gap-4 rounded-md border border-clinic-line bg-white p-5 shadow-soft">
      <h2 className="flex items-center gap-2 text-lg font-semibold text-clinic-ink">
        <Icon size={19} aria-hidden />
        {title}
      </h2>
      {children}
    </section>
  );
}

function WorkflowBadge({ state }: { state: string }) {
  const tone = state === "done" ? "success" : state === "ready" ? "primary" : state === "needs_input" ? "warning" : "neutral";
  return <Chip tone={tone}>{state.replace("_", " ")}</Chip>;
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return <p className="rounded-md border border-dashed border-clinic-line p-4 text-sm leading-6 text-clinic-muted">{children}</p>;
}
