# ClinicBrief Master Goal Prompt

Use this as the main `/goal` prompt for a long-running Codex session after the source files in this folder are committed to a Git repository.

```text
/goal Build ClinicBrief to hackathon submission readiness.

You are implementing ClinicBrief for the Mind the Product World Product Day 2026 hackathon. First read AGENTS.md, clinicbrief_agent_source_of_truth.md, and clinicbrief_build_ready_spec.md. Keep the product within the safety boundary: organization and appointment preparation only; no diagnosis, treatment recommendation, emergency triage, medication advice, clinical risk scoring, NHS/EHR integration, or raw health analytics.

Definition of done:
- A public-web-ready Next.js App Router product exists with TypeScript, Tailwind, shadcn/ui-compatible components, Prisma/Supabase-compatible data model, Fireworks provider wrapper, Zod schemas, fixture fallback, and Vercel-ready config.
- The synthetic pre-op demo works end-to-end: load sample case, extract/display facts, review/edit at least one fact, show timeline, answer missing questions, generate a one-page brief and handoff/90-second story, rehearse one appointment question, export PDF or Markdown fallback, delete case data.
- Consent, privacy, safety copy, prohibited-output handling, and no-raw-health-data analytics protections are implemented.
- Novus/Pendo event wrapper and /novus-proof exist; events track funnel state and counts only.
- Relevant checks pass or have clearly documented blockers: pnpm install, pnpm lint, pnpm typecheck, pnpm test, pnpm build, demo smoke, safety smoke, analytics smoke, delete smoke.
- Final handoff includes changed files, commands run, current deployment readiness, missing environment variables, and exact remaining manual steps for Vercel/Novus/Devpost.

Phase 0: discovery and activation checks.
- Confirm whether this folder is a Git repo. If not, initialize Git before any parallel-worktree plan.
- Confirm package manager and framework state by inspecting files, not guessing.
- If a requested feature, tool, slash command, plugin, dependency, or integration appears missing, diagnose in layer order: registration/discovery/install/official activation first, then permissions/runtime.
- Create or update .env.example, README quickstart, and any setup docs needed for cold Codex sessions.

Phase 1: foundation.
- Scaffold the monorepo/app structure conservatively.
- Add shared types, Prisma schema, AI schemas/prompts/safety utilities, event names/filtering, placeholder routes, and deterministic fixture interfaces.
- Verify lint/typecheck/build as early as possible.

Phase 2: demo-first product.
- Build the synthetic pre-op fixtures and /demo/preop happy path.
- Implement the smallest credible UI that lets judges understand the product without uploading real data.
- Prefer deterministic fixture fallback anywhere external services are missing.

Phase 3: real intake and AI flow.
- Add consent-gated case creation, upload/paste intake, PDF parsing fallback, source previews, extraction API, missing questions, review cards, timeline, brief generation, rehearsal, and export.
- All AI outputs must validate through Zod and go through the provider wrapper.

Phase 4: privacy, analytics, and submission polish.
- Implement delete-all-data behavior.
- Install/wire Novus if credentials/docs are available; otherwise leave a precise integration seam and proof page.
- Add privacy page, settings page, and final copy polish.

Phase 5: verification and merge readiness.
- Run checks after each substantial stage.
- If using branches/worktrees, merge in this order: foundation, fixtures/demo, intake/parser, extraction/review, timeline/brief, rehearsal/export, privacy/analytics.
- Resolve conflicts deliberately and rerun checks after each merge.
- Finish only when the demo path is usable and the final handoff clearly states what is done and what remains.
```

## Parallel Cold-Session Prompts

Start these only after the foundation branch has created the repo, package scripts, shared contracts, and first commit. Each session should run in its own branch or Codex worktree.

### A. Foundation And Safety

