# ClinicBrief Agent Instructions

## Source Of Truth

- Read `clinicbrief_agent_source_of_truth.md` first, then `clinicbrief_build_ready_spec.md`, then `docs/ui-design-brief.md` for UI work.
- Treat the build spec as product truth. Treat this file as operating guidance for Codex sessions.
- Diagnose in layer order, not by symptom: if a feature is missing, unavailable, or not listed, first check registration, discovery, install state, and official activation flows. Debug permissions and runtime only after the feature is actually present.

## Product Guardrails

- ClinicBrief organizes user-provided health information for appointment preparation. It must not diagnose, recommend treatment, provide emergency triage, recommend medication changes, calculate clinical risk, or imply clinician-grade decision support.
- Required safety copy must appear on landing, consent, and brief/export surfaces.
- Use synthetic demo data by default. Do not add real patient data to fixtures, tests, screenshots, seed data, analytics, or docs.
- Novus/Pendo analytics may track funnel/state counts only. Never send raw health text, medication names, symptom names, file names, source quotes, or free-text narratives.

## Engineering Defaults

- Stack target: Next.js App Router, TypeScript, Tailwind, shadcn/ui, Prisma, Supabase-compatible storage/data boundaries, Fireworks provider wrapper, Zod validation, PDF export, Vercel deploy.
- All AI calls go through the provider wrapper and strict Zod schemas.
- Prefer deterministic fixture fallbacks for demo-critical flows.
- Keep branch/workstream file ownership narrow. Do not refactor unrelated files.
- Run the most relevant checks before declaring done. Until better scripts exist, aim for `pnpm lint`, `pnpm typecheck`, `pnpm test`, and the demo E2E flow.

## UI Defaults

- Product screens are the hero. Prefer actual document cards, timeline rows, brief previews, rehearsal panels, and export states over generic stock photography.
- Use the design brief in `docs/ui-design-brief.md`: calm cyan/green healthcare palette, high contrast, Figtree/Noto-like system typography, Lucide icons, shadcn-style controls, restrained motion, and clear focus states.
- Keep the app work-focused and scannable. Do not create a marketing-heavy landing page, decorative gradient-orb layout, or generic AI dashboard.
- Every important flow must be usable on mobile and desktop with stable spacing, 44px touch targets, visible labels, and no overlapping text.

## Parallel Work Rules

- Worktrees require a Git repository. If Git is absent, the first foundation task must initialize the repo before parallel work starts.
- For parallel sessions, each agent must state its branch/worktree, owned files, assumptions, commands run, and remaining risks in its final handoff.
- Avoid concurrent edits to shared contracts unless the foundation branch has landed them first.
