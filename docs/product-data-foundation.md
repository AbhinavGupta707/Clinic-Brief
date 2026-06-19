# Product Data Foundation

ClinicBrief now uses a server-side repository boundary for case data. API routes call `getClinicRepository()` instead of reading or mutating an in-memory map directly.

## Backends

Default:

```bash
CLINICBRIEF_DATA_BACKEND=memory
```

This keeps the synthetic demo and local development working without database credentials. It is also the fallback path for hackathon judging.

Prisma/Supabase-shaped backend:

```bash
CLINICBRIEF_DATA_BACKEND=prisma
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/clinicbrief
```

`supabase` and `postgres` are accepted aliases for the Prisma-backed repository. The adapter is shaped around the Prisma schema in `packages/db/prisma/schema.prisma`; production use still needs migration/generation in the target environment.

## Repository Surface

The stable server contract lives in `apps/web/lib/server/clinic-repository` and covers:

- create and read cases;
- add documents and source previews;
- save extracted facts and missing questions;
- update fact review state;
- replace timeline events;
- save appointment briefs;
- create and append rehearsal sessions;
- delete cases.

The synthetic `sample-preop` case is always available as a read-only fixture snapshot and does not require database credentials.

## Safety Notes

- The repository does not add diagnosis, treatment, triage, medication-advice, or risk-scoring behavior.
- Analytics sanitization remains separate in `packages/events`.
- Storage deletion is represented in the receipt. Private file cleanup should be implemented by the storage workstream.

## Local Checks

```bash
pnpm install
pnpm typecheck
pnpm lint
pnpm test
pnpm build
python3 /Users/abhinavgupta/.codex/skills/webdesign/scripts/website_quality_audit.py /Users/abhinavgupta/Desktop/Mind\ Prod/Clinic\ Brief/apps/web
```
