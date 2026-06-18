# ClinicBrief Build-Ready Product and Implementation Specification

**Working title:** ClinicBrief  
**Tagline:** Tell your health story once. Bring the right version to every appointment.  
**Primary hackathon:** Mind the Product World Product Day 2026  
**Document status:** Build-ready handoff for Codex/engineering agents.  
**Primary constraint:** Public web URL. No diagnosis, no treatment recommendations, no NHS/EHR integration.

---

## 0. One-paragraph build instruction for coding agents

Build a public web app that helps a patient or carer organize messy health documents, notes, medications, symptom logs, and appointment context into a consistent appointment-ready brief. The product must upload PDFs/images/text notes, extract facts into a longitudinal timeline, ask missing-context questions, generate a one-page doctor/nurse/pre-op brief, support appointment rehearsal through chat and optional browser speech recognition, and export a PDF. It must be framed as organization and appointment preparation, not diagnosis or medical advice. Use Fireworks for extraction/synthesis through strict JSON schemas. Use Supabase for storage/DB. Add privacy controls, consent, delete-all-data, and Novus event tracking without sending raw medical data to analytics.

---

## 1. Hackathon fit and success criteria

### Why this can win

ClinicBrief has immediate emotional clarity: patients often repeat their story to many clinicians and forget important details under stress. The product transforms scattered information into a coherent timeline and appointment brief. It is easier to build reliably than RenovationTwin and less infrastructure-heavy than SwarmProof.

It scores on:

- **Product Thinking:** real, recognizable patient/carer pain.
- **Craft and Execution:** timeline, missing facts, rehearsal, PDF export.
- **Originality/Ambition:** longitudinal health memory, not generic document chat.
- **Shippedness:** public web app with synthetic demo and real upload flow.

### Definition of done for hackathon submission

A submission is complete only if deployed ClinicBrief can:

1. Create a case with explicit consent checkbox.
2. Upload PDF/text/image notes or use a sample pre-op/chronic-illness case.
3. Extract timeline events, medications, appointments, and key facts.
4. Let user edit/correct extracted facts.
5. Ask at least 5 missing-context questions.
6. Generate a doctor-ready one-page brief.
7. Generate a “tell the same story every time” handoff card.
8. Provide appointment rehearsal chat.
9. Export PDF.
10. Delete all case data.
11. Show Novus-tracked product funnel without exposing raw health content.

---

## 2. Safe product positioning

### Primary pain

Patients are often bounced between GP, triage nurse, pre-op nurse, consultant, imaging team, ward staff, admin team, insurer, and family. They forget details, tell inconsistent timelines, miss medication changes, or fail to explain what changed since the last appointment.

### Product promise

> ClinicBrief turns your messy health story into a clear, consistent appointment brief you control.

### Primary users

- Patient preparing for surgery.
- Chronic-illness patient with long symptom history.
- Carer managing a parent/child/partner’s appointments.
- Patient with multiple specialists.
- International student/worker navigating unfamiliar healthcare systems.

### Non-goals

- No diagnosis.
- No treatment recommendation.
- No medication changes.
- No emergency triage.
- No clinical decision support for clinicians.
- No NHS login/EHR integration.

### Required safety copy

Show on landing, consent, and brief pages:

> ClinicBrief organizes information you provide so you can prepare for appointments. It does not diagnose, recommend treatment, or replace medical advice. Review everything before sharing it with a clinician.

---

## 3. Core user journeys

### Journey A: reliable demo pre-op path

1. User clicks “Try sample surgery prep case.”
2. App loads synthetic documents: referral letter, medication list, pre-op questionnaire notes, symptom diary, allergy note.
3. App extracts timeline and medication list.
4. App flags missing items: allergies confirmation, last dose dates, previous anaesthetic reaction, current supplements, transport/home support.
5. User answers two questions.
6. App generates pre-op nurse brief and one-page handoff card.
7. User enters rehearsal mode and practices explaining the history.
8. App exports PDF.

### Journey B: real patient upload

