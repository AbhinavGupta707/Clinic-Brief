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
FIREWORKS_MODEL=accounts/fireworks/models/deepseek-v3p1
CLINICBRIEF_REQUIRE_AI=true
NEXT_PUBLIC_SUPABASE_URL=https://PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
SUPABASE_STORAGE_BUCKET=clinicbrief
# Preferred Novus/Pendo server Track API key from the generated install PR. Keep server-only.
PENDO_INTEGRATION_KEY=...
# Optional browser SDK keys from the Novus/Pendo dashboard-generated install details.
NEXT_PUBLIC_PENDO_API_KEY=...
NEXT_PUBLIC_NOVUS_CLIENT_KEY=...
```

If the deployment uses the memory backend, the synthetic demo and local real-case fallback remain available, but uploaded case state is process memory and should be treated as prototype-only.

## Novus/Pendo Install Steps

Novus installation is blocked locally until a real dashboard-generated key/snippet is available. Do not fake installation.

External steps:

1. Open the Novus/Pendo dashboard and create or select the ClinicBrief web app.
2. Connect the GitHub repository and authorize the Novus GitHub app for the ClinicBrief repo/branch.
3. Let Novus scan the codebase. If Novus creates an official install PR, review it for privacy settings and merge that PR rather than hand-writing competing snippet code.
4. The generated Novus PR used a Pendo server Track API integration key named `PENDO_INTEGRATION_KEY`. Add that key to Vercel Production as a server-only environment variable. Do not expose it with a `NEXT_PUBLIC_` prefix.
5. If the dashboard also provides a public browser SDK key, add it to Vercel as `NEXT_PUBLIC_PENDO_API_KEY` or `NEXT_PUBLIC_NOVUS_CLIENT_KEY`. This is optional when `PENDO_INTEGRATION_KEY` is configured.
6. Keep any other server-only Novus key private. Do not expose it in client components, screenshots, browser logs, or analytics props.
7. The `/api/events` route forwards only sanitized props to the Pendo Track API when `PENDO_INTEGRATION_KEY` is present. It never forwards case ids, prompts, responses, transcripts, messages, source quotes, file names, or free text.
8. The root layout includes `NovusPendoProvider`, which loads the Pendo browser agent only when a public key is present. It initializes an anonymous visitor id from local storage and a generic `clinicbrief-public-demo` account id. It does not use case ids, names, emails, document names, or health-content-derived identifiers.
9. Configure Session Replay to maximum privacy with all inputs and text masked.
10. Use AI Agent Tracking only with the masked rehearsal lifecycle events in `trackAgentEvent`; do not send prompts, responses, messages, transcripts, case ids, or source content to Novus.
11. Deploy, open the public URL, and run the synthetic demo flow plus the live guided create flow.
12. Visit `/novus-proof` and verify the listed events only include mode, counts, confidence bands, and brief type.
13. Capture the Novus dashboard screenshot showing ClinicBrief activity and no raw health content.

The existing event wrapper posts to `/api/events` for sanitizer proof and server Track API forwarding. It also calls `window.pendo.track(eventName, safeProps)` only after unsafe props are dropped and only if the optional browser SDK is loaded. Without `PENDO_INTEGRATION_KEY`, a public dashboard key, or a generated snippet, Novus remains uninstalled and `/novus-proof` says so honestly.

## Persistence And Storage

Live Postgres/Supabase smoke testing was not feasible in this local environment because no `DATABASE_URL` or Supabase credentials were present. The Prisma-shaped adapter remains opt-in through:

```bash
CLINICBRIEF_DATA_BACKEND=prisma
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/clinicbrief
```

Private cloud file storage is not faked. The storage adapter uses private in-memory URLs and delete cleanup for the prototype path, or real Supabase Storage private bucket writes and delete-by-case cleanup when explicitly configured.

Storage backend selection is explicit:

```bash
CLINICBRIEF_STORAGE_BACKEND=memory
CLINICBRIEF_STORAGE_BACKEND=supabase
```

`memory` is the default when `CLINICBRIEF_STORAGE_BACKEND` is unset. Supabase Storage is used only when all of these are present in the server environment:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://PROJECT.supabase.co
SUPABASE_SERVICE_ROLE_KEY=...
SUPABASE_STORAGE_BUCKET=clinicbrief
```

The service role key must remain server-only. Do not expose it through client components, `NEXT_PUBLIC_` variables, screenshots, analytics, or browser logs.

Supabase private object paths are case scoped:

```txt
cases/{caseId}/{uuid}-{safeName}
```

Case deletion lists objects by the `cases/{caseId}/` prefix and deletes the returned object keys before marking repository records deleted. If Supabase storage is selected without the required env, uploads/deletes fail closed instead of falling back to fake cloud storage.

Live Supabase upload/delete smoke, once credentials are available:

```bash
CLINICBRIEF_STORAGE_BACKEND=supabase \
NEXT_PUBLIC_SUPABASE_URL=https://PROJECT.supabase.co \
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY \
SUPABASE_STORAGE_BUCKET=clinicbrief \
node -e 'const url=process.env.NEXT_PUBLIC_SUPABASE_URL.replace(/\/+$/,"");const bucket=process.env.SUPABASE_STORAGE_BUCKET;const key="cases/smoke-storage-"+Date.now()+"/synthetic-note.txt";const headers={apikey:process.env.SUPABASE_SERVICE_ROLE_KEY,authorization:`Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`};(async()=>{let r=await fetch(`${url}/storage/v1/object/${bucket}/${key}`,{method:"POST",headers:{...headers,"content-type":"text/plain","x-upsert":"false"},body:"synthetic smoke file"});if(!r.ok)throw new Error(`upload ${r.status}`);r=await fetch(`${url}/storage/v1/object/${bucket}`,{method:"DELETE",headers:{...headers,"content-type":"application/json"},body:JSON.stringify({prefixes:[key]})});if(!r.ok)throw new Error(`delete ${r.status}`);console.log(`Supabase storage smoke uploaded and deleted ${key}`);})().catch((error)=>{console.error(error);process.exit(1);})'
```

`/api/health` and `/api/system-readiness` report whether storage is using the private memory fallback or whether Supabase storage has been selected with required env present. The readiness payload lists env variable names only and never returns secret values, bucket names, object keys, file names, source text, or source quotes.

## Readiness And Smoke Contracts

The readiness endpoints classify app URL, AI, database, storage, and Novus as configured, fallback, misconfigured, or unconfigured. Missing Fireworks credentials are a safe fallback; selecting Prisma without `DATABASE_URL` or Supabase storage without required private storage env is misconfigured.

Executable smoke scripts are available:

```bash
pnpm smoke:memory
pnpm smoke:ai
pnpm smoke:db
pnpm smoke:storage
pnpm smoke:full
```

`smoke:memory` and fallback `smoke:full` run without external credentials. `smoke:ai`, `smoke:db`, and `smoke:storage` require their provider env and fail clearly with missing variable names when not configured.

## PDF And OCR

The current export path can return a server-generated PDF when feasible and keeps browser print/save-as-PDF plus Markdown download/copy as resilient fallbacks.

PDF intake extracts selectable text and falls back honestly to manual paste for malformed or scanned PDFs. OCR remains optional and should not be added until deployment and Novus proof are complete.
