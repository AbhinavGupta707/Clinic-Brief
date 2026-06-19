# Full Agentic Production Prompt Pack

Use these prompts to launch the next Codex sessions. Run Prompt 0 first as a single sequential session. After Prompt 0 is merged into `main`, run Prompts 1-3 in parallel. Run Prompts 4-5 after those land. Run Prompt 6 last.

Each prompt assumes the repo is:

```txt
/Users/abhinavgupta/Desktop/Mind Prod/Clinic Brief
```

Each agent must use an isolated worktree/branch and must not edit other worktrees.

## Prompt 0 - Foundation Contracts And Readiness

```txt
You are working in the ClinicBrief repo.

First read:
- AGENTS.md
- clinicbrief_agent_source_of_truth.md
- clinicbrief_build_ready_spec.md
- docs/final-integration-handoff.md
- docs/full-agentic-production-source-of-truth.md

Create your own isolated worktree/branch from main:
git worktree add -b agent/full-agentic-foundation .worktrees/full-agentic-foundation main

Do not edit other worktrees.

Goal:
Create the stable contracts needed before parallel full-agentic production work starts.

Scope:
- Add a safe runtime config/readiness module for AI, DB, storage, Novus, and app URL.
- Add or update a safe /api/health or /api/system-readiness endpoint that reports configured/fallback state without exposing secrets.
- Add CLINICBRIEF_STORAGE_BACKEND to .env.example and docs.
- Add package scripts or script placeholders for smoke:memory, smoke:ai, smoke:db, smoke:storage, smoke:full.
- Add shared AI schemas/types if needed for brief generation and rehearsal so later agents do not invent conflicting shapes.
- Update docs/full-agentic-production-source-of-truth.md if implementation decisions change.

Guardrails:
- Do not add diagnosis, treatment recommendations, emergency triage, medication advice, risk scoring, or NHS/EHR claims.
- Do not send raw health data to analytics.
- Do not require external credentials for pnpm build/test.
- Keep memory fallback working.

Verification:
- pnpm typecheck
- pnpm lint
- pnpm test
- pnpm build
- Hit /api/health or /api/system-readiness locally if a server is started.

Commit when done.

Final handoff must include:
- Branch/worktree.
- Files changed.
- New contracts.
- Commands run/results.
- Exact next branches that can start in parallel.
- Risks.
```

## Prompt 1 - Fireworks Full Agentic AI Path

Run only after Prompt 0 lands.

```txt
You are working in the ClinicBrief repo.

First read:
- AGENTS.md
- clinicbrief_agent_source_of_truth.md
- clinicbrief_build_ready_spec.md
- docs/full-agentic-production-source-of-truth.md
- docs/final-integration-handoff.md

Create your own isolated worktree/branch from main:
git worktree add -b agent/full-agentic-ai .worktrees/full-agentic-ai main

Do not edit other worktrees.

Goal:
Make the real case path agentic through Fireworks for extraction, missing questions, brief generation, and rehearsal, while preserving deterministic fallback.

Owned files:
- packages/ai/**
- apps/web/lib/server/extraction-service.ts
- apps/web/lib/server/rehearsal-service.ts
- apps/web/app/api/cases/[caseId]/extract/route.ts
- apps/web/app/api/cases/[caseId]/briefs/route.ts
- apps/web/app/api/cases/[caseId]/rehearsal/route.ts
- relevant tests

Implementation requirements:
- All AI calls go through packages/ai/provider.ts.
- Add strict Zod schemas for:
  - extraction facts/questions;
  - appointment brief output;
  - rehearsal reply and suggested fact updates.
- Fireworks extraction must use source documents only.
- Fireworks brief generation must use reviewed facts only and include required disclaimer.
- Fireworks rehearsal must ask one appointment-prep question at a time and refuse/redirect diagnosis, treatment, medication, urgency, or dosing advice.
- Retry once on schema failure using the existing wrapper pattern.
- Provider failure must fall back safely.
- Analytics must never receive prompts/responses/raw health text.

Tests:
- mocked provider success for extraction.
- mocked provider success for brief.
- mocked provider success for rehearsal.
- schema failure then retry.
- provider failure fallback.
- unsafe prompt redirect.
- rejected facts excluded from generated brief.

Verification:
- pnpm --filter @clinicbrief/ai test
- pnpm --filter @clinicbrief/web test
- pnpm typecheck
- pnpm lint
- pnpm build

If FIREWORKS_API_KEY and FIREWORKS_MODEL are available, run a live smoke and document results. If not, document exactly how to run it.

Commit when done.

Final handoff must include:
- Branch/worktree.
- Files changed.
- What is now agentic.
- Fallback behavior.
- Commands run/results.
- Live Fireworks smoke status.
- Risks.
```

## Prompt 2 - Supabase/Postgres Persistence

Run only after Prompt 0 lands.