1. User creates case.
2. User consents to processing sensitive health data.
3. User uploads documents or pastes notes.
4. App extracts facts and asks user to confirm.
5. User edits timeline/medications.
6. App generates brief.
7. User exports PDF and optionally deletes data.

### Journey C: carer mode

1. User chooses “I am helping someone else.”
2. App labels case as carer-managed.
3. App emphasizes “check with the person before sharing.”
4. Outputs family-friendly version plus appointment brief.

---

## 4. App routes and screens

Use Next.js App Router.

```txt
/                                  Landing page
/demo/preop                         Synthetic demo case
/cases/new                          Create case + consent
/cases/[caseId]/intake              Upload/paste notes and documents
/cases/[caseId]/review              Review extracted facts
/cases/[caseId]/timeline            Longitudinal timeline
/cases/[caseId]/brief               Appointment brief builder
/cases/[caseId]/rehearsal           Appointment rehearsal chat/voice
/cases/[caseId]/export              PDF export and share/download
/cases/[caseId]/settings            Delete data and privacy controls
/privacy                            Privacy and safety explanation
/novus-proof                        Event proof page
```

### Screen-level requirements

#### Landing

- Headline: “Tell your health story once. Bring the right version to every appointment.”
- CTA: “Try sample pre-op case” and “Create my brief.”
- Safety note visible above fold.

#### Consent/create case

Required checkbox:

> I understand this app processes health information I provide. It organizes information for appointment preparation only and does not provide medical advice.

User cannot proceed without checking.

#### Intake

Input methods:

- PDF upload.
- Image upload.
- Paste text note.
- Manual medication entry.
- Manual symptom entry.
- Optional browser speech-to-text note.

#### Review

Show extracted facts as editable cards:

- medications;
- allergies;
- conditions/history as “reported history,” not diagnoses;
- symptoms;
- appointments;
- procedures;
- open questions;
- documents.

Every extracted fact must show source document/note and confidence.

#### Timeline

- Chronological events grouped by month/week.
- Filters: symptom, medication, appointment, test/result, procedure, note.
- “What changed since last appointment?” panel.

#### Brief

Modes:

- GP brief;
- consultant brief;
- pre-op nurse brief;
- family/carer handoff;
- “tell my story in 90 seconds.”

#### Rehearsal

Chat mode:

- App plays role of pre-op nurse/consultant intake.
- Asks follow-up questions based only on missing info.
- Does not give medical advice.
- Updates brief with user-approved answers.

Optional voice:

- Use Web Speech API if available.
- Always provide text fallback.

#### Export

- Download PDF.
- Copy summary.
- Delete case.

---

## 5. Regulatory and privacy guardrails

### UK GDPR stance

Health data is special category data. The MVP must:

- obtain explicit consent before upload;
- minimize data collection;
- use private storage;
- provide delete-all-data;
- avoid analytics containing raw health text;
- use synthetic demo data by default;
- state no model training.

### MHRA/SaMD stance

Stay outside medical-device positioning by not making clinical recommendations. The product can summarize and organize user-provided information. It must not diagnose, calculate risk, recommend treatment, or tell users what medication to take.

### Prohibited outputs

The AI must refuse or redirect for:

- “What condition do I have?”
- “Should I take/stop this medication?”
- “Do I need surgery?”
- “Is this emergency serious?”
- “What dose should I take?”

Safe response pattern:

> I can help organize your notes and list questions to ask. I cannot diagnose or recommend treatment. If symptoms feel urgent or severe, contact emergency or urgent medical services.

---

## 6. Tech stack

### Required

```txt
Runtime: Node 20+
Package manager: pnpm
Frontend: Next.js App Router, TypeScript, Tailwind, shadcn/ui
Database: Supabase Postgres or Neon Postgres
Storage: Supabase Storage or Cloudflare R2
ORM: Prisma or Drizzle; use Prisma if no preference
AI provider: Fireworks through provider wrapper
PDF parsing: pdf-parse or pdfjs-dist
Image OCR: Tesseract.js optional fallback
Voice: browser Web Speech API optional; text fallback required
PDF export: @react-pdf/renderer or server-side HTML-to-PDF if available
Validation: Zod schemas for all AI outputs
Analytics: Novus install + custom trackEvent wrapper
Deployment: Vercel for web
```

