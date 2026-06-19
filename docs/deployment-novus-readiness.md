# Deployment And Novus Readiness

This runbook keeps the demo deployable without Supabase, Fireworks, or Novus credentials, while documenting the exact production activation steps.

## Vercel Deployment

Recommended project settings:

- Repository: ClinicBrief main branch.
- Root directory: `apps/web`.
- Framework preset: Next.js.
- Install command: `pnpm install --frozen-lockfile`.
- Build command: `pnpm build`.
- Node.js: 20.x or newer.

Required env for a no-credential demo deploy:

```bash
CLINICBRIEF_DATA_BACKEND=memory
CLINICBRIEF_STORAGE_BACKEND=memory
NEXT_PUBLIC_APP_URL=https://YOUR-VERCEL-URL
```

Optional production env:

```bash
CLINICBRIEF_DATA_BACKEND=prisma
CLINICBRIEF_STORAGE_BACKEND=supabase
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/clinicbrief
FIREWORKS_API_KEY=...
FIREWORKS_MODEL=accounts/fireworks/models/llama-v3p1-70b-instruct
NEXT_PUBLIC_SUPABASE_URL=https://PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
SUPABASE_STORAGE_BUCKET=clinicbrief
```

If the deployment uses the memory backend, the synthetic demo and local real-case fallback remain available, but uploaded case state is process memory and should be treated as prototype-only.

## Novus/Pendo Install Steps

Novus installation is blocked locally until a real dashboard-generated snippet or public client key is available. Do not fake installation.

External steps:

1. Open the Novus/Pendo dashboard and create or select the ClinicBrief web app.
2. Choose the official web JavaScript install flow for the deployed Vercel URL.
3. Copy the dashboard-generated snippet or public client/API key into Vercel env. Use the exact variable names required by the generated snippet; `NEXT_PUBLIC_NOVUS_CLIENT_KEY` and `NEXT_PUBLIC_PENDO_API_KEY` are placeholders only.
4. Add the real snippet to `apps/web/app/layout.tsx` or the official Novus install PR. Initialize with an anonymous visitor id that is not a case id, email address, document name, or health-content-derived identifier.
5. Configure Session Replay to maximum privacy with all inputs and text masked.
6. Leave AI Agent Tracking disabled for rehearsal unless prompts and responses are masked before they reach Novus.
7. Deploy, open the public URL, and run the synthetic demo flow.
8. Visit `/novus-proof` and verify the listed events only include mode, counts, confidence bands, and brief type.
9. Capture the Novus dashboard screenshot showing ClinicBrief activity and no raw health content.

The existing event wrapper will call `window.pendo.track(eventName, safeProps)` if a real Pendo/Novus agent exists on the page. Without the snippet, it only posts to the local `/api/events` sanitizer proof route.

## Persistence And Storage

Live Postgres/Supabase smoke testing was not feasible in this local environment because no `DATABASE_URL` or Supabase credentials were present. The Prisma-shaped adapter remains opt-in through:

```bash
CLINICBRIEF_DATA_BACKEND=prisma
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/clinicbrief
```

Private cloud file storage is not faked. The current storage adapter uses private in-memory URLs and delete cleanup for the prototype path. Production storage should implement a Supabase Storage adapter with private bucket writes, signed reads only when needed, and delete-by-case cleanup.

Storage backend selection is explicit:

```bash
CLINICBRIEF_STORAGE_BACKEND=memory
CLINICBRIEF_STORAGE_BACKEND=supabase
```

`/api/health` and `/api/system-readiness` report whether storage is using the private memory fallback or whether Supabase storage has been selected with required env present. The readiness payload lists env variable names only and never returns secret values, bucket names, object keys, file names, source text, or source quotes.

## Readiness And Smoke Contracts

The readiness endpoints classify app URL, AI, database, storage, and Novus as configured, fallback, misconfigured, or unconfigured. Missing Fireworks credentials are a safe fallback; selecting Prisma without `DATABASE_URL` or Supabase storage without required private storage env is misconfigured.

Foundation smoke script placeholders are installed:

```bash
pnpm smoke:memory
pnpm smoke:ai
pnpm smoke:db
pnpm smoke:storage
pnpm smoke:full
```

Later workstreams should replace placeholder internals with executable checks while preserving these script names.

## PDF And OCR

The current export path keeps browser print/save-as-PDF plus Markdown download/copy. This is the safest submission path in the absence of a fully smoke-tested server PDF renderer.

PDF intake extracts selectable text and falls back honestly to manual paste for malformed or scanned PDFs. OCR remains optional and should not be added until deployment and Novus proof are complete.
