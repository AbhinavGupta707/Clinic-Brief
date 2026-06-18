# ClinicBrief Agent Source Of Truth

## Hackathon Context

ClinicBrief is being built for **Mind the Product presents World Product Day: Everyone Ships Now**. The challenge is deliberately broad: ship a new working product, using whatever tools are fastest, with Novus installed before submission.

Submission-critical requirements:

- New working software application created during the hackathon window.
- Public deployed URL that judges can open and use.
- Demo video under 3 minutes.
- Screenshot proving Novus.ai is installed.
- Written description covering what was built, who it is for, tools used, and what was learned.
- English submission materials.

Judging is equally weighted:

- Product Thinking: clear user, problem, value.
- Craft and Execution: coherent end-to-end experience, considered UI/copy.
- Originality and Ambition: sharp, specific, memorable product.
- Shippedness: real deployed product with measurable behavior.

## Product Thesis

ClinicBrief helps a patient or carer tell a consistent health story across appointments by turning scattered documents, notes, medications, symptoms, and appointment context into an appointment-ready brief.

The winning demo should make a judge understand the pain in under 30 seconds:

> Patients often repeat their story to multiple clinicians, forget details under stress, and arrive without a clean timeline. ClinicBrief lets them tell the story once and bring the right version to every appointment.

## Non-Negotiable Product Boundaries

ClinicBrief is not a diagnostic or clinical-decision product.

Allowed:

- Organize user-provided information.
- Summarize and structure facts with source references.
- Ask missing-context questions for appointment preparation.
- Generate patient-reviewed appointment briefs.
- Rehearse how to explain a history to a clinician.

Not allowed:

- Diagnosis.
- Treatment recommendations.
- Medication start/stop/dose recommendations.
- Emergency triage.
- Risk scoring.
- NHS login, EHR integration, or clinician-grade claims.

Required disclaimer:

> ClinicBrief organizes information you provide so you can prepare for appointments. It does not diagnose, recommend treatment, or replace medical advice. Review everything before sharing it with a clinician.

## MVP User Promise

The demo user can:

1. Open a public URL.
2. Try a synthetic pre-op case without uploading real data.
3. See extracted facts with confidence and source provenance.
4. Correct or confirm facts.
5. Answer missing-context questions.
6. Generate a one-page pre-op/doctor-ready brief.
7. Generate a handoff card or 90-second story.
8. Practice an appointment intake conversation.
9. Export a readable PDF.
10. Delete case data.
11. See that Novus events are tracked without exposing health content.

## Architecture Target

- App: Next.js App Router, TypeScript, Tailwind, shadcn/ui.
- Data: Prisma schema compatible with Supabase Postgres.
- Storage: Supabase Storage-compatible private file abstraction.
- AI: Fireworks through `packages/ai/provider.ts`; strict JSON outputs validated with Zod; retry once on schema failure.
- Documents: PDF text extraction first; OCR optional; manual paste fallback required.
- Voice: optional browser Web Speech API; typed fallback required.
- Export: PDF export for brief and handoff; Markdown fallback if PDF fails.
- Analytics: Novus event wrapper with forbidden-property filtering.
- Deploy: Vercel public URL.

## Implementation Priorities

Priority 0: make the repo executable.

- Initialize Git if absent.
- Scaffold app/package structure.
- Add `package.json`, pnpm workspace, TypeScript, lint/typecheck scripts.
- Add environment template.
- Commit source-of-truth docs so every cold session receives the same context.

Priority 1: make the demo undeniable.

- Synthetic pre-op fixtures.
- Deterministic expected facts/timeline/brief fallback.
- `/demo/preop` route that works without external APIs.
- Polished happy path through review, brief, rehearsal, export.

Priority 2: make real upload credible.

- Consent gate.
- Upload/paste intake.
- PDF parse and source preview.
- Editable fact cards.
- Safe extraction API with Fireworks wrapper if keys exist.

Priority 3: make submission eligible.

- Novus installed and proof page.
- Public deploy.
- Demo video script.
- Privacy/delete flow.
- Final acceptance checklist.

## Parallel Workstream Order

1. Foundation and safety scaffold.
2. Fixtures and demo route.
3. Intake/document parsing.
4. AI extraction and fact review.
5. Timeline and brief generation.
6. Rehearsal and export.
7. Privacy, delete, Novus, and submission polish.

Parallelize only after foundation creates shared contracts. Merge in the order above unless the integration agent decides a smaller dependency order is safer.

## Verification Gates

Every workstream should attempt the relevant subset:

- `pnpm install`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`
- Demo smoke test: `/demo/preop` loads, generates or displays fixture-derived brief, exports or falls back cleanly.
- Safety smoke test: diagnostic/treatment prompts are refused or redirected.
- Analytics smoke test: event props contain counts/types only, no medical content.
- Delete smoke test: case rows/files are removed or marked deleted consistently.

## Merge Handoff Format

Each agent final handoff must include:

- Branch/worktree name.
- Owned files changed.
- What works.
- Commands run and results.
- Any skipped checks and why.
- Known risks.
- Suggested next merge order.

## Submission Assets Still Needed

- Public Vercel URL.
- Novus dashboard screenshot.
- 2-3 minute demo video.
- Devpost written description.
- Optional build-in-public post links.
