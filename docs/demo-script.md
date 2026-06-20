# ClinicBrief Demo Script

Target length: 2-3 minutes. Record from `https://clinic-brief-web.vercel.app/` once the latest `main` deploy is live.

## 0:00-0:20 - Problem And Safety Boundary

Open `https://clinic-brief-web.vercel.app/`.

Say: "ClinicBrief helps patients and carers turn messy notes, documents, and appointment context into a reviewed brief they can bring to a clinician. It organizes information the user provides. It does not diagnose, recommend treatment, change medication, or replace medical advice."

Show the required safety copy above the fold.

## 0:20-0:45 - Synthetic Demo Path

Click "Try sample pre-op case" and open `/demo/preop`.

Say: "Judges can start with synthetic data, so no real patient information is needed."

Show synthetic documents, extracted facts, source provenance, missing-context questions, and the demo navigation.

## 0:45-1:15 - Real Live Case Path

Open `/cases/new`, choose "Chronic / ongoing history", accept consent, and create a case.

On the dashboard, say: "The real path starts from a blank case and tells the user the next best action."

Open intake. Show guided source capture:

- appointment goal;
- story starter with optional browser speech-to-text;
- timeline anchors;
- medicines/allergies;
- pasted/uploaded documents;
- review before extraction.

Say: "Speech capture is browser-only. ClinicBrief stores only reviewed transcript text, not audio."

## 1:15-1:50 - Review, Timeline, Pattern Cards

Run extraction on synthetic/reviewed text. Open review and confirm/edit/reject a few facts.

Open timeline and generate pattern cards.

Say: "Pattern cards are hypotheses to discuss, not conclusions. They cite source facts and must be confirmed, edited, or rejected before they are used."

Show one confirmed card and one rejected/left-unreviewed card if available.

## 1:50-2:25 - Brief, Read-Back, Export

Open brief.

Show:

- chronic appointment context;
- what changed since last appointment;
- questions for clinician;
- uncertainties;
- reviewed pattern-card note;
- required safety disclaimer.

Click "Read story" if the browser supports it.

Say: "Read-back uses browser text-to-speech. No audio is uploaded or stored."

Open export. Show server PDF download, browser print/save-as-PDF, Markdown download, and copy fallback.

## 2:25-2:45 - Rehearsal, Privacy, Novus Proof

Open rehearsal and ask one appointment-preparation question. Then type: "Should I stop this medication?" and show the safe redirect.

Open `/novus-proof`.

Say: "Analytics are limited to mode, brief type, confidence bands, and counts. The sanitizer drops raw health text, medication names, symptom names, file names, prompts, responses, transcripts, messages, and identifiers. Session Replay should use maximum privacy with all inputs masked."

## 2:45-3:00 - Delete And Close

Open settings and show the delete confirmation.

Close: "ClinicBrief is a working public-web prototype for patient-controlled appointment preparation: create, organize, review, rehearse, export, and delete."

## Submission Placeholders

- Public URL: `https://clinic-brief-web.vercel.app/`
- Novus screenshot: capture after configuring the real dashboard key, preferably `PENDO_INTEGRATION_KEY` server-side, and running this flow with maximum privacy masking.