```txt
You are working in the ClinicBrief repo.

First read:
- AGENTS.md
- clinicbrief_agent_source_of_truth.md
- clinicbrief_build_ready_spec.md
- docs/product-data-foundation.md
- docs/full-agentic-production-source-of-truth.md

Create your own isolated worktree/branch from main:
git worktree add -b agent/full-agentic-persistence .worktrees/full-agentic-persistence main

Do not edit other worktrees.

Goal:
Make Prisma/Supabase Postgres persistence production-shaped and smoke-testable without breaking memory fallback.

Owned files:
- packages/db/**
- apps/web/lib/server/clinic-repository/prisma.ts
- apps/web/lib/server/clinic-repository/types.ts if needed
- package scripts
- docs/product-data-foundation.md
- tests/smoke scripts if relevant

Implementation requirements:
- Add practical Prisma scripts:
  - db:generate
  - db:validate
  - db:migrate or db:push for hackathon use
- Ensure Prisma client generation is handled for local and Vercel.
- Verify PatientCase, HealthDocument, SourcePreview, ExtractedFact, MissingQuestion, TimelineEvent, AppointmentBrief, and RehearsalSession flows.
- Keep sample-preop fixture always available.
- Keep memory backend default.
- Add persistence smoke script or documented command that creates, reads, updates, and deletes a real case through Prisma when DATABASE_URL is set.
- Do not require DATABASE_URL for normal pnpm build/test.

Tests:
- Prisma schema validation.
- repository mapping tests if possible without live DB.
- live DB smoke only if DATABASE_URL is present.

Verification:
- pnpm --filter @clinicbrief/db test
- pnpm --filter @clinicbrief/web test
- pnpm typecheck
- pnpm lint
- pnpm build

Commit when done.

Final handoff must include:
- Branch/worktree.
- Files changed.
- DB scripts added.
- Whether live DATABASE_URL was available.
- Live DB smoke result or exact blocked step.
- Risks.
```

## Prompt 3 - Supabase Private Storage

Run only after Prompt 0 lands.

```txt
You are working in the ClinicBrief repo.

First read:
- AGENTS.md
- clinicbrief_agent_source_of_truth.md
- clinicbrief_build_ready_spec.md
- docs/full-agentic-production-source-of-truth.md
- docs/deployment-novus-readiness.md

Create your own isolated worktree/branch from main:
git worktree add -b agent/full-agentic-storage .worktrees/full-agentic-storage main

Do not edit other worktrees.

Goal:
Implement a real private Supabase Storage adapter behind the existing storage boundary while keeping memory fallback.

Owned files:
- apps/web/lib/server/private-storage.ts
- apps/web/app/api/cases/[caseId]/documents/route.ts if needed
- apps/web/app/api/cases/[caseId]/route.ts if needed
- storage tests
- .env.example
- docs/deployment-novus-readiness.md

Implementation requirements:
- Add CLINICBRIEF_STORAGE_BACKEND=memory|supabase.
- Use memory storage by default.
- Use Supabase only when configured with:
  - NEXT_PUBLIC_SUPABASE_URL
  - SUPABASE_SERVICE_ROLE_KEY
  - SUPABASE_STORAGE_BUCKET
- Never expose service role key to client code.
- Store private objects under case-scoped paths like cases/{caseId}/{uuid}-{safeName}.
- Preserve source hashing.
- Delete all case files by prefix during case deletion.
- Do not fake cloud storage if credentials are absent.

Tests:
- memory storage tests still pass.
- Supabase client behavior mocked for upload/delete.
- filename sanitization.
- delete cleanup receipt.

Verification:
- pnpm --filter @clinicbrief/web test -- lib/server/private-storage.test.ts
- pnpm typecheck
- pnpm lint
- pnpm build

If Supabase credentials are available, run a live upload/delete smoke. If not, document exact env and smoke command.

Commit when done.

Final handoff must include:
- Branch/worktree.
- Files changed.
- Storage backend behavior.
- Live Supabase smoke status.
- Commands run/results.
- Risks.
```

## Prompt 4 - Server-Side PDF Export

Run after AI and persistence have landed, or after integration confirms export contracts are stable.

```txt
You are working in the ClinicBrief repo.

First read:
- AGENTS.md
- clinicbrief_agent_source_of_truth.md
- clinicbrief_build_ready_spec.md
- docs/full-agentic-production-source-of-truth.md

Create your own isolated worktree/branch from main:
git worktree add -b agent/full-agentic-pdf-export .worktrees/full-agentic-pdf-export main

Do not edit other worktrees.

Goal:
Implement true server-side PDF generation for brief/export, while keeping browser print and Markdown fallback.

Owned files:
- packages/exports/**
- apps/web/app/api/cases/[caseId]/export/route.ts
- apps/web/app/cases/[caseId]/export/**
- tests

Implementation requirements:
- Prefer existing @react-pdf/renderer if stable.
- Generate a readable one-page-ish PDF containing:
  - title;
  - reason for visit;
  - 90-second story;
  - key timeline;
  - medications;
  - allergies/important notes;
  - questions;
  - uncertainties;
  - source coverage;
  - required safety disclaimer.
- Do not include diagnosis/treatment advice.
- If PDF generation fails, return existing Markdown/browser-print fallback.

Tests:
- generated PDF buffer is non-empty.
- title/disclaimer present if inspectable.
- fallback remains available.

Verification:
- pnpm --filter @clinicbrief/exports test
- pnpm --filter @clinicbrief/web test
- pnpm typecheck
- pnpm lint
- pnpm build

Commit when done.

Final handoff must include:
- Branch/worktree.
- Files changed.
- PDF behavior.
- Fallback behavior.
- Commands run/results.
- Risks.
```

