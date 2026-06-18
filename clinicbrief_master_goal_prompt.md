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

## Recommended Parallel Cold-Session Prompts

Start these only after the foundation branch has created the repo, package scripts, shared contracts, and first commit. Each session should run in its own Codex worktree or dedicated branch. Do not run these in parallel against the same Local checkout. If launching from Codex mobile and you cannot explicitly choose a worktree, the first instruction in each prompt tells Codex to create/switch to its own branch before editing.

### Session 1. Demo Product Path

```text
/goal Build the ClinicBrief synthetic pre-op demo into a polished end-to-end judge path.

Before editing, make sure this session is isolated from other parallel sessions. If you are not already in a Codex worktree, create/switch to a dedicated branch named `agent/demo-product-path` from `main`, then work only there. Do not edit `main` directly.

First read AGENTS.md, clinicbrief_agent_source_of_truth.md, clinicbrief_build_ready_spec.md, clinicbrief_master_goal_prompt.md, and docs/ui-design-brief.md. Work in this isolated worktree/branch only. Do not touch Fireworks, Supabase, Novus installation, or deep document parsing unless needed for the demo fallback.

Own these areas:
- /demo/preop
- /cases/sample-preop/review
- /cases/sample-preop/timeline
- /cases/sample-preop/brief
- /cases/sample-preop/rehearsal
- /cases/sample-preop/export
- fixture-backed UI components needed by those routes

Product goal:
Make a judge understand ClinicBrief in under 2 minutes using only synthetic data: scattered documents -> extracted facts -> editable review -> timeline -> missing questions -> one-page brief -> rehearsal -> export fallback.

UI direction:
Use docs/ui-design-brief.md. Product screens are the visual asset. Build real-looking document cards, confidence/source chips, timeline rows, brief preview, and rehearsal panel. Use Lucide icons where useful. Avoid generic AI dashboard styling, purple gradients, decorative orbs, and stock medical photos.

Done means:
- The demo path is clickable from the landing page and visually coherent.
- It uses only synthetic fixture data.
- Required safety copy appears on landing/demo/brief/export surfaces.
- At least 5 missing-context questions are visible.
- Review shows editable-looking fact cards with confidence and source provenance.
- Timeline shows chronological events and a "what changed since last appointment" section.
- Brief page shows one-page pre-op brief, 90-second story, and clinician questions.
- Rehearsal page asks one safe appointment-prep question at a time using fixture context.
- Export page provides PDF/Markdown fallback UI, even if actual PDF generation is left to another session.
- pnpm build, pnpm typecheck, pnpm lint, and pnpm test pass, or blockers are documented with exact error output.

Stop when:
The fixture demo path is end-to-end usable and the checks above have run. Final handoff: changed files, what works, commands run, skipped checks, risks, and merge notes.
```

### Session 2. Intake, Extraction, Review

```text
/goal Build ClinicBrief's real intake, extraction, and fact-review foundation.

Before editing, make sure this session is isolated from other parallel sessions. If you are not already in a Codex worktree, create/switch to a dedicated branch named `agent/intake-extraction-review` from `main`, then work only there. Do not edit `main` directly.

First read AGENTS.md, clinicbrief_agent_source_of_truth.md, clinicbrief_build_ready_spec.md, clinicbrief_master_goal_prompt.md, and docs/ui-design-brief.md. Work in this isolated worktree/branch only. Do not redesign the whole demo path; integrate with existing contracts and fixture fallback.

Own these areas:
- /cases/new
- /cases/[caseId]/intake
- /cases/[caseId]/review
- /api/cases*
- /api/cases/:id/documents equivalent route handlers
- /api/cases/:id/extract equivalent route handlers
- packages/documents
- packages/ai extraction/provider/schemas/safety

Product goal:
Make real-user intake credible while keeping demo deterministic. Users must consent, add text/PDF/image notes, see parsed/source previews, run safe extraction when Fireworks is configured, and fall back to fixtures when it is not.

Guardrails:
- No diagnosis, treatment recommendations, medication advice, emergency triage, or clinical risk scoring.
- All AI calls go through packages/ai/provider.ts.
- All AI JSON is validated with Zod and retries once on validation failure.
- Analytics events must never include raw medical text, medication names, symptom names, source quotes, file names, or free-text narratives.
- PDF/OCR/speech failures must offer manual text fallback.

Done means:
- Consent is required before creating/uploading case data.
- Text note intake works locally without external services.
- PDF/image parsing boundaries exist with manual fallback states.
- Source preview data shape supports source id, type, snippet, confidence, and document linkage.
- Extraction endpoint returns validated facts/questions from Fireworks if configured and deterministic fixture fallback otherwise.
- Review UI supports confirm/edit/reject states at least at UI/data-contract level.
- Safety refusal utility is used for prohibited medical-advice prompts.
- pnpm build, pnpm typecheck, pnpm lint, and pnpm test pass, or blockers are documented with exact error output.

Stop when:
The intake -> extraction -> review skeleton is functional enough for integration with the demo path. Final handoff: changed files, API contracts, env vars needed, commands run, skipped checks, risks, and merge notes.
```

