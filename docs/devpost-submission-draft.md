# ClinicBrief Devpost Submission Draft

## Project title

ClinicBrief

## Tagline

Tell your health story once. Bring the right version to every appointment.

## What it does

ClinicBrief helps a patient or carer turn scattered appointment context into a clear, reviewable brief. The demo uses a synthetic pre-op case with document summaries, extracted facts, missing-context questions, brief modes, a family/carer handoff card, a 90-second story, appointment rehearsal, PDF/Markdown export fallback, delete controls, and Novus-safe analytics proof.

ClinicBrief is not a diagnostic or clinical-decision product. It organizes user-provided information for appointment preparation only.

## Who it is for

- Patients preparing for surgery or specialist appointments.
- Carers helping someone explain the same story consistently.
- People who forget dates, medication context, or practical support details under appointment stress.

## Why it matters

Patients often repeat their story to multiple clinicians and may forget important details when stressed. ClinicBrief gives them a controlled way to prepare, review, rehearse, and share the right version without claiming to replace professional medical advice.

## Built with

- Next.js App Router
- TypeScript
- Tailwind CSS
- Lucide icons
- Prisma/Supabase-compatible data model boundary
- Fireworks-ready provider wrapper with Zod validation
- Fixture fallback for the synthetic demo
- Markdown and browser print-to-PDF export fallback
- Novus/Pendo-safe event wrapper

## Privacy and safety

ClinicBrief asks for consent before processing health information, uses synthetic demo data by default, includes delete-all-data behavior, and filters analytics so Novus receives only mode, counts, confidence bands, and brief type. It does not send raw health text, source quotes, medication names, symptom names, document names, or identifiers to analytics.

Required safety copy appears on landing, brief, and export surfaces:

> ClinicBrief organizes information you provide so you can prepare for appointments. It does not diagnose, recommend treatment, or replace medical advice. Review everything before sharing it with a clinician.

## What we learned

The clearest product value came from showing the transformation, not from a generic AI chat surface: scattered synthetic documents become reviewed facts, then a timeline, a brief, a handoff card, a spoken story, and rehearsal questions. The safety boundary also shaped the product: ClinicBrief is useful because it stays focused on organization and preparation.

## Demo video outline

1. Show landing safety copy.
2. Start the synthetic pre-op case.
3. Show extracted facts and missing-context questions.
4. Generate the pre-op brief, handoff card, and 90-second story.
5. Practice one rehearsal question and show a medical-advice redirect.
6. Export with PDF/Markdown fallback.
7. Delete the case.
8. Show `/novus-proof` sanitized events.

## Remaining manual submission steps

- Deploy the public Vercel URL.
- Add the final Novus install snippet if credentials are available.
- Capture the Novus dashboard screenshot.
- Record the under-3-minute demo video.
- Paste this draft into Devpost and update the public URL.
