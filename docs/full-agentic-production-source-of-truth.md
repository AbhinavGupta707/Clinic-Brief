# Full Agentic Production Source Of Truth

Use this document for the next build stage after Prompt 8-9. The goal is to move ClinicBrief from a strong demo MVP with safe fallbacks into a more fully agentic, durable product path before adding Novus.

## Current Baseline

`main` is pushed to GitHub at:

```txt
https://github.com/AbhinavGupta707/Clinic-Brief.git
```

Current `main` already has:

- Next.js App Router product shell and all core routes.
- Synthetic `/demo/preop` path.
- Consent-gated real case creation.
- Text note intake.
- Selectable-text PDF parsing with manual fallback.
- Image upload boundary with manual fallback.
- Source previews.
- Fireworks-backed extraction only when `FIREWORKS_API_KEY` and `FIREWORKS_MODEL` are present.
- Deterministic source-text extraction fallback.
- Fact review confirm/edit/reject.
- Timeline rebuild from reviewed/high-confidence facts.
- Deterministic brief generation.
- Deterministic appointment rehearsal with safety redirects.
- Browser print/save-as-PDF plus Markdown export fallback.
- Memory repository and private memory file storage fallback.
- Prisma/Supabase-shaped repository adapter.
- Novus-safe analytics sanitizer and `/novus-proof`.

Verified on `main`:

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

All passed on June 19, 2026.

## Product Target For This Stage

Make the normal real-case path agentic and production-shaped:

1. User creates a consented case.
2. User uploads/pastes notes and documents.
3. Documents are stored privately.
4. Source text is extracted or manually supplied.
5. Fireworks extracts appointment-prep facts and missing questions through strict schemas.
6. User reviews and corrects facts.
7. Fireworks generates appointment brief variants from reviewed facts.
8. Fireworks powers rehearsal as an appointment-prep coach, within safety bounds.
9. Export produces a real PDF when feasible, with Markdown fallback.
10. Delete removes DB records and private files.
11. Analytics remains sanitized and never contains raw health content.

Novus should still be installed only after this product path is tested.

## Non-Negotiable Safety Boundary

ClinicBrief organizes user-provided information for appointment preparation only.

Do not add:

- diagnosis;
- treatment recommendations;
- medication start/stop/dose advice;
- emergency triage;
- clinical risk scoring;
- NHS/EHR integration claims;
- analytics containing raw health content.

Required safety copy:

> ClinicBrief organizes information you provide so you can prepare for appointments. It does not diagnose, recommend treatment, or replace medical advice. Review everything before sharing it with a clinician.

## Required Environment Variables

Minimum local fallback:

```bash
CLINICBRIEF_DATA_BACKEND=memory
CLINICBRIEF_STORAGE_BACKEND=memory
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Fireworks:

```bash
FIREWORKS_API_KEY=...
FIREWORKS_MODEL=accounts/fireworks/models/...
```

Postgres/Supabase persistence:

```bash
CLINICBRIEF_DATA_BACKEND=prisma
DATABASE_URL=postgresql://...
```

Supabase private storage:

```bash
CLINICBRIEF_STORAGE_BACKEND=supabase
NEXT_PUBLIC_SUPABASE_URL=https://PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
SUPABASE_STORAGE_BUCKET=clinicbrief
```

Runtime readiness:

- `GET /api/health`
- `GET /api/system-readiness`

Both endpoints return app URL, AI, database, storage, and Novus configured/fallback/misconfigured/unconfigured state without exposing secret values. Missing Fireworks credentials are a safe fallback. `CLINICBRIEF_DATA_BACKEND=prisma` without `DATABASE_URL` is misconfigured. `CLINICBRIEF_STORAGE_BACKEND=supabase` without `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, or `SUPABASE_STORAGE_BUCKET` is misconfigured.

Smoke script contract:

```bash
pnpm smoke:memory
pnpm smoke:ai
pnpm smoke:db
pnpm smoke:storage
pnpm smoke:full
```

These names are stable and executable as of branch `agent/full-agentic-smoke`.

- `smoke:memory` starts a temporary local Next.js server and runs the full synthetic product flow with memory DB and private memory storage.
- `smoke:ai` requires `FIREWORKS_API_KEY` and `FIREWORKS_MODEL`, then runs the product flow and fails if extraction does not use Fireworks.
- `smoke:db` requires `DATABASE_URL`, then runs the Prisma/Postgres create/read/update/delete smoke.
- `smoke:storage` requires Supabase private storage env, then verifies upload and delete through the storage-backed document flow.
- `smoke:full` starts a temporary local Next.js server and uses the selected runtime backends, defaulting to memory DB/storage and deterministic AI fallback when external env is absent.

