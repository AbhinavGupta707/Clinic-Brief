import { PrismaClient } from "@prisma/client";
import { randomUUID } from "node:crypto";

if (!process.env.DATABASE_URL) {
  console.log("clinicbrief smoke:db skipped");
  console.log("DATABASE_URL is not set, so the live Prisma/Postgres smoke was not run.");
  process.exit(0);
}

const prisma = new PrismaClient();
const suffix = randomUUID();
const caseId = `smoke-case-${suffix}`;
const documentId = `smoke-doc-${suffix}`;
const previewId = `smoke-preview-${suffix}`;
const factId = `smoke-fact-${suffix}`;
const questionId = `smoke-question-${suffix}`;
const timelineId = `smoke-timeline-${suffix}`;
const briefId = `smoke-brief-${suffix}`;
const rehearsalId = `smoke-rehearsal-${suffix}`;

async function main() {
  await prisma.$connect();

  await prisma.patientCase.create({
    data: {
      id: caseId,
      title: "Synthetic Prisma smoke case",
      mode: "PREOP",
      status: "CONSENTED",
      consentedAt: new Date("2026-06-19T00:00:00.000Z"),
      anonymousUserId: "synthetic-smoke"
    }
  });

  await prisma.healthDocument.create({
    data: {
      id: documentId,
      caseId,
      type: "TEXT_NOTE",
      fileName: "synthetic-smoke-note.txt",
      rawText: "Synthetic appointment preparation note.",
      sourceHash: `sha256-smoke-${suffix}`
    }
  });

  await prisma.sourcePreview.create({
    data: {
      id: previewId,
      caseId,
      sourceId: documentId,
      sourceType: "TEXT_NOTE",
      documentId,
      snippet: "Synthetic appointment preparation note.",
      confidence: 0.99,
      parser: "text",
      needsManualFallback: false
    }
  });

  await prisma.extractedFact.create({
    data: {
      id: factId,
      caseId,
      sourceDocId: documentId,
      category: "APPOINTMENT",
      displayText: "Synthetic appointment preparation fact",
      value: { topic: "appointment preparation" },
      confidence: 0.94,
      userStatus: "UNREVIEWED",
      sourceQuote: "Synthetic appointment preparation note."
    }
  });

  await prisma.missingQuestion.create({
    data: {
      id: questionId,
      caseId,
      priority: "medium",
      question: "What would you like to remember to ask at the appointment?",
      whyItMattersForAppointment: "It helps keep the appointment-preparation brief complete.",
      answerType: "short_text"
    }
  });

  await prisma.timelineEvent.create({
    data: {
      id: timelineId,
      caseId,
      approximateDate: "Before appointment",
      type: "NOTE",
      title: "Synthetic appointment context captured",
      description: "A synthetic note was organized for appointment preparation.",
      sourceFactIds: [factId]
    }
  });

  await prisma.appointmentBrief.create({
    data: {
      id: briefId,
      caseId,
      briefType: "PREOP",
      title: "Synthetic pre-op brief",
      briefJson: {
        title: "Synthetic pre-op brief",
        safetyDisclaimer:
          "ClinicBrief organizes information you provide so you can prepare for appointments. It does not diagnose, recommend treatment, or replace medical advice. Review everything before sharing it with a clinician."
      },
      markdown: "# Synthetic pre-op brief"
    }
  });

  await prisma.rehearsalSession.create({
    data: {
      id: rehearsalId,
      caseId,
      mode: "PREOP_NURSE",
      messages: []
    }
  });

  const readBack = await prisma.patientCase.findUnique({
    where: { id: caseId },
    include: {
      documents: true,
      sourcePreviews: true,
      facts: true,
      questions: true,
      timeline: true,
      briefs: true,
      rehearsals: true
    }
  });

  assert(readBack, "PatientCase was not readable after create.");
  assert(readBack.documents.length === 1, "HealthDocument was not persisted.");
  assert(readBack.sourcePreviews.length === 1, "SourcePreview was not persisted.");
  assert(readBack.facts.length === 1, "ExtractedFact was not persisted.");
  assert(readBack.questions.length === 1, "MissingQuestion was not persisted.");
  assert(readBack.timeline.length === 1, "TimelineEvent was not persisted.");
  assert(readBack.briefs.length === 1, "AppointmentBrief was not persisted.");
  assert(readBack.rehearsals.length === 1, "RehearsalSession was not persisted.");

  const updatedFact = await prisma.extractedFact.update({
    where: { id: factId },
    data: { userStatus: "CONFIRMED", displayText: "Confirmed synthetic appointment preparation fact" }
  });
  assert(updatedFact.userStatus === "CONFIRMED", "ExtractedFact update failed.");

  const updatedRehearsal = await prisma.rehearsalSession.update({
    where: { id: rehearsalId },
    data: {
      messages: [
        {
          id: `smoke-message-${suffix}`,
          role: "user",
          content: "Synthetic answer for appointment rehearsal.",
          createdAt: "2026-06-19T00:00:00.000Z"
        }
      ]
    }
  });
  assert(Array.isArray(updatedRehearsal.messages) && updatedRehearsal.messages.length === 1, "RehearsalSession update failed.");

  await prisma.patientCase.delete({ where: { id: caseId } });

  const deletedCase = await prisma.patientCase.findUnique({ where: { id: caseId } });
  assert(!deletedCase, "PatientCase delete failed.");

  const orphanCounts = await Promise.all([
    prisma.healthDocument.count({ where: { caseId } }),
    prisma.sourcePreview.count({ where: { caseId } }),
    prisma.extractedFact.count({ where: { caseId } }),
    prisma.missingQuestion.count({ where: { caseId } }),
    prisma.timelineEvent.count({ where: { caseId } }),
    prisma.appointmentBrief.count({ where: { caseId } }),
    prisma.rehearsalSession.count({ where: { caseId } })
  ]);
  assert(orphanCounts.every((count) => count === 0), `Cascade delete left orphan rows: ${orphanCounts.join(", ")}`);

  console.log("clinicbrief smoke:db passed");
  console.log("Created, read, updated, and deleted a synthetic case through Prisma/Postgres.");
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

main()
  .catch(async (error) => {
    try {
      await prisma.patientCase.delete({ where: { id: caseId } });
    } catch {
      // Best-effort cleanup; the original error is more useful.
    }

    console.error("clinicbrief smoke:db failed");
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
