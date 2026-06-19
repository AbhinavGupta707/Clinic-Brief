import Link from "next/link";
import type { ReactNode } from "react";
import {
  ArrowRight,
  Check,
  ClipboardList,
  Download,
  Edit3,
  FileCheck2,
  FileDown,
  FileText,
  HelpCircle,
  MessageSquareText,
  Mic,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  X
} from "lucide-react";
import { preopCase } from "@clinicbrief/fixtures";
import type { ExtractedFact, MissingQuestion, TimelineEvent } from "@clinicbrief/types";

const flowLinks = [
  { href: "/demo/preop", label: "Demo", icon: FileText },
  { href: "/cases/sample-preop/review", label: "Review", icon: ClipboardList },
  { href: "/cases/sample-preop/timeline", label: "Timeline", icon: RotateCcw },
  { href: "/cases/sample-preop/brief", label: "Brief", icon: FileCheck2 },
  { href: "/cases/sample-preop/rehearsal", label: "Rehearsal", icon: MessageSquareText },
  { href: "/cases/sample-preop/export", label: "Export", icon: FileDown }
];

const categoryLabels: Record<ExtractedFact["category"], string> = {
  ALLERGY: "Allergy",
  APPOINTMENT: "Appointment",
  CONTACT: "Contact",
  HISTORY_ITEM: "Reported history",
  MEDICATION: "Medication",
  PROCEDURE: "Procedure",
  QUESTION: "Question",
  SYMPTOM: "Symptom",
  TEST_RESULT: "Test or result"
};

const statusLabels: Record<ExtractedFact["userStatus"], string> = {
  CONFIRMED: "Confirmed",
  EDITED: "Edited by patient",
  REJECTED: "Rejected",
  UNREVIEWED: "Needs review"
};

const typeLabels: Record<TimelineEvent["type"], string> = {
  APPOINTMENT: "Appointment",
  MEDICATION_CHANGE: "Medication",
  NOTE: "Note",
  PROCEDURE: "Procedure",
  SYMPTOM_CHANGE: "Symptom",
  TEST: "Test"
};

