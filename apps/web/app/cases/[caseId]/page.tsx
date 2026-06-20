import Link from "next/link";
import { ArrowRight, CalendarDays, ChevronDown, ClipboardList, Download, FileText, HelpCircle, MessageSquareText, RotateCcw, Settings, ShieldCheck } from "lucide-react";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { AppShell } from "../../../components/app-shell";
import { Chip, DemoFlowNav } from "../../../components/demo/demo-case-components";
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
    <AppShell eyebrow={isDemoCase ? "Synthetic outcome hub" : "Outcome hub"} title={record.title}>
      {isDemoCase ? <DemoFlowNav current="Dashboard" /> : null}

      <section className="grid gap-5 rounded-md border border-clinic-line bg-white p-5 shadow-soft">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
          <div className="grid gap-3">
            <div className="flex flex-wrap gap-2">
              <Chip tone="primary">{record.mode.toLowerCase()} case</Chip>
              <Chip tone={record.status === "DELETED" ? "warning" : "success"}>{record.status.toLowerCase().replace("_", " ")}</Chip>
              <Chip>{dashboard.counts.sourcePreviews || dashboard.counts.documents} sources</Chip>
            </div>
            <h2 className="max-w-3xl text-2xl font-semibold text-clinic-ink">Choose what you want to use next</h2>
            <p className="max-w-3xl text-base leading-7 text-clinic-muted">
              Your appointment pack stays under your control. Review key points first, then open the brief, timeline, questions, practice, or export when you are ready.
            </p>
          </div>
          <Link className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-clinic-success px-5 py-3 font-semibold text-white transition hover:bg-emerald-700" href={dashboard.nextAction.href}>
            {dashboard.nextAction.label}
            <ArrowRight size={18} aria-hidden />
          </Link>
        </div>
        <p className="rounded-md border border-cyan-100 bg-clinic-surface p-3 text-sm leading-6 text-clinic-muted">{dashboard.nextAction.reason}</p>
      </section>

      <section aria-label="Outcome actions" className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <OutcomeCard
          body={latestBrief ? "Open the reviewed appointment-ready summary." : "Generate this after confirming key points."}
          href={`/cases/${caseId}/brief?type=${briefType}`}
          icon={FileText}
          title="Appointment Brief"
          tone="primary"
        />
        <OutcomeCard body={`${timeline.length} timeline item${timeline.length === 1 ? "" : "s"} organized from reviewed facts.`} href={`/cases/${caseId}/timeline`} icon={CalendarDays} title="Timeline" />
        <OutcomeCard body={`${dashboard.openQuestions.length} preparation prompt${dashboard.openQuestions.length === 1 ? "" : "s"} to consider before the visit.`} href={`/cases/${caseId}/brief?type=${briefType}#questions`} icon={HelpCircle} title="Questions to Ask" />
        <OutcomeCard body="Practice explaining the story one appointment-prep question at a time." href={`/cases/${caseId}/rehearsal?type=${briefType}`} icon={MessageSquareText} title="Practice the Appointment" />
        <OutcomeCard body="Download, copy, print, or use the fallback export once you have reviewed the content." href={`/cases/${caseId}/export?type=${briefType}`} icon={Download} title="Export / Share" tone="success" />
        <OutcomeCard body="Confirm, edit, or hide extracted key points before they shape outputs." href={`/cases/${caseId}/review`} icon={ClipboardList} title="Review Key Points" />
      </section>

      <section className="grid gap-4 rounded-md border border-clinic-line bg-white p-5 shadow-soft">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-clinic-ink">
          <ShieldCheck size={19} aria-hidden />
          Preparation only
        </h2>
        <p className="text-sm leading-6 text-clinic-muted">
          ClinicBrief organizes information you provide so you can prepare for appointments. It does not diagnose, recommend treatment, or replace medical advice. Review everything before sharing it with a clinician.
        </p>
      </section>

      {chronicDashboard ? (
        <details className="group rounded-md border border-clinic-line bg-white p-5 shadow-soft">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-clinic-ink">Longitudinal summary</h2>
              <p className="mt-1 text-sm leading-6 text-clinic-muted">Collapsed by default for chronic cases. Open when you want the ongoing-history view.</p>
            </div>
            <ChevronDown aria-hidden className="h-5 w-5 text-clinic-muted transition group-open:rotate-180" />
          </summary>
          <div className="mt-5 grid gap-4">
            <div className="rounded-md border border-cyan-100 bg-clinic-surface p-4">
              <div className="flex flex-wrap gap-2">
                <Chip tone={chronicDashboard.readyForBrief.ready ? "success" : "warning"}>{chronicDashboard.readyForBrief.ready ? "ready for brief" : "review needed"}</Chip>
                <Chip>{chronicDashboard.readyForBrief.reviewedFactCount} reviewed facts</Chip>
              </div>
              <p className="mt-3 text-sm leading-6 text-clinic-muted">{chronicDashboard.readyForBrief.reason}</p>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {chronicDashboard.sections.map((section) => (
                <article className="rounded-md border border-cyan-100 p-4" key={section.id}>
                  <h3 className="font-semibold text-clinic-ink">{section.title}</h3>
                  {section.items.length > 0 ? (
                    <ul className="mt-3 grid gap-2">
                      {section.items.map((item) => (
                        <li className="rounded-md bg-clinic-surface p-3 text-sm leading-6 text-clinic-muted" key={item.id}>
                          {item.text}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-3 text-sm leading-6 text-clinic-muted">Reviewed facts for this section will appear here.</p>
                  )}
                </article>
              ))}
            </div>
          </div>
        </details>
      ) : null}

      <details className="group rounded-md border border-clinic-line bg-white p-5 shadow-soft">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-clinic-ink">Preparation details</h2>
            <p className="mt-1 text-sm leading-6 text-clinic-muted">Status, source coverage, top points, and open questions are here when you need them.</p>
          </div>
          <ChevronDown aria-hidden className="h-5 w-5 text-clinic-muted transition group-open:rotate-180" />
        </summary>
        <div className="mt-5 grid gap-5">
          <div className="grid gap-3 md:grid-cols-3">
            <MetricCard label="Facts" value={dashboard.counts.facts} detail={`${dashboard.counts.factsNeedingReview} need review`} />
            <MetricCard label="Open questions" value={dashboard.counts.openQuestions} detail="For appointment prep" />
            <MetricCard label="Briefs" value={dashboard.counts.briefs} detail={latestBrief ? "Draft available" : "Ready after review"} />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <DetailPanel icon={ClipboardList} title="Top points to raise">
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
            </DetailPanel>

            <DetailPanel icon={RotateCcw} title="What changed since last appointment">
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
            </DetailPanel>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <DetailPanel icon={HelpCircle} title="Open questions">
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
            </DetailPanel>

            <DetailPanel icon={FileText} title="Source coverage">
              <ul className="grid gap-3">
                {dashboard.sourceCoverage.map((item) => (
                  <li key={`${item.section}-${item.sourceCount}`} className="flex items-start justify-between gap-3 rounded-md border border-cyan-100 p-3 text-sm">
                    <span className="font-semibold text-clinic-ink">{item.section}</span>
                    <Chip tone={item.weakOrMissingEvidence ? "warning" : "success"}>{item.sourceCount} sources</Chip>
                  </li>
                ))}
              </ul>
            </DetailPanel>
          </div>
        </div>
      </details>

      <div className="flex flex-wrap gap-3">
        <Link className="inline-flex min-h-11 items-center gap-2 rounded-md border border-clinic-line bg-white px-5 py-3 font-semibold text-clinic-ink hover:bg-cyan-50" href={`/cases/${caseId}/settings`}>
          <Settings size={18} aria-hidden />
          Settings and delete
        </Link>
        <Link className="inline-flex min-h-11 items-center rounded-md border border-clinic-line bg-white px-5 py-3 font-semibold text-clinic-ink hover:bg-cyan-50" href="/privacy">
          Privacy
        </Link>
      </div>
    </AppShell>
  );
}

function OutcomeCard({
  body,
  href,
  icon: Icon,
  title,
  tone = "neutral"
}: {
  body: string;
  href: string;
  icon: typeof FileText;
  title: string;
  tone?: "primary" | "success" | "neutral";
}) {
  const iconClassName = tone === "success" ? "bg-emerald-50 text-emerald-700" : tone === "primary" ? "bg-clinic-surface text-clinic-primary" : "bg-white text-clinic-primary";

  return (
    <Link className="grid min-h-48 content-start gap-4 rounded-md border border-clinic-line bg-white p-5 shadow-soft transition hover:-translate-y-0.5 hover:border-clinic-primary hover:bg-cyan-50" href={href}>
      <span className={`flex h-12 w-12 items-center justify-center rounded-md ${iconClassName}`}>
        <Icon size={24} aria-hidden />
      </span>
      <span className="text-xl font-semibold text-clinic-ink">{title}</span>
      <span className="text-sm leading-6 text-clinic-muted">{body}</span>
      <span className="mt-auto inline-flex items-center gap-2 text-sm font-semibold text-clinic-primary">
        Open
        <ArrowRight size={16} aria-hidden />
      </span>
    </Link>
  );
}

function MetricCard({ label, value, detail }: { label: string; value: number; detail: string }) {
  return (
    <div className="rounded-md border border-clinic-line bg-white p-4">
      <p className="text-sm font-semibold text-clinic-primary">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-clinic-ink">{value}</p>
      <p className="mt-1 text-sm text-clinic-muted">{detail}</p>
    </div>
  );
}

function DetailPanel({ icon: Icon, title, children }: { icon: typeof FileText; title: string; children: ReactNode }) {
  return (
    <section className="grid content-start gap-4 rounded-md border border-cyan-100 p-4">
      <h3 className="flex items-center gap-2 text-base font-semibold text-clinic-ink">
        <Icon size={18} aria-hidden />
        {title}
      </h3>
      {children}
    </section>
  );
}

function EmptyState({ children }: { children: ReactNode }) {
  return <p className="rounded-md border border-dashed border-clinic-line p-4 text-sm leading-6 text-clinic-muted">{children}</p>;
}
