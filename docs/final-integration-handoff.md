# ClinicBrief Final Integration Handoff

## Full Agentic Smoke Update

Branch/worktree `agent/full-agentic-smoke` in `.worktrees/full-agentic-smoke` adds repeatable smoke scripts for memory, AI, DB, storage, and full-product mode.

Smoke commands now available from the repo root:

```bash
pnpm smoke:memory
pnpm smoke:ai
pnpm smoke:db
pnpm smoke:storage
pnpm smoke:full
```

Verified locally on June 19, 2026:

- `pnpm smoke:memory` passed with memory DB/storage, synthetic text intake, PDF manual fallback, extraction fallback, review confirm/edit/reject, timeline rebuild, brief, safe and unsafe rehearsal, export, analytics sanitizer, and delete cleanup.
- `pnpm smoke:full` passed in fallback mode with memory DB/storage and deterministic extraction.
- `pnpm smoke:ai` was blocked because `FIREWORKS_API_KEY` and `FIREWORKS_MODEL` were unset.
- `pnpm smoke:db` was blocked because `DATABASE_URL` was unset.
- `pnpm smoke:storage` was blocked because `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and `SUPABASE_STORAGE_BUCKET` were unset.

The smoke scripts use synthetic data only and do not print secret values.

## Current Status

Prompt 8-9 submission and production readiness is complete on branch `agent/submission-production-readiness` in worktree `.worktrees/submission-production-readiness`.

ClinicBrief is deployable for the Mind the Product / Novus submission with the default memory backend. The branch keeps the synthetic demo and real-case fallback working without Supabase, Fireworks, or Novus credentials.

## What Changed In Prompt 8-9

- Added `docs/deployment-novus-readiness.md` with Vercel settings, minimum demo env, optional production env, Novus install steps, Session Replay privacy settings, AI Agent Tracking limits, persistence/storage decision record, and PDF/OCR decision record.
- Updated `README.md` with Vercel deployment settings and Novus eligibility notes.
- Added `NEXT_PUBLIC_PENDO_API_KEY` as a safe placeholder in `.env.example`.
- Hardened `packages/events` so prompt, response, message, and transcript properties are filtered before analytics.
- Added optional `window.pendo.track(eventName, safeProps)` forwarding after sanitization only. If no Novus/Pendo snippet exists, events still post only to `/api/events` for local proof.
- Updated `/novus-proof` to show accurate install status, dashboard privacy requirements, and a screenshot placeholder.
- Updated `/privacy` to state Session Replay maximum privacy and rehearsal AI Agent Tracking limits.
- Polished `docs/devpost-submission-draft.md` and `docs/demo-script.md` with public URL and Novus screenshot placeholders, concise demo flow, product positioning, tools used, learnings, safety, and privacy copy.

## Deployment Readiness

Vercel settings documented in `docs/deployment-novus-readiness.md`:

- Root directory: `apps/web`
- Framework preset: Next.js
- Install command: `pnpm install --frozen-lockfile`
- Build command: `pnpm build`
- Node.js: 20.x or newer

Minimum demo env:

```bash
CLINICBRIEF_DATA_BACKEND=memory
NEXT_PUBLIC_APP_URL=https://YOUR-VERCEL-URL
```

No Supabase, Fireworks, or Novus credentials are required for local build or demo fallback.

## Novus Eligibility

Novus is not faked in this branch. No real Novus/Pendo credentials or dashboard-generated snippet were present locally:

- `NOVUS_API_KEY`: unset
- `NEXT_PUBLIC_NOVUS_CLIENT_KEY`: unset
- `NEXT_PUBLIC_PENDO_API_KEY`: unset
- `NOVUS_SNIPPET`: unset

External step required:

1. Open the Novus/Pendo dashboard and create/select the ClinicBrief web app.
2. Use the official web JavaScript install flow for the deployed Vercel URL.
3. Add the dashboard-generated snippet or real public key to Vercel.
4. Initialize with an anonymous visitor id that is not a case id, email, file name, document name, or health-content-derived identifier.
5. Set Session Replay to maximum privacy with all inputs and text masked.
6. Keep AI Agent Tracking disabled for rehearsal unless prompts and responses are masked before capture.
7. Run the deployed demo and capture the Novus dashboard screenshot.

`/novus-proof` remains accurate and documents the safe event contract.

## Persistence And Storage

Live Supabase/Postgres persistence was not smoke-tested because no `DATABASE_URL` or Supabase credentials were available. The Prisma-shaped adapter remains documented and validated.

Verified:

- `@clinicbrief/db` Prisma schema validation passed.
- Memory repository fallback passed case create, document, extraction, review, timeline, brief, rehearsal, and delete tests.
- Private memory storage fallback passed save/delete/hash tests.
- Real-case smoke deleted one private memory file via `DELETE /api/cases/:caseId`.

Production storage is not faked. Supabase private storage remains a production TODO documented in `docs/deployment-novus-readiness.md`.

## PDF And OCR

Server-side PDF generation was not added because the browser print/save-as-PDF plus Markdown fallback is already verified and lower risk for submission. PDF intake supports selectable text extraction and honest manual fallback. OCR remains intentionally unimplemented; image/manual fallback is acceptable for this submission.

Verified:

- `@clinicbrief/exports` tests passed.
- Real-case smoke returned `browser_print` PDF fallback plus Markdown containing the safety note.

## Verified Checks

Run from `.worktrees/submission-production-readiness` on June 19, 2026:

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
python3 /Users/abhinavgupta/.codex/skills/webdesign/scripts/website_quality_audit.py '/Users/abhinavgupta/Desktop/Mind Prod/Clinic Brief/.worktrees/submission-production-readiness/apps/web'
```