### Recommended repo structure

```txt
clinicbrief/
  apps/
    web/
      app/
        cases/
        demo/
        api/
      components/
      lib/
      public/
  packages/
    types/
      clinic.ts
      extraction.ts
      api.ts
    db/
      prisma/schema.prisma
      client.ts
    ai/
      provider.ts
      prompts.ts
      safety.ts
      schemas.ts
    events/
      track.ts
      event-names.ts
    documents/
      parse-pdf.ts
      parse-image.ts
      source-map.ts
    exports/
      brief-pdf.tsx
    fixtures/
      preop-case/
  docs/
    build-spec.md
    demo-script.md
```

---

## 7. Environment variables

```bash
DATABASE_URL=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_STORAGE_BUCKET=clinicbrief
FIREWORKS_API_KEY=
FIREWORKS_MODEL=
NEXT_PUBLIC_APP_URL=
NOVUS_*              # generated by Novus install PR
```

---

## 8. Data model

### Prisma schema outline

```prisma
model PatientCase {
  id          String   @id @default(cuid())
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  title       String
  mode        CaseMode
  status      CaseStatus @default(CREATED)
  consentedAt DateTime?
  anonymousUserId String?
  documents   HealthDocument[]
  facts       ExtractedFact[]
  timeline    TimelineEvent[]
  medications Medication[]
  symptoms    SymptomLog[]
  appointments Appointment[]
  briefs      AppointmentBrief[]
  rehearsals  RehearsalSession[]
  events      EventLog[]
}

enum CaseMode {
  PREOP
  CHRONIC
  CARER
  GENERAL
}

enum CaseStatus {
  CREATED
  CONSENTED
  INTAKE_STARTED
  EXTRACTED
  REVIEWED
  BRIEF_GENERATED
  EXPORTED
  DELETED
}

model HealthDocument {
  id        String @id @default(cuid())
  caseId    String
  case      PatientCase @relation(fields: [caseId], references: [id])
  type      DocumentType
  fileName  String
  fileUrl   String?
  rawText   String?
  sourceHash String?
  createdAt DateTime @default(now())
}

enum DocumentType {
  PDF
  IMAGE
  TEXT_NOTE
  VOICE_TRANSCRIPT
  SAMPLE
}

model ExtractedFact {
  id          String @id @default(cuid())
  caseId      String
  case        PatientCase @relation(fields: [caseId], references: [id])
  sourceDocId String?
  category    FactCategory
  value       Json
  confidence  Float
  userStatus  ReviewStatus @default(UNREVIEWED)
  createdAt   DateTime @default(now())
}

enum FactCategory {
  MEDICATION
  ALLERGY
  SYMPTOM
  APPOINTMENT
  TEST_RESULT
  PROCEDURE
  HISTORY_ITEM
  QUESTION
  CONTACT
}

enum ReviewStatus {
  UNREVIEWED
  CONFIRMED
  EDITED
  REJECTED
}

model TimelineEvent {
  id          String @id @default(cuid())
  caseId      String
  case        PatientCase @relation(fields: [caseId], references: [id])
  date        DateTime?
  approximateDate String?
  type        TimelineEventType
  title       String
  description String
  sourceFactIds Json?
  createdAt   DateTime @default(now())
}

enum TimelineEventType {
  SYMPTOM_CHANGE
  MEDICATION_CHANGE
  APPOINTMENT
  TEST
  PROCEDURE
  NOTE
}

model Medication {
  id        String @id @default(cuid())
  caseId    String
  case      PatientCase @relation(fields: [caseId], references: [id])
  name      String
  dose      String?
  frequency String?
  startDate DateTime?
  endDate   DateTime?
  status    String?
  sourceFactIds Json?
}

model SymptomLog {
  id        String @id @default(cuid())
  caseId    String
  case      PatientCase @relation(fields: [caseId], references: [id])
  symptom   String
  date      DateTime?
  severity  Int?
  notes     String?
}

model Appointment {
  id        String @id @default(cuid())
  caseId    String
  case      PatientCase @relation(fields: [caseId], references: [id])
  date      DateTime?
  type      String
  clinician String?
  goal      String?
  questions Json?
}

model AppointmentBrief {
  id        String @id @default(cuid())
  caseId    String
  case      PatientCase @relation(fields: [caseId], references: [id])
  briefType BriefType
  title     String
  briefJson Json
  markdown  String
  pdfUrl    String?
  createdAt DateTime @default(now())
}

enum BriefType {
  GP
  CONSULTANT
  PREOP
  FAMILY_HANDOFF
  NINETY_SECOND_STORY
}

model RehearsalSession {
  id        String @id @default(cuid())
  caseId    String
  case      PatientCase @relation(fields: [caseId], references: [id])
  mode      String
  messages  Json
  createdAt DateTime @default(now())
}

model EventLog {
  id        String @id @default(cuid())
  caseId    String?
  case      PatientCase? @relation(fields: [caseId], references: [id])
  name      String
  props     Json?
  createdAt DateTime @default(now())
}
```

