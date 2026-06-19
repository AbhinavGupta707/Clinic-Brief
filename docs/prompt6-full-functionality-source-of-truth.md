# Prompt 6 Full Functionality Source Of Truth

Use this document as the local operating guide for the single large Prompt 6 session. Re-read it at the start of the run and after every checkpoint.

## Current Verified Baseline

Prompt 5 branch:

- Branch: `agent/product-data-foundation`
- Worktree: `.worktrees/product-data-foundation`
- Foundation commit: `81f94ec Add product data repository foundation`

Prompt 5 verified:

- `pnpm typecheck`
- `pnpm lint`
- `pnpm test`
- `pnpm build`
- website quality audit with `P0=0 P1=0 P2=0`

Prompt 5 added:

- Stable server repository boundary: `apps/web/lib/server/clinic-repository`.
- Memory backend default.
- Prisma/Supabase-shaped backend opt-in with `CLINICBRIEF_DATA_BACKEND=prisma`.
- Expanded shared domain/API types.
- Prisma schema additions for source previews, missing questions, fact display text, and source quotes.
- Repository tests.

## Strategic Choice

Prompt 6 should be one sequential goal session, not parallel branches, because the remaining features all depend on the same data contracts:

- document storage and parsing affects extraction;
- extraction affects review, timeline, brief, and rehearsal;
- review state affects timeline and brief correctness;
- export should reflect persisted brief state.

Parallel work would be faster but more conflict-prone. One long session is safer if it commits at checkpoints and keeps this document updated.

## Branch Rule

The Prompt 6 agent must work in an isolated worktree.

Preferred:

```bash
git worktree add -b agent/full-functionality-sequential .worktrees/full-functionality-sequential agent/product-data-foundation
```

If `agent/product-data-foundation` has already been merged into `main`, base from `main` instead:

```bash
git worktree add -b agent/full-functionality-sequential .worktrees/full-functionality-sequential main
```

Do not edit other worktrees.

## Non-Negotiable Product Boundaries

ClinicBrief organizes user-provided information for appointment preparation only.

Never add:

- diagnosis;
- treatment recommendations;
- medication start/stop/dose advice;
- emergency triage;
- clinical risk scoring;
- NHS/EHR integration claims;
- analytics containing raw health content.

Required safety copy must remain visible on landing, consent, brief/export, and relevant unsafe-response surfaces:

> ClinicBrief organizes information you provide so you can prepare for appointments. It does not diagnose, recommend treatment, or replace medical advice. Review everything before sharing it with a clinician.

## Checkpoint 0 - Orientation And Baseline

Read:

- `AGENTS.md`
- `clinicbrief_agent_source_of_truth.md`
- `clinicbrief_build_ready_spec.md`
- `docs/ui-design-brief.md`
- `docs/final-integration-handoff.md`
- `docs/product-data-foundation.md`
- this file

Verify:

- branch/worktree is isolated;
- synthetic demo still loads;
- repository default backend is memory unless explicitly configured.

Run:

```bash
pnpm typecheck
pnpm test
```

Commit only if setup changes were needed.

## Checkpoint 1 - Documents And Storage

Goal:

Make document intake credible for real user uploads while keeping manual fallback.

Implement:

- real PDF text extraction if feasible with current dependencies;
- robust text-note parsing and source snippets;
- storage adapter boundary for private files;
- local/no-credential storage fallback;
- persisted document metadata through the repository;
- persisted source previews through the repository;
- clear parser/manual-fallback states in UI;
- structured manual medication and symptom entry only if it fits without destabilizing the flow.

Do not block on OCR. Images may remain honest manual-fallback if OCR adds too much risk.

Checkpoint tests:

```bash
pnpm --filter @clinicbrief/documents test
pnpm --filter @clinicbrief/web test
pnpm typecheck
```

Manual/API smoke:

- create case;
- add text note;
- add PDF or PDF fallback;
- list documents/source previews;
- delete case.

Commit message suggestion:

```text
Productize document intake and storage boundary
```

## Checkpoint 2 - Fireworks Extraction And Review

Goal:

Use parsed source text to create persisted facts and missing questions through Fireworks when configured, with fixture fallback when not configured.

Implement:

- all AI calls through `packages/ai/provider.ts`;
- strict Zod validation and retry-on-schema-failure behavior;
- no diagnosis/treatment/medication advice;
- extraction from source text only;
- missing-context question generation;
- persisted facts/questions through repository;
- review UI reads/writes persisted state;
- source provenance and confidence remain visible.