### Session 3. Outputs, Privacy, Analytics, Submission

```text
/goal Build ClinicBrief's output, privacy, analytics, and submission-readiness layer.

Before editing, make sure this session is isolated from other parallel sessions. If you are not already in a Codex worktree, create/switch to a dedicated branch named `agent/outputs-privacy-submission` from `main`, then work only there. Do not edit `main` directly.

First read AGENTS.md, clinicbrief_agent_source_of_truth.md, clinicbrief_build_ready_spec.md, clinicbrief_master_goal_prompt.md, and docs/ui-design-brief.md. Work in this isolated worktree/branch only. Do not rebuild intake/extraction unless required to connect output flows.

Own these areas:
- /cases/[caseId]/brief
- /cases/[caseId]/rehearsal
- /cases/[caseId]/export
- /cases/[caseId]/settings
- /privacy
- /novus-proof
- packages/exports
- packages/events
- docs/demo-script.md
- Devpost/submission docs

Product goal:
Make ClinicBrief feel submission-ready: safe brief generation, handoff card, 90-second story, appointment rehearsal, export fallback, delete-all-data flow, Novus-safe analytics proof, and submission copy.

Guardrails:
- No diagnosis, treatment recommendations, medication advice, emergency triage, or clinical risk scoring.
- Rehearsal asks one appointment-prep question at a time and redirects medical-advice requests.
- Exported/visible briefs must include the required disclaimer.
- Novus/Pendo event props may include mode, counts, confidence bands, and brief type only; never raw medical text or identifiers.
- Delete flow must remove or consistently mark case rows/files as deleted.

Done means:
- Brief modes exist for GP, consultant, pre-op nurse, family/carer handoff, and 90-second story at UI/data-contract level.
- Brief and export pages provide readable Markdown/PDF fallback output.
- Rehearsal flow has safe mocked or real chat behavior and optional speech UI only with typed fallback.
- Privacy/settings/delete pages are complete enough for a judge demo.
- /novus-proof explains event coverage and shows sanitized event examples.
- Demo script and Devpost draft exist.
- pnpm build, pnpm typecheck, pnpm lint, and pnpm test pass, or blockers are documented with exact error output.

Stop when:
The output/privacy/submission layer is coherent and ready for integration. Final handoff: changed files, commands run, skipped checks, risks, and merge notes.
```

## Integration Agent Prompt

Use this after workstreams finish.

```text
/goal Integrate the ClinicBrief workstreams and reach hackathon demo readiness.

Read AGENTS.md, clinicbrief_agent_source_of_truth.md, clinicbrief_build_ready_spec.md, clinicbrief_master_goal_prompt.md, docs/ui-design-brief.md, and every workstream handoff. Merge completed branches/worktrees in this order: Session 1 demo path, Session 2 intake/extraction/review, Session 3 output/privacy/analytics. After each merge, inspect conflicts, preserve shared contracts, run pnpm build, pnpm typecheck, pnpm lint, and pnpm test, then commit a clean integration step.

Acceptance path:
- / loads and explains the product with required safety copy.
- /demo/preop starts a synthetic sample case.
- Review shows editable facts with confidence and source provenance.
- Timeline shows chronological story and what changed.
- Brief shows one-page pre-op brief, handoff/90-second story, questions, uncertainties, and disclaimer.
- Rehearsal asks safe appointment-prep questions and refuses medical advice.
- Export provides PDF or Markdown fallback.
- Settings/delete flow works or is clearly mocked with correct API boundary.
- /privacy and /novus-proof are judge-ready.
- Analytics proof shows no raw medical content.

Stop when:
The deployed-demo candidate is integrated, checks have run after the final merge, and the final handoff lists exact remaining manual tasks for Vercel, Supabase/Fireworks env vars, Novus screenshot, and Devpost submission.
```
