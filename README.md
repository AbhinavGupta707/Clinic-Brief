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
