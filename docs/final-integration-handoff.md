# ClinicBrief Final Integration Handoff

## Branch And Worktree

- Branch: `agent/chronic-live-final-integration-takeover`
- Worktree: `.worktrees/chronic-live-final-integration-takeover`
- Base: `main` at `ce64d0b` after Workstreams 0-5 landed.
- Date verified: June 19, 2026

## Product Status

ClinicBrief is now a live appointment-preparation product path, not only a cached demo. Users can create a real case, choose chronic/ongoing mode, add guided source material, extract facts, review/edit/reject, rebuild a timeline, generate safe pattern cards for review, produce chronic-aware briefs, use browser read-back, export PDF/Markdown/print output, rehearse safely, and delete data.

The safety boundary remains unchanged: ClinicBrief organizes user-provided information for appointment preparation only. It does not diagnose, recommend treatment, advise medication changes, provide emergency triage, calculate clinical risk, or replace medical advice.

## Implemented In This Pass

- Guided live intake with typed source capture, uploaded document/manual fallback, and browser speech-to-text transcript review.
- `CHRONIC` case mode for longitudinal histories, functional impact, changes since last appointment, investigated conditions, and clinician questions.
- `/cases/[caseId]` dashboard with workflow state and next action.
- Review-first pattern cards generated from reviewed/source-backed facts only, then confirm/edit/reject before brief use.
- Chronic-aware brief/export sections with reviewed pattern cards included only after confirmation/editing.
- Browser `SpeechSynthesis` read-back for the 90-second story; no server audio and no audio storage.
- Server PDF export with browser print and Markdown/copy fallback.
- Expanded smoke coverage for dashboard, chronic mode, pattern cards, read-back UI, export, analytics sanitizer, and delete cleanup.

## Verification

Run from this worktree:

```bash
pnpm smoke:memory
pnpm smoke:full
```

Both passed in memory fallback mode with:

```json
{
  "ok": true,
  "databaseBackend": "memory",
  "storageBackend": "memory",
  "extractionSource": "fixture",
  "publicRoutes": 10,
  "realCasePages": 6,
  "documentCount": 2,
  "factCount": 9,
  "questionCount": 3,
  "timelineCount": 2,
  "patternCount": 1,
  "chronicFactCount": 7,
  "chronicSectionCount": 7,
  "deletedFiles": 1
}
```

The expanded smoke now verifies:

- public routes: `/`, `/demo/preop`, sample review/timeline/brief/rehearsal/export/settings, `/privacy`, `/novus-proof`;
- real pre-op case creation with consent;
- text note and PDF/manual fallback source intake;
- unsafe extraction redirect;
- extraction, confirm/edit/reject fact review, timeline rebuild;
- pattern-card generation and confirmation;
- brief generation with required safety disclaimer;
- brief page read-back control and privacy copy;
- rehearsal safe turn and unsafe medical-advice redirect;
- export PDF or Markdown/browser-print fallback;
- sanitized analytics dropping raw text, names, filenames, messages, and ids;
- real case dashboard and all case subpages;
- chronic case creation, extraction, reviewed facts, timeline, chronic brief sections, export page, and delete;
- delete cleanup removing the private memory file.

Credentialed smoke status in this shell:

- `pnpm smoke:ai`: skipped; `FIREWORKS_API_KEY` and `FIREWORKS_MODEL` were not present.
- `pnpm smoke:db`: skipped; `DATABASE_URL` was not present.
- `pnpm smoke:storage`: skipped; `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and `SUPABASE_STORAGE_BUCKET` were not present.

No secret values were printed.

## Deployment Notes

Minimum fallback Vercel env:

```bash
CLINICBRIEF_DATA_BACKEND=memory
CLINICBRIEF_STORAGE_BACKEND=memory
NEXT_PUBLIC_APP_URL=https://clinic-brief-web.vercel.app
```

Production-backed env:

```bash
FIREWORKS_API_KEY=...
FIREWORKS_MODEL=accounts/fireworks/models/...
DATABASE_URL=postgresql://...:6543/postgres?pgbouncer=true
CLINICBRIEF_DATA_BACKEND=prisma
CLINICBRIEF_STORAGE_BACKEND=supabase
NEXT_PUBLIC_SUPABASE_URL=https://qomtbozuxrrbpgyndqrj.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
SUPABASE_STORAGE_BUCKET=clinicbrief
NEXT_PUBLIC_APP_URL=https://clinic-brief-web.vercel.app
```

For Prisma on Supabase pooler, use the transaction pooler URL with `?pgbouncer=true` for runtime. Use schema push/migration commands only from a trusted local shell with the correct password.

## Novus Next Step

Novus remains a dashboard install step after the deployed product path is accepted. The generated Novus/Pendo PR exposed a server Track API key name, `PENDO_INTEGRATION_KEY`; add that to Vercel Production as a server-only env var, or add a public browser SDK key only if Novus provides one. Use the official Novus/Pendo flow for `https://clinic-brief-web.vercel.app`, configure Session Replay to maximum privacy with all inputs/text masked, and use AI Agent Tracking only through masked rehearsal lifecycle events without prompts, responses, transcripts, case ids, or source content.

Analytics must remain count/state only. Do not send raw health text, source quotes, medication names, symptom names, file names, prompts, responses, transcripts, messages, case ids, or free-text narratives.

## Remaining Risks

- Credentialed Fireworks, Supabase Postgres, and Supabase Storage smokes still need to be run with real env loaded.
- Memory backend is demo/prototype only and should not be used for real patient data.
- Browser speech-to-text/read-back support varies by browser; typed/readable fallback remains available.
- OCR remains deferred; scanned/image-heavy documents rely on manual fallback text.
- Novus installation and screenshot require external dashboard access.