---

## 9. API contracts

All APIs return `{ ok: boolean, data?: T, error?: { code: string, message: string } }`.

```txt
POST /api/cases
Body: { title: string, mode: 'PREOP'|'CHRONIC'|'CARER'|'GENERAL', consent: true }
Returns: { caseId: string }

POST /api/cases/:id/documents
Multipart: file OR Body: { textNote: string, type: 'TEXT_NOTE' }
Returns: { documentId: string, extractedTextPreview: string }

POST /api/cases/:id/extract
Body: {}
Returns: { facts: ExtractedFact[], questions: MissingQuestion[] }

PUT /api/cases/:id/facts/:factId
Body: { userStatus: 'CONFIRMED'|'EDITED'|'REJECTED', value?: object }
Returns: { fact: ExtractedFact }

POST /api/cases/:id/timeline/rebuild
Body: {}
Returns: { timeline: TimelineEvent[] }

POST /api/cases/:id/briefs
Body: { briefType: BriefType, appointmentGoal?: string }
Returns: { briefId: string, brief: AppointmentBrief }

POST /api/cases/:id/rehearsal/message
Body: { sessionId?: string, message: string, mode: 'PREOP_NURSE'|'CONSULTANT'|'GP' }
Returns: { sessionId: string, assistantMessage: string, suggestedFactUpdates?: object[] }

POST /api/cases/:id/export-pdf
Body: { briefId: string }
Returns: { pdfUrl: string }

DELETE /api/cases/:id
Returns: { deleted: true }

POST /api/events
Body: { name: string, caseId?: string, props?: object }
Returns: { ok: true }
```

---

## 10. AI extraction and synthesis architecture

### Provider wrapper

All AI calls go through `packages/ai/provider.ts`.

```ts
export async function runClinicJson<T>({
  task,
  system,
  user,
  schema,
}: {
  task: string;
  system: string;
  user: string;
  schema: z.ZodType<T>;
}): Promise<T> {
  // Call Fireworks OpenAI-compatible endpoint.
  // Parse JSON.
  // Validate with Zod.
  // Retry once with validation error if needed.
}
```

### Extraction steps

1. Parse document text.
2. Chunk text by document and section.
3. Run extraction per chunk using strict schema.
4. Merge duplicate facts.
5. Build timeline events from confirmed and high-confidence facts.
6. Generate missing-context questions.
7. Generate brief only after user has had a review opportunity.

### Extracted fact schema

