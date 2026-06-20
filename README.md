# ClinicBrief

Tell your health story once. Bring the right version to every appointment.

ClinicBrief is a hackathon MVP for Mind the Product World Product Day 2026. It organizes user-provided health documents, notes, medications, symptoms, and appointment context into a patient-reviewed appointment brief. It does not diagnose, recommend treatment, or replace medical advice.

## Quickstart

```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

Open `http://localhost:3000`.

If port `3000` is already in use, Next.js will choose the next available local port.

## Repository Shape

```txt
apps/web                 Next.js App Router web app
packages/types           Shared domain/API types
packages/ai              Fireworks provider wrapper, prompts, Zod schemas, safety
packages/events          Novus-safe event names and property filtering
packages/documents       PDF/image/text parsing boundaries
packages/exports         Brief PDF/Markdown export boundaries
packages/db              Prisma schema and DB client boundary
packages/fixtures        Synthetic pre-op demo case
docs                     Demo/submission docs
```

## Agent Sources

Cold Codex sessions should read these first:

1. `AGENTS.md`
2. `clinicbrief_agent_source_of_truth.md`
3. `clinicbrief_build_ready_spec.md`
4. `clinicbrief_master_goal_prompt.md`

## Safety Positioning

Required copy:

> ClinicBrief organizes information you provide so you can prepare for appointments. It does not diagnose, recommend treatment, or replace medical advice. Review everything before sharing it with a clinician.

## Checks

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

The scaffold includes deterministic fixture fallbacks so the demo path can work before Fireworks, Supabase, or Novus credentials are wired.

## Vercel Deployment

For the hackathon demo deploy, create a Vercel project from the repo with:

- Root directory: `apps/web`
- Framework preset: Next.js
- Install command: `pnpm install --frozen-lockfile`
- Build command: `pnpm build`
- Node.js: 20.x or newer

Minimum env for a public demo:

```bash
CLINICBRIEF_DATA_BACKEND=memory
CLINICBRIEF_STORAGE_BACKEND=memory
NEXT_PUBLIC_APP_URL=https://YOUR-VERCEL-URL
```

The demo does not require Supabase, Fireworks, or Novus credentials to build. See `docs/deployment-novus-readiness.md` for the full deployment, Novus, persistence, storage, PDF, and OCR decision record.

## Data Backend

Local development defaults to `CLINICBRIEF_DATA_BACKEND=memory`, which keeps the synthetic demo and upload/review flow working without database credentials. Set `CLINICBRIEF_DATA_BACKEND=prisma` with `DATABASE_URL` to use the Prisma/Supabase-shaped repository boundary. See `docs/product-data-foundation.md`.

## Runtime Readiness

`GET /api/health` and `GET /api/system-readiness` return configured/fallback/misconfigured state for app URL, AI, database, storage, and Novus without exposing secret values. Missing Fireworks, Supabase, or Novus credentials are reported as fallback/unconfigured unless their backend has explicitly been selected.

Smoke script contracts are available:

```bash
pnpm smoke:memory
pnpm smoke:ai
pnpm smoke:db
pnpm smoke:storage
pnpm smoke:full
```

These are executable checks. `smoke:memory` and fallback `smoke:full` run without external credentials. `smoke:ai`, `smoke:db`, and `smoke:storage` fail clearly with the missing env variable names when their provider credentials are absent.

## Storage Backend

Local development defaults to `CLINICBRIEF_STORAGE_BACKEND=memory`, which stores private upload bytes in process memory and supports delete-by-case cleanup. Set `CLINICBRIEF_STORAGE_BACKEND=supabase` with `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and `SUPABASE_STORAGE_BUCKET` to use the Supabase private storage adapter. Do not expose the service-role key client-side.

## Novus Eligibility

ClinicBrief is Novus-ready but does not fake installation. Install the real dashboard-generated Novus/Pendo snippet during deployment, configure Session Replay to maximum privacy with all inputs and text masked, and use AI Agent Tracking only through masked rehearsal lifecycle events. `/novus-proof` shows the sanitized event contract.

## Final Integration

See `docs/final-integration-handoff.md` for the current demo-ready status, verified checks, smoke-tested paths, and remaining manual submission tasks.
