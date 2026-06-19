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
    fileName: "synthetic-referral-letter.txt",
    rawText:
      "Synthetic referral letter for planned right shoulder arthroscopy. Reports asthma history, previous post-operative nausea, and a pre-op phone appointment.",
    createdAt: now
  },
  {
    id: "doc-medication-list",
    caseId,
    type: "SAMPLE",
    fileName: "synthetic-medication-list.txt",
    rawText:
      "Synthetic medication list: salbutamol inhaler as needed, beclometasone inhaler twice daily, paracetamol as needed, ibuprofen used occasionally. Multivitamin and turmeric supplement need confirmation.",
    createdAt: now
  },
  {
    id: "doc-preop-notes",
    caseId,
    type: "SAMPLE",
    fileName: "synthetic-preop-phone-notes.txt",
    rawText:
      "Synthetic pre-op phone note asks for allergy status, previous anaesthetic reaction details, current medications and supplements, transport home, and support after discharge.",
    createdAt: now
  },
  {
    id: "doc-symptom-diary",
    caseId,
    type: "SAMPLE",
    fileName: "synthetic-symptom-diary.txt",
    rawText:
      "Synthetic symptom diary: shoulder pain worsened with overhead movement in March and April. Sleep interrupted on several nights. No clinical interpretation is included.",
    createdAt: now
  },
  {
    id: "doc-allergy-note",
    caseId,
    type: "SAMPLE",
    fileName: "synthetic-allergy-note.txt",
    rawText:
      "Synthetic allergy note: patient is unsure whether a childhood penicillin rash was a true allergy and wants to check what to report.",
    createdAt: now
  },
  {
    id: "doc-previous-appointment",
    caseId,
    type: "SAMPLE",
    fileName: "synthetic-previous-appointment-summary.txt",
    rawText:
      "Synthetic previous appointment summary: surgery planning moved from initial discussion to pre-op preparation. Patient asked to bring medication list and practical support details.",
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
    id: "fact-salbutamol",
    caseId,
    sourceDocId: "doc-medication-list",
    category: "MEDICATION",
    displayText: "Salbutamol inhaler listed as needed",
    value: { name: "Salbutamol inhaler", dose: "as needed", status: "current_listed" },
    confidence: 0.95,
    userStatus: "CONFIRMED",
    sourceQuote: "salbutamol inhaler as needed",
    createdAt: now
  },
  {
    id: "fact-beclometasone",
    caseId,
    sourceDocId: "doc-medication-list",
    category: "MEDICATION",
    displayText: "Beclometasone inhaler listed twice daily",
    value: { name: "Beclometasone inhaler", frequency: "twice daily", status: "current_listed" },
    confidence: 0.94,
    userStatus: "CONFIRMED",
    sourceQuote: "beclometasone inhaler twice daily",
    createdAt: now
  },
  {
    id: "fact-pain-relief",
    caseId,
    sourceDocId: "doc-medication-list",
    category: "MEDICATION",
    displayText: "Paracetamol as needed and occasional ibuprofen are listed",
    value: { names: ["Paracetamol", "Ibuprofen"], status: "current_listed", timingNeedsReview: true },
    confidence: 0.86,
    userStatus: "UNREVIEWED",
    sourceQuote: "paracetamol as needed, ibuprofen used occasionally",
    createdAt: now
  },
  {
    id: "fact-supplements",
    caseId,
    sourceDocId: "doc-medication-list",
    category: "QUESTION",
    displayText: "Multivitamin and turmeric supplement use need confirmation",
    value: { topic: "supplements", status: "needs_confirmation" },
    confidence: 0.82,
    userStatus: "UNREVIEWED",
    sourceQuote: "Multivitamin and turmeric supplement need confirmation",
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
    id: "fact-shoulder-pain",
    caseId,
    sourceDocId: "doc-symptom-diary",
    category: "SYMPTOM",
    displayText: "Shoulder pain worsened with overhead movement in March and April",
    value: { symptom: "shoulder pain", pattern: "worse with overhead movement", months: ["March", "April"] },
    confidence: 0.9,
    userStatus: "EDITED",
    sourceQuote: "shoulder pain worsened with overhead movement in March and April",
    createdAt: now
  },
  {
    id: "fact-sleep-interruption",
    caseId,
    sourceDocId: "doc-symptom-diary",
    category: "SYMPTOM",
    displayText: "Sleep was interrupted on several nights",
    value: { symptomContext: "sleep interrupted", frequency: "several nights" },
    confidence: 0.78,
    userStatus: "UNREVIEWED",
    sourceQuote: "Sleep interrupted on several nights",
    createdAt: now
  },
  {
    id: "fact-allergy-uncertain",
    caseId,
    sourceDocId: "doc-allergy-note",
    category: "ALLERGY",
    displayText: "Childhood penicillin rash is uncertain and needs clear wording",
    value: { allergen: "penicillin", status: "uncertain childhood rash" },
    confidence: 0.72,
    userStatus: "UNREVIEWED",
    sourceQuote: "unsure whether a childhood penicillin rash was a true allergy",
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
  },
  {
    id: "fact-preop-call",
    caseId,
    sourceDocId: "doc-referral-letter",
    category: "APPOINTMENT",
    displayText: "Pre-op phone appointment is the next preparation step",
    value: { appointmentType: "pre-op phone appointment", goal: "prepare for shoulder surgery" },
    confidence: 0.89,
    userStatus: "CONFIRMED",
    sourceQuote: "pre-op phone appointment",
    createdAt: now
  },
  {
    id: "fact-what-changed",
    caseId,
    sourceDocId: "doc-previous-appointment",
    category: "HISTORY_ITEM",
    displayText: "Case moved from surgery discussion to pre-op preparation",
    value: { change: "planning moved to pre-op preparation" },
    confidence: 0.91,
    userStatus: "CONFIRMED",
    sourceQuote: "surgery planning moved from initial discussion to pre-op preparation",
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
  },
  {
    id: "q-medication-list-photo",
    priority: "low",
    question: "Do you have an up-to-date medication list or photo of the labels to bring?",
    whyItMattersForAppointment: "It helps the user prepare what to share without the app deciding medication changes.",
    answerType: "yes_no"
  }
];