```ts
export const ExtractedFactSchema = z.object({
  category: z.enum(['MEDICATION','ALLERGY','SYMPTOM','APPOINTMENT','TEST_RESULT','PROCEDURE','HISTORY_ITEM','QUESTION','CONTACT']),
  displayText: z.string(),
  date: z.string().optional(),
  value: z.record(z.any()),
  confidence: z.number().min(0).max(1),
  sourceQuote: z.string().max(300).optional(),
  safetyNotes: z.array(z.string()).default([]),
});
```

Do not include long source quotes in analytics. They can appear in the user UI as provenance.

### Missing question schema

```ts
export type MissingQuestion = {
  id: string;
  priority: 'low' | 'medium' | 'high';
  question: string;
  whyItMattersForAppointment: string;
  answerType: 'short_text' | 'date' | 'yes_no' | 'medication' | 'allergy';
};
```

### Brief schema

```ts
export type ClinicBriefOutput = {
  title: string;
  oneLineReasonForVisit: string;
  ninetySecondStory: string;
  keyTimeline: Array<{ dateLabel: string; event: string }>;
  currentMedications: Array<{ name: string; dose?: string; frequency?: string; notes?: string }>;
  allergiesAndImportantNotes: string[];
  whatChangedSinceLastAppointment: string[];
  questionsForClinician: string[];
  openUncertainties: string[];
  sourceCoverage: Array<{ section: string; sourceCount: number }>;
  safetyDisclaimer: string;
};
```

---

## 11. Prompts

### Extraction system prompt

> You extract appointment-preparation facts from user-provided health documents. You do not diagnose, recommend treatment, infer conditions not stated, or decide urgency. Extract only what the source says or what the user has entered. If uncertain, lower confidence and add an open question. Return only JSON matching the schema.

### Missing questions prompt

> Given the confirmed facts and appointment mode, ask questions that help the user tell a clearer story at an appointment. Questions must be about missing history, dates, medications, allergies, symptoms, appointments, support needs, or documents. Do not ask diagnostic questions that imply a condition. Do not recommend treatment.

### Brief prompt

> Create a concise appointment brief from confirmed facts. The brief is for the patient to review and optionally share with a clinician. Do not diagnose or recommend treatment. Clearly label uncertainties. Preserve the user’s voice where possible. Return JSON and Markdown.

### Rehearsal prompt

> You are simulating an appointment intake conversation to help the user practice telling their story. Ask one question at a time. Use only the case facts and missing questions. Do not provide medical advice. If the user asks for diagnosis or treatment, say you can help organize questions for their clinician but cannot advise.

---

## 12. Document parsing implementation

### PDF

- Use `pdf-parse` or `pdfjs-dist` for text extraction.
- If extracted text length is below threshold, mark document as image/scanned and offer OCR/manual paste.

### Image OCR

- Optional with Tesseract.js.
- Do not block MVP on OCR. User can paste text if OCR fails.

### Voice

- Optional browser SpeechRecognition.
- MDN notes SpeechRecognition has limited availability, so always provide typed fallback.
- Store transcript only after user confirms.

### Source mapping

For each fact:

- source document id;
- source type;
- source quote/snippet;
- confidence;
- user review status.

---

## 13. Novus and analytics plan

Events:

```ts
export const Events = {
  CaseCreated: 'case_created',
  ConsentAccepted: 'consent_accepted',
  DocumentUploaded: 'document_uploaded',
  TextNoteAdded: 'text_note_added',
  ExtractionStarted: 'extraction_started',
  ExtractionCompleted: 'extraction_completed',
  FactConfirmed: 'fact_confirmed',
  FactEdited: 'fact_edited',
  MissingQuestionAnswered: 'missing_question_answered',
  TimelineBuilt: 'timeline_built',
  BriefGenerated: 'brief_generated',
  RehearsalStarted: 'rehearsal_started',
  RehearsalMessageSent: 'rehearsal_message_sent',
  PdfExported: 'pdf_exported',
  CaseDeleted: 'case_deleted',
} as const;
```

Allowed event properties:

- case mode;
- document count;
- fact count;
- brief type;
- confidence bands;
- number of questions answered.