Fallback:

- if `FIREWORKS_API_KEY` or `FIREWORKS_MODEL` is absent, deterministic fixture fallback must keep the app usable.

Checkpoint tests:

```bash
pnpm --filter @clinicbrief/ai test
pnpm --filter @clinicbrief/web test
pnpm typecheck
```

Manual/API smoke:

- create case;
- add note;
- extract facts;
- confirm/edit/reject facts;
- unsafe prompt returns safety redirect.

Commit message suggestion:

```text
Productize extraction and fact review
```

## Checkpoint 3 - Timeline And Brief Engine

Goal:

Make reviewed facts materially drive timeline and brief generation.

Implement:

- `POST /api/cases/:id/timeline/rebuild`;
- `POST /api/cases/:id/briefs`;
- timeline events from confirmed, edited, and high-confidence unrejected facts;
- rejected facts excluded from generated outputs;
- source coverage and open uncertainty sections;
- GP, consultant, pre-op nurse, family/carer handoff, and 90-second story modes;
- persisted timeline events and briefs through repository.

Checkpoint tests:

```bash
pnpm --filter @clinicbrief/exports test
pnpm --filter @clinicbrief/web test
pnpm typecheck
```

Manual/API smoke:

- reject one fact;
- rebuild timeline;
- generate brief;
- confirm rejected fact is not used;
- confirm disclaimer is present.

Commit message suggestion:

```text
Generate timelines and briefs from reviewed facts
```

## Checkpoint 4 - Rehearsal And Export Productization

Goal:

Make rehearsal and export stateful product features.

Implement:

- persisted rehearsal sessions/messages;
- one-question-at-a-time rehearsal based on case facts and missing questions;
- unsafe rehearsal prompts redirect safely;
- user-approved rehearsal answers can update missing-question state or suggested fact updates if low-risk;
- export bundle generated from persisted brief state;
- PDF generation if feasible with existing dependencies;
- robust Markdown and browser-print fallback if PDF rendering remains risky;
- safe events only through the analytics wrapper.

Checkpoint tests:

```bash
pnpm --filter @clinicbrief/events test
pnpm --filter @clinicbrief/exports test
pnpm --filter @clinicbrief/web test
pnpm typecheck
```

Manual/API smoke:

- create rehearsal session;
- send safe answer;
- send unsafe medication-advice prompt;
- generate/export brief artifact;
- verify no raw health event props.

Commit message suggestion:

```text
Productize rehearsal and export flow
```

## Checkpoint 5 - Final Integration And Acceptance

Run full checks:

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
python3 /Users/abhinavgupta/.codex/skills/webdesign/scripts/website_quality_audit.py /Users/abhinavgupta/Desktop/Mind\ Prod/Clinic\ Brief/.worktrees/full-functionality-sequential/apps/web
```

If the worktree path differs, update the audit path.

Final smoke:

- `/`
- `/demo/preop`
- `/cases/sample-preop/review`
- `/cases/sample-preop/timeline`
- `/cases/sample-preop/brief`
- `/cases/sample-preop/rehearsal`
- `/cases/sample-preop/export`
- `/cases/sample-preop/settings`
- `/privacy`
- `/novus-proof`

End-to-end real case smoke:

1. Create a consented case.
2. Add a text note.
3. Add a PDF or PDF fallback.
4. Extract facts/questions.
5. Confirm, edit, and reject facts.
6. Rebuild timeline.
7. Generate a brief.
8. Rehearse one question.
9. Export.
10. Delete case.
11. Verify unsafe medical prompt redirects.
12. Verify analytics drops unsafe properties.

Update:

- `docs/final-integration-handoff.md`
- `docs/product-data-foundation.md` if backend setup changed
- this file, with final status notes if useful

Final commit message suggestion:

```text
Complete full functionality product path
```

## Finish Condition

The goal is complete only when:

- branch `agent/full-functionality-sequential` is clean;
- every checkpoint has either passed or has a documented, product-safe fallback;
- fixture demo works without credentials;
- real case path works using memory fallback;
- Fireworks/Supabase paths are wired and documented, even if not live-tested without credentials;
- all final checks pass;
- final handoff lists changed files, checks, smoke evidence, risks, and merge notes.

## When To Stop And Ask

Ask the user only if:

- a required external credential is needed and no safe fallback exists;
- a dependency install requires network and cannot be satisfied from cache;
- two requirements conflict with the safety boundary;
- preserving both the synthetic demo and real path becomes impossible without a product decision.
