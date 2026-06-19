# Prompt 6 Single-Session Goal Prompt

Paste the following into a new Codex session when ready to run Prompt 6.

```text
You are working in the ClinicBrief repo. This is the single sequential Prompt 6 full-functionality build.

First read:
- AGENTS.md
- clinicbrief_agent_source_of_truth.md
- clinicbrief_build_ready_spec.md
- docs/ui-design-brief.md
- docs/final-integration-handoff.md
- docs/product-data-foundation.md
- docs/prompt6-full-functionality-source-of-truth.md

Context:
Prompt 5 completed the product data foundation on branch agent/product-data-foundation. It added a stable server repository boundary, memory fallback, Prisma/Supabase-shaped adapter, expanded domain/API types, repository tests, and backend docs.

Create your own isolated worktree/branch. Do not edit other worktrees.

Branch/worktree rule:
- If main already contains prompt 5, create branch agent/full-functionality-sequential from main.
- If main does not contain prompt 5, create branch agent/full-functionality-sequential from agent/product-data-foundation.
- Suggested command when prompt 5 is not yet merged:
  git worktree add -b agent/full-functionality-sequential .worktrees/full-functionality-sequential agent/product-data-foundation

Goal:
Implement the full product functionality sequentially in one long-running goal session, using docs/prompt6-full-functionality-source-of-truth.md as the local checkpoint guide.

Non-negotiable safety boundary:
ClinicBrief organizes user-provided information for appointment preparation only. Do not add diagnosis, treatment recommendations, medication start/stop/dose advice, emergency triage, risk scoring, NHS/EHR claims, or analytics containing raw health content.

Execution model:
Work through these checkpoints in order. After each checkpoint, run the listed tests/smokes from docs/prompt6-full-functionality-source-of-truth.md, fix regressions, update docs if needed, and commit a focused checkpoint commit before moving on.

Checkpoint 0 - Orientation and baseline:
- Verify branch/worktree isolation.
- Verify prompt 5 repository boundary is present.
- Run pnpm typecheck and pnpm test.

Checkpoint 1 - Documents and storage:
- Productize real document intake.
- Implement PDF text extraction if feasible with current dependencies.
- Keep honest manual fallback for OCR/image failures.
- Add storage adapter boundary for private files with local/no-credential fallback.
- Persist documents and source previews through the repository.
- Preserve synthetic demo.
- Run checkpoint tests and commit.

Checkpoint 2 - Fireworks extraction and review:
- Use packages/ai/provider.ts for all AI calls.
- Use strict Zod schemas and retry once on validation failure where applicable.
- Extract facts/questions only from source text.
- Persist facts/questions through repository.
- Make review UI reflect persisted confirm/edit/reject states.
- Keep fixture fallback when Fireworks env vars are absent.
- Add/extend tests.
- Run checkpoint tests and commit.

Checkpoint 3 - Timeline and brief engine:
- Implement timeline rebuild API.
- Implement brief generation API.
- Generate from reviewed facts.
- Exclude rejected facts.
- Include source coverage, open uncertainties, and required safety disclaimer.
- Support GP, consultant, pre-op nurse, family/carer handoff, and 90-second story modes.
- Persist timeline and briefs through repository.
- Run checkpoint tests and commit.

Checkpoint 4 - Rehearsal and export productization:
- Persist rehearsal sessions/messages.
- Ask one safe appointment-prep question at a time.
- Redirect unsafe medical-advice prompts.
- Allow low-risk user-approved rehearsal answers to update missing-question state or suggested fact updates.
- Generate export bundle from persisted brief state.
- Implement PDF generation if feasible; otherwise keep robust browser print plus Markdown fallback.
- Ensure analytics events stay sanitized.
- Run checkpoint tests and commit.

Checkpoint 5 - Final integration and acceptance:
- Run pnpm typecheck.
- Run pnpm lint.
- Run pnpm test.
- Run pnpm build.
- Run website quality audit against the worktree apps/web path.
- Smoke the synthetic demo route path.
- Smoke the real case path: create case, add text/PDF or fallback, extract, review facts, rebuild timeline, generate brief, rehearse, export, delete, unsafe prompt redirect, analytics sanitizer.
- Update docs/final-integration-handoff.md with the new full-product state, env vars, smoke evidence, remaining risks, and merge notes.
- Ensure branch is clean after final commit.

Finish condition:
The branch agent/full-functionality-sequential is complete only when the fixture demo works without credentials, the real case path works using memory fallback, Fireworks/Supabase paths are wired and documented, all final checks pass, and the final handoff gives changed files, checks, smoke evidence, risks, and merge notes.

Important:
- Do not stop after planning; implement.
- Do not break the synthetic sample demo.
- Do not require Supabase, Fireworks, Novus, or OCR credentials for local checks.
- Prefer conservative, testable steps over sweeping rewrites.
- If context gets long, re-read docs/prompt6-full-functionality-source-of-truth.md and continue from the last completed checkpoint.
```