```text
Read AGENTS.md, clinicbrief_agent_source_of_truth.md, and clinicbrief_build_ready_spec.md. Own branch agent/clinic-foundation. Create the ClinicBrief monorepo/app foundation: Next.js App Router, TypeScript, Tailwind, shadcn/ui-ready structure, pnpm workspace, Prisma schema, shared types, AI Zod schemas, safety guardrail utilities, event names/filtering, placeholder routes, .env.example, and README quickstart. Do not implement deep feature UI beyond placeholders. Run pnpm install, lint, typecheck, and build if possible. Final handoff must list commands run, failures, and contracts other agents can rely on.
```

### B. Fixtures And Demo

```text
Read AGENTS.md, clinicbrief_agent_source_of_truth.md, and clinicbrief_build_ready_spec.md. Own branch agent/clinic-fixtures-demo. Build only the synthetic pre-op fixture package and /demo/preop happy path using no real patient data. Include text fixture documents, expected facts, expected timeline, expected brief, deterministic loader, and UI that can show sample extraction/review/brief states without external APIs. Run relevant checks and hand off exact integration points.
```

### C. Intake And Parsing

```text
Read AGENTS.md, clinicbrief_agent_source_of_truth.md, and clinicbrief_build_ready_spec.md. Own branch agent/clinic-intake-parser. Implement consent-gated case intake, text paste, PDF upload/text extraction, image upload with manual fallback, optional browser speech-to-text note input, document source preview, and storage/data abstractions that match the shared contracts. Do not send raw medical content to analytics. Run relevant checks and include merge notes.
```

### D. Extraction And Review

```text
Read AGENTS.md, clinicbrief_agent_source_of_truth.md, and clinicbrief_build_ready_spec.md. Own branch agent/clinic-extraction-review. Implement Fireworks-backed extraction through packages/ai/provider.ts, strict Zod schemas, retry-on-validation-error, missing question generation, safe refusal behavior, extraction API, and editable fact review cards with confidence and source provenance. Include deterministic fixture fallback. Run schema/safety tests and relevant app checks.
```

### E. Timeline And Brief

```text
Read AGENTS.md, clinicbrief_agent_source_of_truth.md, and clinicbrief_build_ready_spec.md. Own branch agent/clinic-timeline-brief. Implement timeline rebuild, filters, what-changed-since-last-appointment, brief modes, one-page appointment brief, 90-second story, family/carer handoff, source coverage, and required disclaimer. Use confirmed facts and fixture fallback. No diagnosis or treatment recommendations. Run relevant checks.
```

### F. Rehearsal And Export

```text
Read AGENTS.md, clinicbrief_agent_source_of_truth.md, and clinicbrief_build_ready_spec.md. Own branch agent/clinic-rehearsal-export. Implement appointment rehearsal chat with one-question-at-a-time behavior, safe refusal/redirect for medical advice requests, optional speech input with typed fallback, brief/handoff PDF export, Markdown fallback, copy/download actions, and export page. Run relevant checks and a demo smoke if possible.
```

### G. Privacy, Delete, Novus, Submission

```text
Read AGENTS.md, clinicbrief_agent_source_of_truth.md, and clinicbrief_build_ready_spec.md. Own branch agent/clinic-privacy-analytics. Implement privacy page, settings/delete-all-data flow, consent audit display, Novus/Pendo event wrapper, forbidden analytics property filtering, event calls across the funnel, /novus-proof, and submission-readiness docs including demo script and Devpost description draft. Never include raw medical data in event properties. Run relevant checks.
```

## Integration Agent Prompt

Use this after workstreams finish.

```text
Read AGENTS.md, clinicbrief_agent_source_of_truth.md, clinicbrief_build_ready_spec.md, and every workstream handoff. Merge branches in dependency order: foundation, fixtures/demo, intake/parser, extraction/review, timeline/brief, rehearsal/export, privacy/analytics. After each merge, inspect conflicts, preserve shared contracts, run the most relevant checks, and commit a clean integration step. Diagnose missing features in layer order before debugging runtime. Finish with a full acceptance run against the hackathon definition of done and a concise list of any remaining manual deployment or credential tasks.
```
