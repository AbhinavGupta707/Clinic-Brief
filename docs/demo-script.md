# ClinicBrief Demo Script

Target length: 2 minutes 30 seconds or less. Record from the deployed public URL once available.

## 0:00-0:20 - Problem and safety boundary

Open `https://YOUR-VERCEL-URL/`.

Say: "ClinicBrief helps patients and carers tell the same health story across appointments. It organizes information the user provides. It does not diagnose, recommend treatment, change medication, or replace medical advice."

Show the required safety copy above the fold.

## 0:20-0:45 - Synthetic case first

Click "Try sample pre-op case" and open `/demo/preop`.

Say: "For the hackathon demo, judges start with synthetic data. No real patient information is needed."

Point out the synthetic documents, deterministic facts, source provenance, and missing-context questions.

## 0:45-1:15 - Review to brief

Open `/cases/sample-preop/review`, then `/cases/sample-preop/timeline`, then `/cases/sample-preop/brief`.

Show confidence/source provenance on review, the chronological timeline, then the brief modes:

- GP brief
- consultant brief
- pre-op nurse brief
- family/carer handoff
- 90-second story

Say: "The same reviewed facts become the right version for the appointment, without diagnosis or treatment advice."

## 1:15-1:45 - Handoff and rehearsal

On `/cases/sample-preop/brief`, show the handoff card and 90-second story.

Open `/cases/sample-preop/rehearsal`.

Answer one appointment-prep question. Then type a prohibited medical-advice prompt such as "Should I stop this medication?" and show the safe redirect.

Say: "Rehearsal asks one preparation question at a time and refuses medical advice. AI Agent Tracking should stay off unless prompts and responses are masked."

## 1:45-2:10 - Export and delete

Open `/cases/sample-preop/export`.

Show "Print or save as PDF", "Download Markdown", and "Copy Markdown." Point out that the disclaimer remains in the output.

Open `/cases/sample-preop/settings`.

Show the delete-all-data confirmation and deletion receipt.

## 2:10-2:30 - Novus proof and submission close

Open `/novus-proof`.

Say: "Novus events are limited to mode, counts, confidence bands, and brief type. The sanitizer drops raw health text, medication names, symptom names, file names, source quotes, prompts, responses, transcripts, messages, and identifiers. Session Replay should use maximum privacy with all inputs masked."

Close: "ClinicBrief is a working public-web prototype for patient-controlled appointment preparation."

## Submission placeholders

- Public URL: `https://YOUR-VERCEL-URL`
- Novus screenshot: capture after installing the real dashboard snippet and running this flow.
