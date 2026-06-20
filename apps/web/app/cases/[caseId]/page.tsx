import Link from "next/link";
import { ArrowRight, CalendarDays, ChevronDown, ClipboardList, Download, FileText, HelpCircle, MessageSquareText, RotateCcw, Settings, ShieldCheck } from "lucide-react";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
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
    <main className="min-h-screen overflow-x-hidden bg-[#F8F1E7] text-[#3D2F26]">
      <div className="mx-auto grid w-full max-w-6xl gap-5 px-4 py-4 sm:py-6">
        <nav aria-label="Primary" className="flex min-h-11 items-center justify-between">
          <Link className="rounded-full px-3 py-2 text-lg font-extrabold text-[#3D2F26] hover:bg-[#FFFDF8]" href="/">
            ClinicBrief
          </Link>
          <div className="flex items-center gap-2 text-sm font-bold">
            <Link className="rounded-full px-3 py-2 text-[#5C4A3E] hover:bg-[#FFFDF8]" href="/cases/new">
              New
            </Link>
            <Link className="rounded-full px-3 py-2 text-[#5C4A3E] hover:bg-[#FFFDF8]" href="/privacy">
              Privacy
            </Link>
          </div>
        </nav>

        <section className="mx-auto grid w-full max-w-[46rem] gap-3 text-center">
          <p className="text-sm font-extrabold uppercase tracking-[0.12em] text-[#C8553D]">{isDemoCase ? "Synthetic outcome hub" : "Outcome hub"}</p>
          <h1 className="text-4xl font-semibold leading-tight sm:text-5xl">{record.title}</h1>
          <p className="mx-auto max-w-[38rem] text-base font-medium leading-7 text-[#8A7A6E]">Choose what you want to use next. Your appointment pack stays under your control.</p>
        </section>

      <section className="grid min-w-0 gap-5 rounded-[1.4rem] border border-[#EFE2D2] bg-[#FFFDF8] p-5 shadow-[0_14px_38px_rgba(61,47,38,0.10)]">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
          <div className="grid gap-3">
            <div className="flex flex-wrap gap-2">
              <Chip tone="primary">{record.mode.toLowerCase()} case</Chip>
              <Chip tone={record.status === "DELETED" ? "warning" : "success"}>{record.status.toLowerCase().replace("_", " ")}</Chip>
              <Chip>{dashboard.counts.sourcePreviews || dashboard.counts.documents} sources</Chip>
            </div>
            <h2 className="max-w-3xl text-2xl font-semibold text-[#3D2F26]">Choose what you want to use next</h2>
            <p className="max-w-3xl text-base font-medium leading-7 text-[#8A7A6E]">
              Your appointment pack stays under your control. Review key points first, then open the brief, timeline, questions, practice, or export when you are ready.
            </p>
          </div>
          <Link className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[#C8553D] px-5 py-3 font-extrabold text-white transition hover:bg-[#B84B36]" href={dashboard.nextAction.href}>
            {dashboard.nextAction.label}
            <ArrowRight size={18} aria-hidden />
          </Link>
        </div>
        <p className="rounded-2xl border border-[#EFE2D2] bg-[#F8F1E7] p-3 text-sm font-medium leading-6 text-[#8A7A6E]">{dashboard.nextAction.reason}</p>
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

      <section className="grid gap-4 rounded-[1.25rem] border border-[#EFE2D2] bg-[#FFFDF8] p-5 shadow-[0_10px_28px_rgba(61,47,38,0.08)]">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-[#3D2F26]">
          <ShieldCheck size={19} aria-hidden />
          Preparation only
        </h2>
        <p className="text-sm font-medium leading-6 text-[#8A7A6E]">
          ClinicBrief organizes information you provide so you can prepare for appointments. It does not diagnose, recommend treatment, or replace medical advice. Review everything before sharing it with a clinician.
        </p>
      </section>

      {chronicDashboard ? (
        <details className="group min-w-0 rounded-[1.25rem] border border-[#EFE2D2] bg-[#FFFDF8] p-5 shadow-[0_10px_28px_rgba(61,47,38,0.08)]">
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

      <details className="group min-w-0 rounded-[1.25rem] border border-[#EFE2D2] bg-[#FFFDF8] p-5 shadow-[0_10px_28px_rgba(61,47,38,0.08)]">
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
        <Link className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[#E4D8C8] bg-[#FFFDF8] px-5 py-3 font-extrabold text-[#5C4A3E] hover:bg-[#F2ECE0]" href={`/cases/${caseId}/settings`}>
          <Settings size={18} aria-hidden />
          Settings and delete
        </Link>
        <Link className="inline-flex min-h-11 items-center rounded-full border border-[#E4D8C8] bg-[#FFFDF8] px-5 py-3 font-extrabold text-[#5C4A3E] hover:bg-[#F2ECE0]" href="/privacy">
          Privacy
        </Link>
      </div>
      </div>
    </main>
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
  const iconClassName = tone === "success" ? "bg-[#EEF3E8] text-[#758A5F]" : tone === "primary" ? "bg-[#F6DFD2] text-[#C8553D]" : "bg-[#FFFDF8] text-[#C8553D]";

  return (
    <Link className="grid min-h-48 content-start gap-4 rounded-[1.25rem] border border-[#EFE2D2] bg-[#FFFDF8] p-5 shadow-[0_10px_28px_rgba(61,47,38,0.08)] transition hover:-translate-y-0.5 hover:border-[#C8553D] hover:bg-[#FFF8F2]" href={href}>
      <span className={`flex h-12 w-12 items-center justify-center rounded-2xl ${iconClassName}`}>
        <Icon size={24} aria-hidden />
      </span>
      <span className="text-xl font-semibold text-[#3D2F26]">{title}</span>
      <span className="text-sm font-medium leading-6 text-[#8A7A6E]">{body}</span>
      <span className="mt-auto inline-flex items-center gap-2 text-sm font-extrabold text-[#C8553D]">
        Open
        <ArrowRight size={16} aria-hidden />
      </span>
    </Link>
  );
}

function Chip({ children, tone = "neutral" }: { children: ReactNode; tone?: "primary" | "success" | "warning" | "neutral" }) {
  const className = {
    primary: "border-[#F0C8BE] bg-[#F6DFD2] text-[#C8553D]",
    success: "border-[#D9E5CF] bg-[#EEF3E8] text-[#758A5F]",
    warning: "border-[#F0C8BE] bg-[#FFF0EA] text-[#B84B36]",
    neutral: "border-[#E4D8C8] bg-[#FFFDF8] text-[#8A7A6E]"
  }[tone];

  return <span className={`rounded-full border px-3 py-1 text-xs font-extrabold uppercase tracking-[0.06em] ${className}`}>{children}</span>;
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