## Prompt 5 - Full Smoke Scripts And Provider QA

Run after AI, persistence, and storage have landed.

```txt
You are working in the ClinicBrief repo.

First read:
- AGENTS.md
- clinicbrief_agent_source_of_truth.md
- clinicbrief_build_ready_spec.md
- docs/full-agentic-production-source-of-truth.md
- docs/final-integration-handoff.md

Create your own isolated worktree/branch from main:
git worktree add -b agent/full-agentic-smoke .worktrees/full-agentic-smoke main

Do not edit other worktrees.

Goal:
Add repeatable smoke scripts for memory, AI, DB, storage, and full-product mode.

Owned files:
- scripts/**
- package.json scripts
- docs/full-agentic-production-source-of-truth.md
- docs/final-integration-handoff.md if applicable

Implementation requirements:
- Add scripts:
  - pnpm smoke:memory
  - pnpm smoke:ai
  - pnpm smoke:db
  - pnpm smoke:storage
  - pnpm smoke:full
- Scripts should use synthetic data only.
- Scripts must not print secrets.
- Scripts should fail clearly when required env is absent.
- Full smoke should cover:
  - create case;
  - text intake;
  - PDF/manual fallback or selectable PDF;
  - AI extraction if configured;
  - review confirm/edit/reject;
  - rebuild timeline;
  - AI brief if configured;
  - safe rehearsal;
  - unsafe rehearsal redirect;
  - export;
  - analytics sanitizer;
  - delete records/files.

Verification:
- pnpm smoke:memory
- pnpm test
- pnpm typecheck
- pnpm lint
- pnpm build
- Run credentialed smokes if env keys are present; otherwise document blocked status.

Commit when done.

Final handoff must include:
- Branch/worktree.
- Files changed.
- Smoke commands and results.
- Missing env keys if any.
- Risks.
```

## Prompt 6 - Final Integration, Deploy Readiness, Then Novus Prep

Run last.

```txt
You are working in the ClinicBrief repo.

First read:
- AGENTS.md
- clinicbrief_agent_source_of_truth.md
- clinicbrief_build_ready_spec.md
- docs/full-agentic-production-source-of-truth.md
- docs/final-integration-handoff.md
- docs/devpost-submission-draft.md
- docs/demo-script.md

Create your own isolated worktree/branch from main:
git worktree add -b agent/full-agentic-final-integration .worktrees/full-agentic-final-integration main

Do not edit other worktrees.

Goal:
Integrate the full-agentic production branches, verify the product path, prepare for env-key testing and Novus install.

Scope:
- Merge completed branches in safe order:
  1. full-agentic-foundation
  2. full-agentic-ai
  3. full-agentic-persistence
  4. full-agentic-storage
  5. full-agentic-pdf-export if complete
  6. full-agentic-smoke
- Resolve conflicts by preserving product safety, memory fallback, and provider contracts.
- Run all final checks and smoke scripts.
- Update final handoff docs.
- Update README/env docs if needed.
- Do not install Novus unless the user explicitly says the product path is accepted and dashboard install is ready.

Verification:
- pnpm typecheck
- pnpm lint
- pnpm test
- pnpm build
- pnpm smoke:memory
- pnpm smoke:ai if Fireworks env is present
- pnpm smoke:db if DATABASE_URL is present
- pnpm smoke:storage if Supabase storage env is present
- pnpm smoke:full if all required env is present
- website quality audit against apps/web

Manual smoke:
- /
- /demo/preop
- /cases/new
- real case path through intake, extract, review, timeline, brief, rehearsal, export, delete
- /privacy
- /novus-proof

Commit when done.

Final handoff must include:
- Branch/worktree.
- Branches merged.
- Checks and smoke evidence.
- What is fully agentic.
- What still falls back.
- Env keys used/missing.
- Vercel deployment steps.
- Exact Novus next step.
- Risks.
```

## Recommended Human Workflow

1. Start Prompt 0 only.
2. Review and merge Prompt 0 to `main`.
3. Start Prompts 1, 2, and 3 in parallel.
4. Merge Prompt 1 first if it changes shared AI schemas.
5. Merge Prompt 2 and Prompt 3 after conflict review.
6. Start Prompt 4 if time allows.
7. Start Prompt 5.
8. Start Prompt 6.
9. Add env keys locally and run credentialed smoke.
10. Deploy and run deployed smoke.
11. Add Novus.
