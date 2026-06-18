import type { ClinicBriefOutput, ExtractedFact, HealthDocument, MissingQuestion, TimelineEvent } from "@clinicbrief/types";

const caseId = "sample-preop";

const now = "2026-06-19T00:00:00.000Z";

const requiredDisclaimer =
  "ClinicBrief organizes information you provide so you can prepare for appointments. It does not diagnose, recommend treatment, or replace medical advice. Review everything before sharing it with a clinician.";

const documents: HealthDocument[] = [
  {
    id: "doc-referral-letter",
    caseId,
    type: "SAMPLE",
    fileName: "referral-letter.txt",
    rawText: "Synthetic referral letter for upcoming shoulder surgery. Reports asthma history and prior nausea after anaesthetic.",
    createdAt: now
  },
  {
    id: "doc-medication-list",
    caseId,
    type: "SAMPLE",
    fileName: "medication-list.txt",
    rawText: "Synthetic medication list including inhaler and pain relief notes. Supplement use needs confirmation.",
    createdAt: now
  },
  {
    id: "doc-preop-notes",
    caseId,
    type: "SAMPLE",
    fileName: "preop-phone-notes.txt",
    rawText: "Synthetic pre-op phone note asks for allergies, transport home, and support after discharge.",
    createdAt: now
  }
];

const expectedFacts: ExtractedFact[] = [
  {
    id: "fact-asthma-history",
    caseId,
    sourceDocId: "doc-referral-letter",
    category: "HISTORY_ITEM",
    displayText: "Reported history of asthma",
    value: { label: "asthma", status: "reported_history" },
    confidence: 0.92,
    userStatus: "UNREVIEWED",
    sourceQuote: "Reports asthma history",
    createdAt: now
  },
  {
    id: "fact-prior-nausea",
    caseId,
    sourceDocId: "doc-referral-letter",
    category: "HISTORY_ITEM",
    displayText: "Prior nausea after anaesthetic was reported",
    value: { event: "prior nausea after anaesthetic" },
    confidence: 0.88,
    userStatus: "UNREVIEWED",
    sourceQuote: "prior nausea after anaesthetic",
    createdAt: now
  },
  {
    id: "fact-transport-support",
    caseId,
    sourceDocId: "doc-preop-notes",
    category: "QUESTION",
    displayText: "Transport home and support after discharge need confirmation",
    value: { topic: "transport_and_home_support" },
    confidence: 0.84,
    userStatus: "UNREVIEWED",
    sourceQuote: "transport home, and support after discharge",
    createdAt: now
  }
];

const expectedQuestions: MissingQuestion[] = [
  {
    id: "q-allergy-confirmation",
    priority: "high",
    question: "Can you confirm any allergies or say if you have no known allergies?",
    whyItMattersForAppointment: "Pre-op teams usually need allergy status clearly confirmed.",
    answerType: "allergy"
  },
  {
    id: "q-last-dose",
    priority: "high",
    question: "When did you last take each current medication or supplement?",
    whyItMattersForAppointment: "The brief should separate facts you know from items the team may need to confirm.",
    answerType: "medication"
  },
  {
    id: "q-anaesthetic-reaction",
    priority: "medium",
    question: "What happened during the previous nausea after anaesthetic, in your own words?",
    whyItMattersForAppointment: "A plain-language description can help the appointment conversation stay consistent.",
    answerType: "short_text"
  },
  {
    id: "q-recent-infection",
    priority: "medium",
    question: "Have you had any recent infection or new symptoms you want to mention at the pre-op call?",
    whyItMattersForAppointment: "This captures appointment context without giving clinical advice.",
    answerType: "yes_no"
  },
  {
    id: "q-home-support",
    priority: "medium",
    question: "Who is taking you home and who can help afterwards?",
    whyItMattersForAppointment: "Transport and home support are practical details often asked during pre-op preparation.",
    answerType: "short_text"
  }
];

const expectedTimeline: TimelineEvent[] = [
  {
    id: "timeline-prior-anaesthetic",
    caseId,
    approximateDate: "Previous surgery",
    type: "NOTE",
    title: "Prior nausea after anaesthetic",
    description: "Patient-reported history to review with the pre-op team.",
    sourceFactIds: ["fact-prior-nausea"],
    createdAt: now
  },
  {
    id: "timeline-current-preop",
    caseId,
    approximateDate: "Upcoming appointment",
    type: "APPOINTMENT",
    title: "Pre-op preparation call",
    description: "Questions remain about allergies, medication timing, supplements, transport, and support.",
    sourceFactIds: ["fact-transport-support"],
    createdAt: now
  }
];

const expectedBrief: ClinicBriefOutput = {
  title: "Pre-op nurse brief",
  oneLineReasonForVisit: "Preparing for an upcoming shoulder surgery pre-op conversation.",
  ninetySecondStory:
    "I am preparing for upcoming shoulder surgery and want to make sure I explain my history consistently. I have a reported history of asthma and I previously felt nauseous after anaesthetic. I want to confirm allergies, current medications and supplements, recent symptoms, and transport or support arrangements.",
  keyTimeline: [
    { dateLabel: "Previous surgery", event: "Prior nausea after anaesthetic was reported." },
    { dateLabel: "Upcoming appointment", event: "Pre-op details need confirmation." }
  ],
  currentMedications: [],
  allergiesAndImportantNotes: ["Allergy status needs confirmation.", "Prior nausea after anaesthetic was reported."],
  whatChangedSinceLastAppointment: ["Preparing practical pre-op details and confirming medication/supplement list."],
  questionsForClinician: [
    "What allergy or medication details should I confirm before the appointment?",
    "Is there anything specific you want me to bring to the pre-op call?",
    "What practical discharge or transport details should I have ready?"
  ],
  openUncertainties: ["Allergies", "Last dose dates", "Supplement use", "Transport and home support"],
  sourceCoverage: [
    { section: "History", sourceCount: 1 },
    { section: "Practical support", sourceCount: 1 }
  ],
  safetyDisclaimer: requiredDisclaimer
};

export const preopCase = {
  id: caseId,
  title: "Synthetic pre-op preparation case",
  documents,
  expectedFacts,
  expectedQuestions,
  expectedTimeline,
  expectedBrief
};
