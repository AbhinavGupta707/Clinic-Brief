# Prompt 8-9 Submission And Production Source Of Truth

Use this document as the local operating guide for the next sequential goal session.

## Current Baseline

`main` contains Prompt 5 and Prompt 6 full functionality.

Verified on `main`:

- `pnpm typecheck`
- `pnpm lint`
- `pnpm test`
- `pnpm build`
- website quality audit with `P0=0 P1=0 P2=0`
- full synthetic demo smoke
- full memory-backed real case smoke

See `docs/final-integration-handoff.md` for exact evidence.

## Hackathon Eligibility Priorities

ClinicBrief is for the Mind the Product / Novus hackathon.

Eligibility requires:

- public deployed URL;
- Novus.ai installed before submission;
- Novus dashboard screenshot;
- 2-3 minute demo video;
- short written description.

Judging priorities:

- Product Thinking;
- Craft and Execution;
- Originality and Ambition;
- Shippedness.

For this hackathon, Novus installation and a deployable public URL matter more than adding production-only infrastructure that judges may never see.

## Priority Order

1. Deployment and Novus eligibility.
2. Novus-safe analytics and privacy proof.
3. Submission docs/demo polish.
4. Supabase/Postgres persistence if credentials are available.
5. Supabase/private storage if credentials are available.
6. True PDF generation if low-risk.
7. OCR only if everything else is complete.

## Product Safety Boundary

ClinicBrief organizes user-provided information for appointment preparation only.

Never add:

- diagnosis;
- treatment recommendations;
- medication start, stop, or dose advice;
- emergency triage;
- clinical risk scoring;
- NHS/EHR integration claims;
- analytics containing raw health content.

Required safety copy:

> ClinicBrief organizes information you provide so you can prepare for appointments. It does not diagnose, recommend treatment, or replace medical advice. Review everything before sharing it with a clinician.

## Novus Privacy Boundary

Novus is required for eligibility, but ClinicBrief handles sensitive health information. Treat Novus configuration as a privacy-critical integration.

Do not send these to Novus/Pendo analytics:

- raw health text;
- source quotes;
- file names;
- medication names;
- symptom names;
- identifiers;
- case ids;
- free-text narratives;
- rehearsal prompts or responses unless masked or blocked.

Novus Session Replay should use Maximum Privacy or all inputs masked.

Do not enable Novus AI Agent Tracking for rehearsal unless prompts and responses are masked or blocked. The safer default is route/page/funnel analytics plus sanitized custom events only.

Keep `/novus-proof` accurate. Do not claim the final Novus snippet is installed until it actually is.

## Supabase And Storage Decision Rule

Supabase/Postgres and private file storage are useful hardening work, but they are not the hackathon eligibility gate.

Implement live persistence only if credentials are available and it can be smoke-tested without destabilizing the demo.

If credentials are not available:

- keep memory fallback;
- keep Prisma/Supabase-shaped repository boundary;
- document exact env vars and setup steps;
- do not fake cloud persistence or storage.

## PDF And OCR Decision Rule

True server-side PDF generation is valuable only if it is low-risk with existing dependencies.

If it becomes brittle, keep:

- browser print/save-as-PDF fallback;
- Markdown download/copy fallback.

OCR is lower priority. Image manual fallback is acceptable and honest for the hackathon.

## Final Acceptance Requirements

Before finishing the next goal session, run:

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
python3 /Users/abhinavgupta/.codex/skills/webdesign/scripts/website_quality_audit.py '/Users/abhinavgupta/Desktop/Mind Prod/Clinic Brief/apps/web'
```

Smoke locally:

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

Smoke real case path:

- create case;
- add text note;
- add PDF/manual fallback;
- list documents/source previews;
- extract;
- unsafe extraction redirect;
- review confirm/edit/reject;
- rebuild timeline;
- generate brief;
- rehearse safe/unsafe;
- export;
- analytics sanitizer;
- delete.

## Finish Condition

The app is deployment-ready. Novus installation is complete, or explicitly blocked on external Novus dashboard/GitHub PR access with exact next steps documented. Submission docs are ready for public URL and screenshot insertion. All final checks pass. Demo and real-case fallback still work. Branch is clean.