All passed.

Website quality audit:

- `P0=0 P1=0 P2=0`

Additional targeted checks passed:

- `pnpm --filter @clinicbrief/events test`
- `pnpm --filter @clinicbrief/events typecheck`
- `pnpm --filter @clinicbrief/web typecheck`
- `pnpm --filter @clinicbrief/db test`
- `pnpm --filter @clinicbrief/web test -- lib/server/private-storage.test.ts lib/server/clinic-repository/memory.test.ts`
- `pnpm --filter @clinicbrief/exports test`

## Final Smoke Evidence

Local server:

```bash
pnpm exec next dev --hostname 127.0.0.1 --port 3108
```

Synthetic/demo routes returned 200:

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

Real memory-backed case smoke passed with case id `3bfe2b55-b666-413b-b319-eedf9fbaa662`:

- `POST /api/cases`
- text note intake
- PDF upload with manual fallback
- document/source preview list
- fallback extraction from provided source text
- unsafe extraction redirect
- review confirm/edit/reject
- timeline rebuild
- pre-op brief generation with disclaimer
- rehearsal session start
- safe rehearsal answer
- unsafe rehearsal redirect
- export bundle with `browser_print` PDF fallback and Markdown
- analytics sanitizer dropped raw health, medication, prompt, response, and case id properties
- real case `/review`, `/timeline`, `/brief`, `/rehearsal`, `/export`, and `/settings` returned 200
- `DELETE /api/cases/:caseId` returned deleted receipt and removed one private memory file

Smoke result:

```json
{
  "ok": true,
  "caseId": "3bfe2b55-b666-413b-b319-eedf9fbaa662",
  "publicRoutes": 10,
  "realCasePages": 6,
  "deletedFiles": 1
}
```

## Remaining Manual Submission Tasks

1. Merge this branch to `main`.
2. Deploy `main` to Vercel using the documented settings.
3. Replace `https://YOUR-VERCEL-URL` placeholders in submission materials.
4. Install the real Novus/Pendo dashboard snippet on the deployed URL.
5. Configure Session Replay maximum privacy and keep rehearsal AI Agent Tracking disabled unless masked.
6. Run the deployed demo and capture the Novus dashboard screenshot.
7. Record the under-3-minute demo video using `docs/demo-script.md`.
8. Paste `docs/devpost-submission-draft.md` into Devpost and attach the URL/screenshot/video.

## Known Risks

- Novus dashboard installation and screenshot require external account access.
- Live Supabase/Postgres persistence requires credentials and a smoke-tested migration path.
- Private Supabase Storage remains a documented production TODO.
- Server-side PDF generation and OCR are intentionally deferred to keep the submission path stable.
- Memory backend is prototype-only and should not be used for real patient data.

## Safety Boundary

ClinicBrief organizes user-provided information for appointment preparation. It does not diagnose, recommend treatment, advise medication changes, provide emergency triage, calculate clinical risk, or claim NHS/EHR integration.
