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
    <nav aria-label="Demo path" className="overflow-x-auto rounded-[1.25rem] border border-[#EFE2D2] bg-[#FFFDF8] p-2 shadow-[0_10px_28px_rgba(61,47,38,0.08)]">
      <ol className="flex min-w-max gap-2">
        {flowLinks.map((item) => {
          const Icon = item.icon;
          const active = item.label.toLowerCase() === current.toLowerCase();

          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`inline-flex min-h-11 items-center gap-2 rounded-full px-4 py-2 text-sm font-extrabold transition ${
                  active ? "bg-[#C8553D] text-white" : "text-[#5C4A3E] hover:bg-[#F2ECE0] hover:text-[#3D2F26]"
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
    neutral: "border-[#E4D8C8] bg-[#FFFDF8] text-[#8A7A6E]",
    primary: "border-[#F0C8BE] bg-[#F6DFD2] text-[#C8553D]",
    success: "border-[#D9E5CF] bg-[#EEF3E8] text-[#758A5F]",
    warning: "border-[#F0C8BE] bg-[#FFF0EA] text-[#B84B36]"
  };

  return <span className={`inline-flex min-h-8 items-center rounded-full border px-3 py-1 text-xs font-extrabold ${tones[tone]}`}>{children}</span>;
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
      {eyebrow ? <p className="text-sm font-extrabold uppercase tracking-[0.12em] text-[#C8553D]">{eyebrow}</p> : null}
      <h2 className="text-2xl font-semibold text-[#3D2F26]">{title}</h2>
      {body ? <p className="text-base font-medium leading-7 text-[#8A7A6E]">{body}</p> : null}
    </div>
  );
}

export function DocumentStack() {
  return (
    <div className="grid gap-3">
      {preopCase.documents.map((document, index) => (
        <article key={document.id} className="rounded-[1.25rem] border border-[#EFE2D2] bg-[#FFFDF8] p-4 shadow-[0_10px_28px_rgba(61,47,38,0.08)]">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex min-w-0 gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#F6DFD2] text-[#C8553D]">
                <FileText size={22} aria-hidden />
              </div>
              <div className="min-w-0">
                <h3 className="truncate font-semibold text-[#3D2F26]">{document.fileName.replace("synthetic-", "")}</h3>
                <p className="mt-1 text-sm font-medium leading-6 text-[#8A7A6E]">{document.rawText}</p>
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
    <article className="rounded-[1.25rem] border border-[#EFE2D2] bg-[#FFFDF8] p-4">
      <div className="flex flex-wrap items-center gap-2">
        <Chip tone={question.priority === "high" ? "warning" : "primary"}>{question.priority} priority</Chip>
        <Chip>Question {index}</Chip>
      </div>
      <h3 className="mt-3 font-semibold leading-6 text-[#3D2F26]">{question.question}</h3>
      {!compact ? <p className="mt-2 text-sm font-medium leading-6 text-[#8A7A6E]">{question.whyItMattersForAppointment}</p> : null}
    </article>
  );
}

export function ReviewFactCard({ fact }: { fact: ExtractedFact }) {
  const source = preopCase.documents.find((document) => document.id === fact.sourceDocId);
  const statusTone = fact.userStatus === "CONFIRMED" || fact.userStatus === "EDITED" ? "success" : "warning";

  return (
    <article className="grid gap-4 rounded-[1.25rem] border border-[#EFE2D2] bg-[#FFFDF8] p-4 shadow-[0_10px_28px_rgba(61,47,38,0.08)]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Chip tone="primary">{categoryLabels[fact.category]}</Chip>
          <Chip tone={statusTone}>{statusLabels[fact.userStatus]}</Chip>
          <Chip>{Math.round(fact.confidence * 100)}% confidence</Chip>
        </div>
        <div className="flex gap-2" aria-label={`Review actions for ${fact.displayText}`}>
          <button className="inline-flex min-h-11 items-center justify-center rounded-full border border-[#E4D8C8] bg-[#FFFDF8] px-3 text-[#5C4A3E] hover:bg-[#F2ECE0]" type="button" aria-label="Confirm fact">
            <Check size={17} aria-hidden />
          </button>
          <button className="inline-flex min-h-11 items-center justify-center rounded-full border border-[#E4D8C8] bg-[#FFFDF8] px-3 text-[#5C4A3E] hover:bg-[#F2ECE0]" type="button" aria-label="Edit fact">
            <Edit3 size={17} aria-hidden />
          </button>
          <button className="inline-flex min-h-11 items-center justify-center rounded-full border border-[#F0C8BE] bg-[#FFFDF8] px-3 text-[#B84B36] hover:bg-[#FFF6EF]" type="button" aria-label="Reject fact">
            <X size={17} aria-hidden />
          </button>
        </div>
      </div>

      <label className="grid gap-2">
        <span className="text-sm font-semibold text-[#3D2F26]">Editable fact</span>
        <textarea
          className="min-h-24 resize-none rounded-2xl border border-[#EFE2D2] bg-[#F8F1E7] p-3 text-sm leading-6 text-[#3D2F26]"
          defaultValue={fact.displayText}
          aria-label={`Editable text for ${fact.displayText}`}
        />
      </label>

      <div className="grid gap-2 rounded-2xl border border-[#EFE2D2] bg-[#F8F1E7] p-3 text-sm font-medium leading-6 text-[#8A7A6E]">
        <p>
          <span className="font-semibold text-[#3D2F26]">Source: </span>
          {source ? source.fileName.replace("synthetic-", "") : "Synthetic source"}
        </p>
        {fact.sourceQuote ? (
          <p>
            <span className="font-semibold text-[#3D2F26]">Snippet: </span>
            {fact.sourceQuote}
          </p>
        ) : null}
      </div>
    </article>
  );
}

export function TimelineRow({ event }: { event: TimelineEvent }) {
  return (
    <li className="grid gap-3 rounded-[1.25rem] border border-[#EFE2D2] bg-[#FFFDF8] p-4 shadow-[0_10px_28px_rgba(61,47,38,0.08)] md:grid-cols-[11rem_1fr]">
      <div>
        <p className="text-sm font-extrabold text-[#C8553D]">{event.approximateDate ?? event.date ?? "Date unknown"}</p>
        <Chip>{typeLabels[event.type]}</Chip>
      </div>
      <div>
        <h3 className="font-semibold text-[#3D2F26]">{event.title}</h3>
        <p className="mt-2 text-sm font-medium leading-6 text-[#8A7A6E]">{event.description}</p>
      </div>
    </li>
  );
}

export function BriefPreview() {
  const brief = preopCase.expectedBrief;

  return (
    <article className="grid gap-5 rounded-[1.25rem] border border-[#EFE2D2] bg-[#FFFDF8] p-5 shadow-[0_10px_28px_rgba(61,47,38,0.08)]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#EFE2D2] pb-4">
        <div>
          <p className="text-sm font-extrabold uppercase tracking-[0.08em] text-[#C8553D]">One-page brief</p>
          <h2 className="mt-1 text-2xl font-semibold text-[#3D2F26]">{brief.title}</h2>
        </div>
        <Chip tone="success">Patient-reviewed draft</Chip>
      </div>

      <p className="rounded-2xl bg-[#F8F1E7] p-3 text-base font-semibold leading-7 text-[#3D2F26]">{brief.oneLineReasonForVisit}</p>

      <div className="grid gap-4 lg:grid-cols-2">
        <BriefSection title="Key timeline">
          <ul className="grid gap-2">
            {brief.keyTimeline.map((item) => (
              <li key={`${item.dateLabel}-${item.event}`} className="grid grid-cols-[7.5rem_1fr] gap-3 text-sm leading-6">
                <span className="font-semibold text-[#C8553D]">{item.dateLabel}</span>
                <span className="text-[#8A7A6E]">{item.event}</span>
              </li>
            ))}
          </ul>
        </BriefSection>
        <BriefSection title="Medication list to review">
          <ul className="grid gap-2 text-sm font-medium leading-6 text-[#8A7A6E]">
            {brief.currentMedications.map((medication) => (
              <li key={medication.name}>
                <span className="font-semibold text-[#3D2F26]">{medication.name}</span>
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
    <section className="rounded-2xl border border-[#EFE2D2] p-4">
      <h3 className="font-semibold text-[#3D2F26]">{title}</h3>
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
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-5 py-3 font-extrabold transition ${
        secondary ? "border border-[#E4D8C8] bg-[#FFFDF8] text-[#5C4A3E] hover:bg-[#F2ECE0]" : "bg-[#9CAD86] text-white hover:bg-[#879974]"
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
      <section className="grid gap-4 rounded-[1.25rem] border border-[#EFE2D2] bg-[#FFFDF8] p-4 shadow-[0_10px_28px_rgba(61,47,38,0.08)]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#EFE2D2] pb-3">
          <div>
            <p className="text-sm font-extrabold uppercase tracking-[0.08em] text-[#C8553D]">Pre-op nurse rehearsal</p>
            <h2 className="mt-1 text-xl font-semibold text-[#3D2F26]">One safe preparation question at a time</h2>
          </div>
          <Chip tone="success">Fixture context only</Chip>
        </div>

        <div className="grid gap-3">
          <div className="max-w-[42rem] rounded-2xl bg-[#F8F1E7] p-4 text-sm font-medium leading-6 text-[#3D2F26]">
            I can help you practice explaining your notes. I will ask about missing appointment context only, and I cannot diagnose or recommend treatment.
          </div>
          <div className="ml-auto max-w-[42rem] rounded-2xl bg-[#C8553D] p-4 text-sm font-medium leading-6 text-white">
            Please ask me the first pre-op preparation question.
          </div>
          <div className="max-w-[42rem] rounded-2xl bg-[#F8F1E7] p-4 text-sm font-medium leading-6 text-[#3D2F26]">
            {firstQuestion.question}
            <p className="mt-2 text-[#8A7A6E]">{firstQuestion.whyItMattersForAppointment}</p>
          </div>
        </div>

        <label className="grid gap-2">
          <span className="text-sm font-semibold text-[#3D2F26]">Practice answer</span>
          <textarea
            className="min-h-28 resize-none rounded-2xl border border-[#EFE2D2] bg-[#FFFDF8] p-3 text-sm leading-6 text-[#3D2F26]"
            defaultValue="I am not fully sure how to describe the childhood rash, so I want to state it clearly and ask what the team needs recorded."
          />
        </label>

        <div className="flex flex-wrap gap-3">
          <button className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[#9CAD86] px-4 py-2 font-extrabold text-white hover:bg-[#879974]" type="button">
            <Check size={18} aria-hidden />
            Save to reviewed answers
          </button>
          <button className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-[#E4D8C8] bg-[#FFFDF8] px-4 py-2 font-extrabold text-[#5C4A3E] hover:bg-[#F2ECE0]" type="button">
            <Mic size={18} aria-hidden />
            Voice unavailable, use text
          </button>
        </div>
      </section>

      <aside className="grid content-start gap-3 rounded-[1.25rem] border border-[#EFE2D2] bg-[#FFFDF8] p-4 shadow-[0_10px_28px_rgba(61,47,38,0.08)]">
        <h3 className="font-semibold text-[#3D2F26]">Upcoming safe prompts</h3>
        {preopCase.expectedQuestions.slice(1, 4).map((question) => (
          <div key={question.id} className="rounded-2xl border border-[#EFE2D2] p-3 text-sm font-medium leading-6 text-[#8A7A6E]">
            <HelpCircle className="mb-2 text-[#C8553D]" size={18} aria-hidden />
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
      <section className="grid content-start gap-4 rounded-[1.25rem] border border-[#EFE2D2] bg-[#FFFDF8] p-5 shadow-[0_10px_28px_rgba(61,47,38,0.08)]">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F6DFD2] text-[#C8553D]">
          <Download size={24} aria-hidden />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-[#3D2F26]">Export fallback ready</h2>
          <p className="mt-2 text-sm font-medium leading-6 text-[#8A7A6E]">
            PDF generation can be wired later; the demo already offers a readable Markdown fallback using only the synthetic brief.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[#9CAD86] px-4 py-2 font-extrabold text-white hover:bg-[#879974]" type="button">
            <FileDown size={18} aria-hidden />
            Download PDF
          </button>
          <button className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-[#E4D8C8] bg-[#FFFDF8] px-4 py-2 font-extrabold text-[#5C4A3E] hover:bg-[#F2ECE0]" type="button">
            <ClipboardList size={18} aria-hidden />
            Copy Markdown
          </button>
        </div>
        <div className="grid gap-2 rounded-2xl border border-[#EFE2D2] bg-[#F8F1E7] p-3 text-sm font-medium leading-6 text-[#8A7A6E]">
          <p className="font-semibold text-[#3D2F26]">Included in export</p>
          <p>One-page brief, 90-second story, clinician questions, open uncertainties, and safety copy.</p>
        </div>
      </section>

      <label className="grid gap-2">
        <span className="text-sm font-semibold text-[#3D2F26]">Markdown fallback preview</span>
        <textarea className="min-h-[32rem] resize-none rounded-2xl border border-[#EFE2D2] bg-[#FFFDF8] p-4 font-mono text-sm leading-6 text-[#3D2F26] shadow-[0_10px_28px_rgba(61,47,38,0.08)]" defaultValue={markdown} />
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
          <article key={item.title} className="grid gap-3 rounded-[1.25rem] border border-[#EFE2D2] bg-[#FFFDF8] p-4 shadow-[0_10px_28px_rgba(61,47,38,0.08)]">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#F6DFD2] text-[#C8553D]">
              <Icon size={21} aria-hidden />
            </div>
            <div>
              <h3 className="font-semibold text-[#3D2F26]">{item.title}</h3>
              <p className="mt-1 text-sm font-medium leading-6 text-[#8A7A6E]">{item.body}</p>
            </div>
          </article>
        );
      })}
    </div>
  );
}