All smoke scripts use synthetic data only, print env variable names rather than values, and redact known secret values from child process output.

Novus, later:

```bash
NEXT_PUBLIC_NOVUS_CLIENT_KEY=...
NEXT_PUBLIC_PENDO_API_KEY=...
```

Use exact variable names required by the dashboard-generated install snippet if Novus differs.

## Recommended Execution Strategy

Do not start with many parallel sessions immediately.

Use this sequence:

1. **Sequential foundation session first.**
   Create stable runtime config, provider readiness status, AI schemas, storage interface, DB scripts, smoke script interfaces, and source-of-truth updates.

2. **Parallel sessions after foundation lands.**
   Parallelize only once shared contracts are merged into `main`.

3. **Single integration session last.**
   Merge branches in dependency order, run full checks, run local/full-provider smoke tests, deploy, then add Novus.

Reason: parallelizing before schemas/config/storage contracts are stable will create collisions in `packages/ai`, `packages/types`, repository interfaces, and API response shapes.

## Workstream Dependency Order

### Foundation

Must land first.

Owns:

- `docs/**` production source docs.
- `.env.example`.
- README provider readiness notes.
- runtime config helpers.
- health/readiness endpoint.
- smoke script skeleton.
- shared AI schemas/types if needed.
- package scripts.

Foundation branch `agent/full-agentic-foundation` establishes these contracts:

- `apps/web/lib/server/runtime-config.ts` is the source for safe runtime readiness.
- `/api/health` and `/api/system-readiness` expose readiness for agents, deploy checks, and smoke scripts.
- `CLINICBRIEF_STORAGE_BACKEND` is the storage selector with `memory` fallback and future `supabase` backend.
- Shared AI schemas include extraction, brief output, and rehearsal output requiring user review before proposed fact updates become case facts.
- Smoke script names are reserved at the root package level.

### AI Agentic Path

Can start after foundation.

Owns:

- `packages/ai/**`
- `apps/web/lib/server/extraction-service.ts`
- brief generation service/API integration.
- rehearsal service/API integration.
- AI tests.

### Persistence

Can start after foundation.

Owns:

- `packages/db/**`
- Prisma scripts and migrations.
- `apps/web/lib/server/clinic-repository/prisma.ts`
- repository integration tests or smoke tests.
- deployment docs for DB.

### Private Storage

Can start after foundation. Needs light coordination with persistence/delete.

Owns:

- `apps/web/lib/server/private-storage.ts`
- storage tests.
- document upload route storage behavior.
- delete cleanup behavior.

### PDF Export

Should start after AI and persistence shape is stable.

Owns:

- `packages/exports/**`
- export API route.
- export UI copy if needed.
- PDF tests.

### Full Smoke And Integration

Must be last.

Owns:

- end-to-end smoke scripts.
- final docs/handoff.
- Vercel readiness.
- full local and credentialed test run.

## Acceptance Criteria

Local fallback mode:

- `pnpm typecheck`
- `pnpm lint`
- `pnpm test`
- `pnpm build`
- memory smoke passes with no external credentials.
- full smoke passes in fallback mode with no external credentials.
- synthetic demo still works.
- real-case fallback still works.

Agentic mode:

- Fireworks extraction returns schema-valid facts/questions.
- Fireworks brief generation returns schema-valid brief with disclaimer.
- Fireworks rehearsal asks one appointment-prep question at a time.
- Rehearsal fact updates use the shared `missing_question_answer` shape and remain `requiresUserReview: true`.
- unsafe AI prompts are redirected before or during provider call.
- provider failure falls back safely.

Persistence mode:

- `pnpm smoke:db` fails clearly with missing env names when `DATABASE_URL` is absent.
- cases survive server restart/repository reinitialization.
- facts/review/timeline/brief/rehearsal persist.
- delete removes or marks records consistently.

Storage mode:

- `pnpm smoke:storage` fails clearly with missing env names when Supabase storage env is absent.
- uploaded files are stored in private Supabase bucket.
- source hashes are saved.
- delete removes case files.
- no service-role key is exposed client-side.

Export mode:

- server PDF is produced when feasible.
- Markdown fallback remains.
- safety disclaimer appears in exported output.

Privacy/analytics:

- Novus/Pendo sanitizer keeps only counts/types.
- no raw health text, medication names, symptom names, file names, source quotes, prompts, responses, transcripts, case ids, or free text are sent to analytics.

## Final Submission Order

1. Complete full-agentic product path.
2. Add user-provided env keys locally and test.
3. Deploy to Vercel with env keys.
4. Run deployed smoke.
5. Add Novus install PR/snippet.
6. Re-run demo.
7. Capture Novus dashboard screenshot.
8. Record final demo video.