const expectedTimeline: TimelineEvent[] = [
  {
    id: "timeline-initial-planning",
    caseId,
    approximateDate: "Previous clinic appointment",
    type: "APPOINTMENT",
    title: "Surgery planning discussed",
    description: "The previous appointment summary says planning moved toward pre-op preparation.",
    sourceFactIds: ["fact-what-changed"],
    createdAt: now
  },
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
    id: "timeline-medication-list",
    caseId,
    approximateDate: "Current medication list",
    type: "MEDICATION_CHANGE",
    title: "Medication and supplement list gathered",
    description: "Inhalers and pain relief are listed; supplement use and last-dose timing still need confirmation.",
    sourceFactIds: ["fact-salbutamol", "fact-beclometasone", "fact-pain-relief", "fact-supplements"],
    createdAt: now
  },
  {
    id: "timeline-symptom-diary",
    caseId,
    approximateDate: "March-April 2026",
    type: "SYMPTOM_CHANGE",
    title: "Shoulder symptoms affected movement and sleep",
    description: "The symptom diary reports worse pain with overhead movement and several nights of interrupted sleep.",
    sourceFactIds: ["fact-shoulder-pain", "fact-sleep-interruption"],
    createdAt: now
  },
  {
    id: "timeline-allergy-note",
    caseId,
    approximateDate: "Before pre-op call",
    type: "NOTE",
    title: "Allergy wording needs confirmation",
    description: "The synthetic note says childhood penicillin rash is uncertain and should be clearly described.",
    sourceFactIds: ["fact-allergy-uncertain"],
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
    "I am preparing for upcoming shoulder surgery and want to make sure I explain my history consistently. My notes say I have a reported history of asthma and I previously felt nauseous after anaesthetic. My current list includes inhalers, as-needed pain relief, and possible supplements that I want to confirm accurately. Since the last appointment, the focus has moved from deciding on surgery to pre-op preparation, so I want to bring clear allergy wording, medication timing, recent symptom context, and transport or home support details.",
  keyTimeline: [
    { dateLabel: "Previous clinic appointment", event: "Surgery planning moved toward pre-op preparation." },
    { dateLabel: "Previous surgery", event: "Prior nausea after anaesthetic was reported." },
    { dateLabel: "Current list", event: "Inhalers, pain relief, and possible supplements are listed for review." },
    { dateLabel: "March-April 2026", event: "Shoulder symptoms affected overhead movement and sleep." },
    { dateLabel: "Upcoming appointment", event: "Pre-op details need confirmation." }
  ],
  currentMedications: [
    { name: "Salbutamol inhaler", frequency: "as needed", notes: "Listed in synthetic medication list." },
    { name: "Beclometasone inhaler", frequency: "twice daily", notes: "Listed in synthetic medication list." },
    { name: "Paracetamol", frequency: "as needed", notes: "Timing and last dose to confirm." },
    { name: "Ibuprofen", frequency: "occasionally", notes: "Timing and last dose to confirm with clinician." },
    { name: "Multivitamin and turmeric supplement", notes: "Use needs confirmation." }
  ],
  allergiesAndImportantNotes: [
    "Childhood penicillin rash is uncertain and needs clear wording.",
    "Prior nausea after anaesthetic was reported.",
    "Reported history of asthma appears in the referral letter."
  ],
  whatChangedSinceLastAppointment: [
    "The case has moved from surgery planning to pre-op preparation.",
    "The medication list now includes possible supplements that need confirmation.",
    "Practical discharge details, including transport and home support, are still open."
  ],
  questionsForClinician: [
    "How should I describe the uncertain childhood penicillin rash?",
    "Which medication and supplement timing details should I have ready for the pre-op call?",
    "What should I tell the team about previous nausea after anaesthetic?",
    "Is there anything specific you want me to bring or read from during the call?",
    "What practical discharge or transport details should I have ready?"
  ],
  openUncertainties: [
    "Allergy wording",
    "Last dose dates",
    "Supplement use",
    "Recent infection or new symptom context",
    "Transport and home support"
  ],
  sourceCoverage: [
    { section: "Referral and appointment context", sourceCount: 2 },
    { section: "Medication and supplement list", sourceCount: 1 },
    { section: "Symptoms and practical notes", sourceCount: 2 },
    { section: "Allergies and anaesthetic history", sourceCount: 2 }
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