export function DemoFlowNav({ current }: { current: string }) {
  return (
    <nav aria-label="Demo path" className="overflow-x-auto rounded-md border border-clinic-line bg-white p-2 shadow-soft">
      <ol className="flex min-w-max gap-2">
        {flowLinks.map((item) => {
          const Icon = item.icon;
          const active = item.label.toLowerCase() === current.toLowerCase();

          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`inline-flex min-h-11 items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold transition ${
                  active ? "bg-clinic-primary text-white" : "text-clinic-muted hover:bg-clinic-surface hover:text-clinic-ink"
                }`}
              >
                <Icon size={17} aria-hidden />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export function Chip({
  children,
  tone = "neutral"
}: {
  children: ReactNode;
  tone?: "neutral" | "success" | "warning" | "primary";
}) {
  const tones = {
    neutral: "border-cyan-100 bg-white text-clinic-muted",
    primary: "border-cyan-200 bg-clinic-surface text-clinic-primary",
    success: "border-emerald-100 bg-emerald-50 text-emerald-800",
    warning: "border-amber-200 bg-amber-50 text-amber-800"
  };

  return <span className={`inline-flex min-h-8 items-center rounded-md border px-2.5 py-1 text-xs font-semibold ${tones[tone]}`}>{children}</span>;
}

export function SectionHeader({
  eyebrow,
  title,
  body
}: {
  eyebrow?: string;
  title: string;
  body?: string;
}) {
  return (
    <div className="grid max-w-3xl gap-2">
      {eyebrow ? <p className="text-sm font-semibold uppercase tracking-[0.08em] text-clinic-primary">{eyebrow}</p> : null}
      <h2 className="text-2xl font-semibold text-clinic-ink">{title}</h2>
      {body ? <p className="text-base leading-7 text-clinic-muted">{body}</p> : null}
    </div>
  );
}

export function DocumentStack() {
  return (
    <div className="grid gap-3">
      {preopCase.documents.map((document, index) => (
        <article key={document.id} className="rounded-md border border-clinic-line bg-white p-4 shadow-soft">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex min-w-0 gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-clinic-surface text-clinic-primary">
                <FileText size={22} aria-hidden />
              </div>
              <div className="min-w-0">
                <h3 className="truncate font-semibold text-clinic-ink">{document.fileName.replace("synthetic-", "")}</h3>
                <p className="mt-1 text-sm leading-6 text-clinic-muted">{document.rawText}</p>
              </div>
            </div>
            <Chip tone={index < 3 ? "primary" : "neutral"}>{document.type}</Chip>
          </div>
        </article>
      ))}
    </div>
  );
}

export function MissingQuestionList({ compact = false }: { compact?: boolean }) {
  return (
    <div className="grid gap-3">
      {preopCase.expectedQuestions.map((question, index) => (
        <QuestionCard key={question.id} question={question} index={index + 1} compact={compact} />
      ))}
    </div>
  );
}

function QuestionCard({
  question,
  index,
  compact
}: {
  question: MissingQuestion;
  index: number;
  compact?: boolean;
}) {
  return (
    <article className="rounded-md border border-clinic-line bg-white p-4">
      <div className="flex flex-wrap items-center gap-2">
        <Chip tone={question.priority === "high" ? "warning" : "primary"}>{question.priority} priority</Chip>
        <Chip>Question {index}</Chip>
      </div>
      <h3 className="mt-3 font-semibold leading-6 text-clinic-ink">{question.question}</h3>
      {!compact ? <p className="mt-2 text-sm leading-6 text-clinic-muted">{question.whyItMattersForAppointment}</p> : null}
    </article>
  );
}

export function ReviewFactCard({ fact }: { fact: ExtractedFact }) {
  const source = preopCase.documents.find((document) => document.id === fact.sourceDocId);
  const statusTone = fact.userStatus === "CONFIRMED" || fact.userStatus === "EDITED" ? "success" : "warning";

  return (
    <article className="grid gap-4 rounded-md border border-clinic-line bg-white p-4 shadow-soft">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Chip tone="primary">{categoryLabels[fact.category]}</Chip>
          <Chip tone={statusTone}>{statusLabels[fact.userStatus]}</Chip>
          <Chip>{Math.round(fact.confidence * 100)}% confidence</Chip>
        </div>
        <div className="flex gap-2" aria-label={`Review actions for ${fact.displayText}`}>
          <button className="inline-flex min-h-11 items-center justify-center rounded-md border border-clinic-line bg-white px-3 text-clinic-muted hover:bg-clinic-surface" type="button" aria-label="Confirm fact">
            <Check size={17} aria-hidden />
          </button>
          <button className="inline-flex min-h-11 items-center justify-center rounded-md border border-clinic-line bg-white px-3 text-clinic-muted hover:bg-clinic-surface" type="button" aria-label="Edit fact">
            <Edit3 size={17} aria-hidden />
          </button>
          <button className="inline-flex min-h-11 items-center justify-center rounded-md border border-clinic-line bg-white px-3 text-clinic-muted hover:bg-clinic-surface" type="button" aria-label="Reject fact">
            <X size={17} aria-hidden />
          </button>
        </div>
      </div>

      <label className="grid gap-2">
        <span className="text-sm font-semibold text-clinic-ink">Editable fact</span>
        <textarea
          className="min-h-24 resize-none rounded-md border border-cyan-100 bg-clinic-surface p-3 text-sm leading-6 text-clinic-ink"
          defaultValue={fact.displayText}
          aria-label={`Editable text for ${fact.displayText}`}
        />
      </label>

      <div className="grid gap-2 rounded-md border border-cyan-100 bg-cyan-50/60 p-3 text-sm leading-6 text-clinic-muted">
        <p>
          <span className="font-semibold text-clinic-ink">Source: </span>
          {source ? source.fileName.replace("synthetic-", "") : "Synthetic source"}
        </p>
        {fact.sourceQuote ? (
          <p>
            <span className="font-semibold text-clinic-ink">Snippet: </span>
            {fact.sourceQuote}
          </p>
        ) : null}
      </div>
    </article>
  );
}

export function TimelineRow({ event }: { event: TimelineEvent }) {
  return (
    <li className="grid gap-3 rounded-md border border-clinic-line bg-white p-4 shadow-soft md:grid-cols-[11rem_1fr]">
      <div>
        <p className="text-sm font-semibold text-clinic-primary">{event.approximateDate ?? event.date ?? "Date unknown"}</p>
        <Chip>{typeLabels[event.type]}</Chip>
      </div>
      <div>
        <h3 className="font-semibold text-clinic-ink">{event.title}</h3>
        <p className="mt-2 text-sm leading-6 text-clinic-muted">{event.description}</p>
      </div>
    </li>
  );
}

export function BriefPreview() {
  const brief = preopCase.expectedBrief;

  return (
    <article className="grid gap-5 rounded-md border border-clinic-line bg-white p-5 shadow-soft">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-cyan-100 pb-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.08em] text-clinic-primary">One-page brief</p>
          <h2 className="mt-1 text-2xl font-semibold text-clinic-ink">{brief.title}</h2>
        </div>
        <Chip tone="success">Patient-reviewed draft</Chip>
      </div>

      <p className="rounded-md bg-clinic-surface p-3 text-base font-semibold leading-7 text-clinic-ink">{brief.oneLineReasonForVisit}</p>

      <div className="grid gap-4 lg:grid-cols-2">
        <BriefSection title="Key timeline">
          <ul className="grid gap-2">
            {brief.keyTimeline.map((item) => (
              <li key={`${item.dateLabel}-${item.event}`} className="grid grid-cols-[7.5rem_1fr] gap-3 text-sm leading-6">
                <span className="font-semibold text-clinic-primary">{item.dateLabel}</span>
                <span className="text-clinic-muted">{item.event}</span>
              </li>
            ))}
          </ul>
        </BriefSection>
        <BriefSection title="Medication list to review">
          <ul className="grid gap-2 text-sm leading-6 text-clinic-muted">
            {brief.currentMedications.map((medication) => (
              <li key={medication.name}>
                <span className="font-semibold text-clinic-ink">{medication.name}</span>
                {medication.frequency ? `, ${medication.frequency}` : ""}
                {medication.notes ? ` - ${medication.notes}` : ""}
              </li>
            ))}
          </ul>
        </BriefSection>
      </div>
    </article>
  );
}

export function BriefSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-md border border-cyan-100 p-4">
      <h3 className="font-semibold text-clinic-ink">{title}</h3>
      <div className="mt-3">{children}</div>
    </section>
  );
}

export function DemoCta({
  href,
  children,
  secondary = false
}: {
  href: string;
  children: ReactNode;
  secondary?: boolean;
}) {
  return (
    <Link
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-md px-5 py-3 font-semibold transition ${
        secondary ? "border border-clinic-line bg-white text-clinic-ink hover:bg-cyan-50" : "bg-clinic-success text-white hover:bg-emerald-700"
      }`}
      href={href}
    >
      {children}
      <ArrowRight size={18} aria-hidden />
    </Link>
  );
}

export function RehearsalPanel() {
  const firstQuestion = preopCase.expectedQuestions[0];

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_22rem]">
      <section className="grid gap-4 rounded-md border border-clinic-line bg-white p-4 shadow-soft">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-cyan-100 pb-3">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.08em] text-clinic-primary">Pre-op nurse rehearsal</p>
            <h2 className="mt-1 text-xl font-semibold text-clinic-ink">One safe preparation question at a time</h2>
          </div>
          <Chip tone="success">Fixture context only</Chip>
        </div>

        <div className="grid gap-3">
          <div className="max-w-[42rem] rounded-md bg-clinic-surface p-4 text-sm leading-6 text-clinic-ink">
            I can help you practice explaining your notes. I will ask about missing appointment context only, and I cannot diagnose or recommend treatment.
          </div>
          <div className="ml-auto max-w-[42rem] rounded-md bg-clinic-primary p-4 text-sm leading-6 text-white">
            Please ask me the first pre-op preparation question.
          </div>
          <div className="max-w-[42rem] rounded-md bg-clinic-surface p-4 text-sm leading-6 text-clinic-ink">
            {firstQuestion.question}
            <p className="mt-2 text-clinic-muted">{firstQuestion.whyItMattersForAppointment}</p>
          </div>
        </div>

        <label className="grid gap-2">
          <span className="text-sm font-semibold text-clinic-ink">Practice answer</span>
          <textarea
            className="min-h-28 resize-none rounded-md border border-cyan-100 bg-white p-3 text-sm leading-6 text-clinic-ink"
            defaultValue="I am not fully sure how to describe the childhood rash, so I want to state it clearly and ask what the team needs recorded."
          />
        </label>

        <div className="flex flex-wrap gap-3">
          <button className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-clinic-success px-4 py-2 font-semibold text-white hover:bg-emerald-700" type="button">
            <Check size={18} aria-hidden />
            Save to reviewed answers
          </button>
          <button className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-clinic-line bg-white px-4 py-2 font-semibold text-clinic-ink hover:bg-cyan-50" type="button">
            <Mic size={18} aria-hidden />
            Voice unavailable, use text
          </button>
        </div>
      </section>

      <aside className="grid content-start gap-3 rounded-md border border-clinic-line bg-white p-4 shadow-soft">
        <h3 className="font-semibold text-clinic-ink">Upcoming safe prompts</h3>
        {preopCase.expectedQuestions.slice(1, 4).map((question) => (
          <div key={question.id} className="rounded-md border border-cyan-100 p-3 text-sm leading-6 text-clinic-muted">
            <HelpCircle className="mb-2 text-clinic-primary" size={18} aria-hidden />
            {question.question}
          </div>
        ))}
      </aside>
    </div>
  );
}

export function ExportFallbackPanel() {
  const brief = preopCase.expectedBrief;
  const markdown = [
    `# ${brief.title}`,
    "",
    brief.oneLineReasonForVisit,
    "",
    "## 90-second story",
    brief.ninetySecondStory,
    "",
    "## Questions for clinician",
    ...brief.questionsForClinician.map((question) => `- ${question}`),
    "",
    "## Open uncertainties",
    ...brief.openUncertainties.map((item) => `- ${item}`),
    "",
    brief.safetyDisclaimer
  ].join("\n");

  return (
    <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
      <section className="grid content-start gap-4 rounded-md border border-clinic-line bg-white p-5 shadow-soft">
        <div className="flex h-12 w-12 items-center justify-center rounded-md bg-clinic-surface text-clinic-primary">
          <Download size={24} aria-hidden />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-clinic-ink">Export fallback ready</h2>
          <p className="mt-2 text-sm leading-6 text-clinic-muted">
            PDF generation can be wired later; the demo already offers a readable Markdown fallback using only the synthetic brief.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-clinic-success px-4 py-2 font-semibold text-white hover:bg-emerald-700" type="button">
            <FileDown size={18} aria-hidden />
            Download PDF
          </button>
          <button className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-clinic-line bg-white px-4 py-2 font-semibold text-clinic-ink hover:bg-cyan-50" type="button">
            <ClipboardList size={18} aria-hidden />
            Copy Markdown
          </button>
        </div>
        <div className="grid gap-2 rounded-md border border-cyan-100 bg-clinic-surface p-3 text-sm leading-6 text-clinic-muted">
          <p className="font-semibold text-clinic-ink">Included in export</p>
          <p>One-page brief, 90-second story, clinician questions, open uncertainties, and safety copy.</p>
        </div>
      </section>

      <label className="grid gap-2">
        <span className="text-sm font-semibold text-clinic-ink">Markdown fallback preview</span>
        <textarea className="min-h-[32rem] resize-none rounded-md border border-clinic-line bg-white p-4 font-mono text-sm leading-6 text-clinic-ink shadow-soft" defaultValue={markdown} />
      </label>
    </div>
  );
}

export function TrustStrip() {
  return (
    <div className="grid gap-3 md:grid-cols-3">
      {[
        { icon: ShieldCheck, title: "Synthetic data only", body: "The judge path never asks for real patient details." },
        { icon: Sparkles, title: "Deterministic fallback", body: "No Fireworks, Supabase, or parsing service is needed for the demo." },
        { icon: Stethoscope, title: "Preparation boundary", body: "The product organizes facts and questions without medical advice." }
      ].map((item) => {
        const Icon = item.icon;

        return (
          <article key={item.title} className="grid gap-3 rounded-md border border-clinic-line bg-white p-4 shadow-soft">
            <div className="flex h-11 w-11 items-center justify-center rounded-md bg-clinic-surface text-clinic-primary">
              <Icon size={21} aria-hidden />
            </div>
            <div>
              <h3 className="font-semibold text-clinic-ink">{item.title}</h3>
              <p className="mt-1 text-sm leading-6 text-clinic-muted">{item.body}</p>
            </div>
          </article>
        );
      })}
    </div>
  );
}
