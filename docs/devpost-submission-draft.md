# ClinicBrief Devpost Submission Draft

## Project title

ClinicBrief

## Tagline

Tell your health story once. Bring the right version to every appointment.

## Public URL

`https://clinic-brief-web.vercel.app/`

## Novus screenshot

TODO: Upload a screenshot from the Novus/Pendo dashboard after the deployed ClinicBrief URL has received sanitized demo events.

## What it does

ClinicBrief helps a patient or carer turn scattered appointment context into a clear, reviewable brief they control. It supports a synthetic pre-op demo and a real live case path with guided intake, chronic/ongoing-history mode, document or pasted-text sources, browser speech-to-text, extracted facts, missing-context questions, timeline rebuilding, review-first pattern cards, chronic-aware brief modes, browser read-back, appointment rehearsal, PDF/print/Markdown export, delete controls, and Novus-safe analytics proof.

ClinicBrief is not a diagnostic or clinical-decision product. It organizes user-provided information for appointment preparation only.

## Who it is for

- Patients preparing for surgery or specialist appointments.
- Carers helping someone explain the same story consistently.
- People with chronic or complex histories who need to explain what changed, what is confirmed, what is still being investigated, and what they want to ask.
- People who forget dates, medication context, practical support details, or key questions under appointment stress.

## Why it matters

Patients often repeat their story to multiple clinicians and may forget important details when stressed. ClinicBrief gives them a controlled way to prepare, review, rehearse, and share the right version without claiming to replace professional medical advice.

## Built with

- Next.js App Router
- TypeScript
- Tailwind CSS
- Lucide icons
- Prisma/Supabase-compatible data model boundary
- Fireworks-ready provider wrapper with Zod validation
- Deterministic memory/fixture fallback for demo-critical flows
- Browser Web Speech API for reviewed speech-to-text source capture
- Browser `SpeechSynthesis` for local read-back, with no server audio storage
- Server PDF generation plus Markdown and browser print-to-PDF fallback
- Novus/Pendo-safe event wrapper with server Track API forwarding after sanitization and optional browser SDK forwarding
- Vercel deployment target

## Privacy and safety

ClinicBrief asks for consent before processing health information, uses synthetic demo data by default, includes delete-all-data behavior, and filters analytics so Novus receives only mode, counts, confidence bands, and brief type. It does not send raw health text, source quotes, medication names, symptom names, document names, prompts, responses, transcripts, messages, or identifiers to analytics. Novus Session Replay should be configured to maximum privacy with all inputs and text masked; AI Agent Tracking is limited to masked rehearsal lifecycle events.

Required safety copy appears on landing, brief, and export surfaces:

> ClinicBrief organizes information you provide so you can prepare for appointments. It does not diagnose, recommend treatment, or replace medical advice. Review everything before sharing it with a clinician.

## What we learned

The clearest product value came from showing the transformation, not from a generic AI chat surface: messy source material becomes reviewed facts, then a timeline, safe pattern cards, a chronic-aware brief, a handoff card, a spoken story, and rehearsal questions. The safety boundary also shaped the product: ClinicBrief is useful because it stays focused on organization and preparation.

## Demo video outline

1. Open the public URL and show the landing safety copy.
2. Start the synthetic pre-op case and show source documents becoming reviewable facts.
3. Create a live chronic case, add guided source text, extract, review, and rebuild the timeline.
4. Generate/review pattern cards, then show the chronic-aware brief and browser read-back.
5. Practice one rehearsal question, show a prohibited medical-advice prompt being redirected, export, delete, and show `/novus-proof`.

## Remaining manual submission steps

- Ensure the latest `main` is deployed to the public Vercel URL.
- Configure the final Novus/Pendo dashboard key on the deployed URL, preferably `PENDO_INTEGRATION_KEY` server-side for Track API events.
- Capture the Novus dashboard screenshot showing sanitized activity.
- Record the under-3-minute demo video.
- Paste this draft into Devpost and replace the URL/screenshot placeholders.