Forbidden event properties:

- raw medical text;
- medication names;
- symptom names;
- document filenames if personal;
- user-entered narratives.

---

## 14. Security and privacy implementation

- Require consent before upload.
- Use RLS if Supabase auth is implemented; for anonymous MVP, use unguessable case IDs and no public list endpoints.
- Files private by default.
- Delete endpoint removes DB rows and storage objects.
- Add `no_train` product copy.
- Use short retention copy: “Delete any time. Hackathon prototype, do not upload data you are not comfortable testing.”
- For demo, strongly route judges to synthetic case first.

---

## 15. Demo fixtures

Create `packages/fixtures/preop-case`:

```txt
referral-letter.txt
medication-list.txt
preop-phone-notes.txt
symptom-diary.txt
allergy-note.txt
previous-appointment-summary.txt
```

Synthetic story:

- Patient preparing for knee/shoulder surgery.
- Has asthma, prior nausea after anaesthetic, medication list, supplement use, allergy uncertainty, recent infection note, transport/support concern.
- The app should flag missing/important items for pre-op call without recommending clinical action.

Prebuilt expected outputs:

```txt
expected-facts.json
expected-timeline.json
expected-brief.json
```

These make demo fallback deterministic.

---

## 16. Acceptance tests

### Unit tests

- AI JSON schemas validate fixtures.
- Safety filter blocks diagnosis/treatment prompts.
- Brief output includes disclaimer.
- Events reject forbidden properties.
- Delete cascade removes case rows.

### E2E tests

1. Open `/demo/preop`.
2. Load synthetic case.
3. Run extraction.
4. Confirm at least one fact.
5. Generate brief.
6. Start rehearsal and answer one question.
7. Export PDF.
8. Delete case.

### Manual demo acceptance

- Synthetic case brief generated in under 90 seconds.
- Timeline visually shows event history.
- Missing questions are specific and useful.
- Rehearsal asks relevant follow-up questions.
- PDF opens and is readable.
- Safety copy is visible.

---

## 17. Parallel Codex workstreams

### Merge strategy

1. Foundation creates shared schemas, safety rules, DB schema, routes.
2. Document parsing and UI can proceed in parallel using fixture text.
3. AI extraction can proceed with fixture text and stubbed DB.
4. PDF export can proceed from expected brief JSON.
5. Merge order: foundation → fixtures/demo → intake/parser → extraction/review → timeline/brief → rehearsal/export → analytics/privacy polish.

### Workstream A: Foundation and safety scaffold

**Branch:** `agent/clinic-foundation`  
**Owns:** root config, package setup, Prisma schema, shared types, safety rules, event names, placeholder routes.  
**Goal command:**

> Create the ClinicBrief monorepo with Next.js App Router, TypeScript, Tailwind, shadcn/ui, Prisma schema, shared clinic/extraction types, safety guardrail utilities, event names, consent route, and placeholder pages. Ensure `pnpm lint`, `pnpm typecheck`, and `pnpm dev` work.

### Workstream B: Demo fixtures and synthetic case

**Branch:** `agent/clinic-fixtures-demo`  
**Owns:** `packages/fixtures/preop-case/**`, `/demo/preop`.  
**Goal command:**

> Create the synthetic pre-op case fixture with text documents, expected facts/timeline/brief JSON, and a demo route that loads the fixture into the app. Do not use real patient data.

### Workstream C: Intake and document parsing

**Branch:** `agent/clinic-intake-parser`  
**Owns:** `/cases/[id]/intake`, document upload APIs, `packages/documents/**`.  
**Goal command:**

> Implement case intake with consent check, PDF/text/image upload, text extraction, manual paste fallback, storage, and source preview. Add optional browser speech-to-text note input with text fallback.

### Workstream D: AI extraction and fact review

**Branch:** `agent/clinic-extraction-review`  
**Owns:** `packages/ai/**`, extraction API, `/cases/[id]/review`.  
**Goal command:**

> Implement Fireworks-backed extraction into strict Zod schemas, missing question generation, source/confidence display, and editable fact review cards. Include deterministic fallback using expected fixture JSON.

### Workstream E: Timeline and brief generation

**Branch:** `agent/clinic-timeline-brief`  
**Owns:** `/timeline`, `/brief`, timeline rebuild API, brief API.  
**Goal command:**

> Implement longitudinal timeline construction, “what changed since last appointment,” appointment brief generation, brief modes, and source coverage. Use confirmed facts and never produce diagnosis/treatment recommendations.

### Workstream F: Rehearsal and export

**Branch:** `agent/clinic-rehearsal-export`  
**Owns:** `/rehearsal`, `/export`, `packages/exports/**`.  
**Goal command:**

> Implement appointment rehearsal chat with safety guardrails, optional speech input, PDF export of brief and handoff card, and copy/download actions. Use fixture brief data if backend is unavailable.

### Workstream G: Privacy, delete, Novus/events polish

**Branch:** `agent/clinic-privacy-analytics`  
**Owns:** `/privacy`, `/settings`, `/novus-proof`, delete endpoint, event wrapper.  
**Goal command:**

> Implement consent audit, delete-all-data, privacy copy, prohibited analytics property filter, event tracking across all flows, and `/novus-proof`. Do not include raw medical text in events.

---

## 18. Implementation schedule

### Day/night 1

- Foundation repo.
- Synthetic pre-op fixture.
- Intake/upload/paste.
- Basic extraction with fallback fixture.
- Review cards.

### Day/night 2

- Fireworks extraction.
- Timeline.
- Brief generation.
- Rehearsal.
- PDF export.
- Novus install.

### Final polish

- Safety guardrails.
- Delete flow.
- Visual timeline.
- Demo video.
- Novus dashboard screenshot.

---

## 19. Fallbacks and hard lines

### Fallbacks

- If PDF parsing fails, paste text.
- If OCR fails, paste text.
- If speech recognition unavailable, typed rehearsal.
- If Fireworks fails, fixture demo JSON.
- If PDF export fails, Markdown export.

### Hard lines

Do not claim:

- diagnosis;
- treatment recommendations;
- emergency triage;
- NHS integration;
- clinician-grade medical device;
- clinical risk scoring.

---


## Shared source and platform assumptions

These specs assume the following current platform constraints and capabilities:

- The Mind the Product submission must be a public deployed URL with Novus installed and a Novus dashboard screenshot. The Chrome-extension path is intentionally not used for these three product specs.
- Fireworks is the default model provider. All AI calls must go through a provider wrapper so the model can be swapped without touching product code.
- Novus/Pendo instrumentation must never receive raw health data, home floor plans, uploaded PDFs, medical text, or secret target URLs unless explicitly anonymized. Track events and state transitions, not sensitive content.
- Vercel + Supabase + Fireworks credits are the default low-cost stack. Browser execution for SwarmProof is the only likely non-free dependency unless a self-hosted worker is used.

Reference URLs for implementers:

- Novus/Pendo product memory: https://www.pendo.io/pendo-blog/introducing-novus//
- Fireworks docs: https://docs.fireworks.ai/getting-started/introduction
- Fireworks pricing: https://docs.fireworks.ai/serverless/pricing
- React Three Fiber docs: https://r3f.docs.pmnd.rs/getting-started/introduction
- Stagehand docs: https://stagehand.dev/
- Playwright trace viewer: https://playwright.dev/docs/trace-viewer
- ICO special category data: https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/lawful-basis/special-category-data/what-is-special-category-data/
- MHRA software and AI as medical device: https://www.gov.uk/government/publications/software-and-artificial-intelligence-ai-as-a-medical-device/software-and-artificial-intelligence-ai-as-a-medical-device
- London Planning Datahub: https://www.london.gov.uk/programmes-strategies/planning/digital-planning/planning-london-datahub
- Planning Data API: https://www.planning.data.gov.uk/docs
- Postcodes.io: https://postcodes.io/docs/api/
