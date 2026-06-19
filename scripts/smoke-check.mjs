import { spawn, spawnSync } from "node:child_process";
import { createServer } from "node:net";
import process from "node:process";
import { setTimeout as delay } from "node:timers/promises";

const smokeName = process.argv[2] ?? "memory";
const cwd = process.cwd();
const knownSecretEnvNames = [
  "DATABASE_URL",
  "FIREWORKS_API_KEY",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "NEXT_PUBLIC_NOVUS_CLIENT_KEY",
  "NEXT_PUBLIC_PENDO_API_KEY",
  "NOVUS_API_KEY"
];

const syntheticTextNote = [
  "Synthetic appointment-preparation note for a pre-op planning smoke test.",
  "The synthetic patient wants to explain a knee procedure history clearly at a pre-op nurse call.",
  "The note says an inhaler is used before exercise and a supplement list should be checked at the appointment.",
  "The note says there was nausea after a previous anaesthetic.",
  "The note says a relative can provide transport and home support after the appointment.",
  "The note asks what documents should be brought to the clinic."
].join("\n");

const syntheticPdfFallbackText = [
  "Synthetic PDF manual fallback text for ClinicBrief smoke testing.",
  "The referral note mentions a pre-op appointment, a medication list to review, and a question about allergies.",
  "This text is synthetic and exists only to verify selectable-PDF/manual fallback intake."
].join("\n");

const syntheticChronicTextNote = [
  "Synthetic chronic appointment-preparation note for smoke testing.",
  "The user reports confirmed history of recurring fatigue and joint pain discussed at previous appointments.",
  "The user says a possible inflammatory condition is being investigated and is not confirmed by ClinicBrief.",
  "Baseline symptoms include fatigue, morning stiffness, and flares after busy weeks.",
  "Current medication and treatment history includes over-the-counter pain relief and physiotherapy exercises to review with the clinician.",
  "Functional impact includes sleep disruption, reduced walking distance, and difficulty keeping up with work.",
  "The main appointment goal is to explain what changed since the last appointment and ask what information the clinician needs next."
].join("\n");

const smokeChecks = {
  memory: runMemorySmoke,
  ai: runAiSmoke,
  db: runDbSmoke,
  storage: runStorageSmoke,
  full: runFullSmoke
};

if (!smokeChecks[smokeName]) {
  console.error(`Unknown smoke check: ${smokeName}`);
  console.error(`Expected one of: ${Object.keys(smokeChecks).join(", ")}`);
  process.exit(1);
}

try {
  await smokeChecks[smokeName]();
} catch (error) {
  console.error(`clinicbrief smoke:${smokeName} failed`);
  console.error(redactSecrets(error instanceof Error ? error.message : String(error)));
  process.exit(1);
}

async function runMemorySmoke() {
  console.log("clinicbrief smoke:memory");
  console.log("Running full product flow with memory data and private memory storage.");

  const result = await runFullProductSmoke({
    label: "memory",
    env: {
      CLINICBRIEF_DATA_BACKEND: "memory",
      CLINICBRIEF_STORAGE_BACKEND: "memory"
    },
    expectedDatabaseBackend: "memory",
    expectedStorageBackend: "memory",
    requireAiExtraction: false,
    requireStoredFileDelete: true
  });

  printSmokeSummary(result);
}

async function runAiSmoke() {
  console.log("clinicbrief smoke:ai");
  const missing = missingEnv(["FIREWORKS_API_KEY", "FIREWORKS_MODEL"]);

  if (missing.length > 0) {
    failMissingEnv("smoke:ai", missing);
  }

  const result = await runFullProductSmoke({
    label: "ai",
    env: {
      CLINICBRIEF_DATA_BACKEND: "memory",
      CLINICBRIEF_STORAGE_BACKEND: "memory"
    },
    expectedDatabaseBackend: "memory",
    expectedStorageBackend: "memory",
    requireAiExtraction: true,
    requireStoredFileDelete: true
  });

  printSmokeSummary(result);
}

function runDbSmoke() {
  console.log("clinicbrief smoke:db");
  const missing = missingEnv(["DATABASE_URL"]);

  if (missing.length > 0) {
    failMissingEnv("smoke:db", missing);
  }

  const result = spawnSync("pnpm", ["--filter", "@clinicbrief/db", "smoke:live"], {
    cwd,
    env: { ...process.env, CLINICBRIEF_DATA_BACKEND: "prisma" },
    encoding: "utf8"
  });

  writeProcessOutput(result.stdout);
  writeProcessOutput(result.stderr, true);

  if (result.status !== 0) {
    throw new Error(`Prisma/Postgres smoke exited with status ${result.status ?? "unknown"}.`);
  }
}

async function runStorageSmoke() {
  console.log("clinicbrief smoke:storage");
  const missing = missingEnv(["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_STORAGE_BUCKET"]);

  if (missing.length > 0) {
    failMissingEnv("smoke:storage", missing);
  }

  const result = await runFullProductSmoke({
    label: "storage",
    env: {
      CLINICBRIEF_DATA_BACKEND: "memory",
      CLINICBRIEF_STORAGE_BACKEND: "supabase"
    },
    expectedDatabaseBackend: "memory",
    expectedStorageBackend: "supabase",
    requireAiExtraction: false,
    requireStoredFileDelete: true
  });

  printSmokeSummary(result);
}

async function runFullSmoke() {
  console.log("clinicbrief smoke:full");
  const selectedDataBackend = normalizeBackend(process.env.CLINICBRIEF_DATA_BACKEND, "memory");
  const selectedStorageBackend = normalizeBackend(process.env.CLINICBRIEF_STORAGE_BACKEND, "memory");

  if (!["memory", "prisma"].includes(selectedDataBackend)) {
    throw new Error("CLINICBRIEF_DATA_BACKEND must be memory or prisma for smoke:full.");
  }

  if (!["memory", "supabase"].includes(selectedStorageBackend)) {
    throw new Error("CLINICBRIEF_STORAGE_BACKEND must be memory or supabase for smoke:full.");
  }

  const missing = [
    ...(selectedDataBackend === "prisma" ? missingEnv(["DATABASE_URL"]) : []),
    ...(selectedStorageBackend === "supabase" ? missingEnv(["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_STORAGE_BUCKET"]) : [])
  ];

  if (missing.length > 0) {
    failMissingEnv("smoke:full", missing);
  }

  const aiState = getAiEnvState();

  if (aiState === "partial") {
    failMissingEnv("smoke:full", missingEnv(["FIREWORKS_API_KEY", "FIREWORKS_MODEL"]));
  }

  const result = await runFullProductSmoke({
    label: "full",
    env: {
      CLINICBRIEF_DATA_BACKEND: selectedDataBackend,
      CLINICBRIEF_STORAGE_BACKEND: selectedStorageBackend
    },
    expectedDatabaseBackend: selectedDataBackend,
    expectedStorageBackend: selectedStorageBackend,
    requireAiExtraction: aiState === "configured",
    requireStoredFileDelete: true
  });

  printSmokeSummary(result);
}

async function runFullProductSmoke(options) {
  return withNextServer(options.env, async ({ baseUrl }) => {
    const health = await getJson(baseUrl, "/api/health");
    assert(health.ok, "Runtime readiness endpoint reported a misconfiguration.");
    assert(health.data.database.backend === options.expectedDatabaseBackend, `Expected database backend ${options.expectedDatabaseBackend}.`);
    assert(health.data.storage.backend === options.expectedStorageBackend, `Expected storage backend ${options.expectedStorageBackend}.`);

    const publicRoutes = ["/", "/demo/preop", "/cases/sample-preop/review", "/cases/sample-preop/timeline", "/cases/sample-preop/brief", "/cases/sample-preop/rehearsal", "/cases/sample-preop/export", "/cases/sample-preop/settings", "/privacy", "/novus-proof"];
    for (const route of publicRoutes) {
      await expectHttpOk(baseUrl, route);
    }

    const caseResponse = await postJson(baseUrl, "/api/cases", {
      title: `Synthetic ${options.label} smoke case`,
      mode: "PREOP",
      consent: true
    });
    const caseId = caseResponse.caseId;
    assert(caseId, "Case creation did not return a case id.");

    const textDocument = await postJson(baseUrl, `/api/cases/${caseId}/documents`, {
      type: "TEXT_NOTE",
      fileName: "synthetic-smoke-note.txt",
      text: syntheticTextNote
    });
    assert(textDocument.document.type === "TEXT_NOTE", "Text note intake did not create a text document.");

    const pdfDocument = await postMultipartDocument(baseUrl, caseId);
    assert(pdfDocument.document.type === "PDF", "PDF/manual fallback intake did not create a PDF document.");
    assert(pdfDocument.sourcePreview.needsManualFallback === false, "PDF fallback text was not accepted as usable source text.");
    assert(Boolean(pdfDocument.document.sourceHash), "Uploaded PDF fallback document did not record a source hash.");

    const documents = await getJson(baseUrl, `/api/cases/${caseId}/documents`);
    assert(documents.data.documents.length >= 2, "Document list did not include both synthetic intake sources.");
    assert(documents.data.sourcePreviews.length >= 2, "Source preview list did not include both synthetic intake sources.");

    const unsafeExtraction = await postJson(baseUrl, `/api/cases/${caseId}/extract`, {
      request: "Should I stop taking this medication before surgery?"
    });
    assert(Boolean(unsafeExtraction.safetyRedirect), "Unsafe extraction prompt was not redirected.");

    const extraction = await postJson(baseUrl, `/api/cases/${caseId}/extract`, {});
    assert(extraction.facts.length >= 3, "Extraction did not produce enough facts for confirm/edit/reject review.");
    assert(extraction.questions.length >= 1, "Extraction did not produce appointment-preparation questions.");

    if (options.requireAiExtraction) {
      assert(extraction.source === "fireworks", "Fireworks credentials were present, but extraction did not use the Fireworks provider.");
    }

    const confirmFact = extraction.facts.find((fact) => fact.category === "MEDICATION") ?? extraction.facts[0];
    const editFact =
      extraction.facts.find((fact) => fact.id !== confirmFact.id && ["SYMPTOM", "QUESTION", "HISTORY_ITEM"].includes(fact.category)) ??
      extraction.facts.find((fact) => fact.id !== confirmFact.id) ??
      extraction.facts[1];
    const rejectFact =
      extraction.facts.find((fact) => fact.id !== confirmFact.id && fact.id !== editFact.id) ??
      extraction.facts.find((fact) => fact.id !== confirmFact.id) ??
      extraction.facts[2];

    assert(confirmFact && editFact && rejectFact, "Extraction did not produce enough distinct facts for confirm/edit/reject review.");
    await patchJson(baseUrl, `/api/cases/${caseId}/facts/${confirmFact.id}`, {
      userStatus: "CONFIRMED"
    });
    await patchJson(baseUrl, `/api/cases/${caseId}/facts/${editFact.id}`, {
      userStatus: "EDITED",
      displayText: "Edited synthetic appointment-preparation fact for smoke verification."
    });
    await patchJson(baseUrl, `/api/cases/${caseId}/facts/${rejectFact.id}`, {
      userStatus: "REJECTED"
    });

    const timeline = await postJson(baseUrl, `/api/cases/${caseId}/timeline/rebuild`, {});
    assert(timeline.timeline.length >= 2, "Timeline rebuild did not include confirmed and edited facts.");

    const generatedPatterns = await postJson(baseUrl, `/api/cases/${caseId}/patterns`, {});
    assert(generatedPatterns.patternCards.length >= 1, "Pattern-card generation did not produce a reviewable card from reviewed facts.");
    const reviewedPattern = await patchJson(baseUrl, `/api/cases/${caseId}/patterns/${generatedPatterns.patternCards[0].id}`, {
      userStatus: "CONFIRMED"
    });
    assert(reviewedPattern.patternCard.userStatus === "CONFIRMED", "Pattern-card confirmation did not persist.");

    const brief = await postJson(baseUrl, `/api/cases/${caseId}/briefs`, {
      briefType: "PREOP",
      appointmentGoal: "Prepare a concise synthetic pre-op discussion."
    });
    assert(brief.briefId, "Brief generation did not return a brief id.");
    assertSafetyDisclaimer(brief.brief.briefJson.safetyDisclaimer);

    const rehearsalStart = await postJson(baseUrl, `/api/cases/${caseId}/rehearsal`, {
      mode: "PREOP_NURSE",
      message: "I want to practice explaining the appointment history."
    });
    assert(rehearsalStart.sessionId, "Rehearsal did not start a session.");

    const safeRehearsal = await postJson(baseUrl, `/api/cases/${caseId}/rehearsal`, {
      sessionId: rehearsalStart.sessionId,
      mode: "PREOP_NURSE",
      message: "I can explain the synthetic timeline and confirm practical support."
    });
    assert(safeRehearsal.assistantMessage.length > 0, "Safe rehearsal did not return an assistant message.");
    assert(
      !safeRehearsal.suggestedFactUpdates || safeRehearsal.suggestedFactUpdates.every((update) => update.type === "missing_question_answer" && update.requiresUserReview === true),
      "Safe rehearsal returned fact updates that were not review-gated."
    );

    const unsafeRehearsal = await postJson(baseUrl, `/api/cases/${caseId}/rehearsal`, {
      sessionId: rehearsalStart.sessionId,
      mode: "PREOP_NURSE",
      message: "Do I need surgery and what dose should I take?"
    });
    assert(/cannot|can't|appointment preparation/i.test(unsafeRehearsal.assistantMessage), "Unsafe rehearsal was not redirected to safe appointment preparation.");

    const exportResponse = await postExport(baseUrl, `/api/cases/${caseId}/export`, {
      briefType: "PREOP"
    });
    if (exportResponse.pdfGenerated) {
      assert(exportResponse.byteLength > 1000, "Server PDF export returned an unexpectedly small PDF.");
    } else {
      assert(exportResponse.bundle.pdfFallback.method === "browser_print", "Export did not expose the browser print PDF fallback.");
      assert(exportResponse.bundle.markdown.includes("ClinicBrief organizes information"), "Export markdown did not include the safety disclaimer.");
    }

    const analytics = await postJson(baseUrl, "/api/events", {
      name: "rehearsal_message_sent",
      caseId,
      props: {
        mode: "PREOP",
        questionCount: 2,
        answeredQuestionCount: 1,
        rawText: "filtered synthetic text",
        medicationName: "filtered synthetic medication",
        fileName: "filtered-synthetic-file.pdf",
        messageText: "filtered synthetic rehearsal message",
        caseId
      }
    });
    assert(analytics.props.mode === "PREOP", "Analytics sanitizer dropped an allowed mode prop.");
    assert(analytics.props.questionCount === 2, "Analytics sanitizer dropped an allowed count prop.");
    assert(!("rawText" in analytics.props), "Analytics sanitizer retained raw text.");
    assert(!("medicationName" in analytics.props), "Analytics sanitizer retained a medication name.");
    assert(!("fileName" in analytics.props), "Analytics sanitizer retained a file name.");
    assert(!("messageText" in analytics.props), "Analytics sanitizer retained message text.");
    assert(!("caseId" in analytics.props), "Analytics sanitizer retained a case id prop.");

    await expectHttpOk(baseUrl, `/cases/${caseId}`);
    const briefHtml = await getText(baseUrl, `/cases/${caseId}/brief?type=PREOP`);
    assert(briefHtml.includes("Read story"), "Brief page did not render the browser read-back control.");
    assert(briefHtml.includes("No audio is uploaded or stored by ClinicBrief"), "Read-back privacy copy was missing from the brief page.");

    const realCasePages = ["review", "timeline", "brief", "rehearsal", "export", "settings"];
    for (const page of realCasePages) {
      await expectHttpOk(baseUrl, `/cases/${caseId}/${page}`);
    }

    const chronic = await runChronicCaseSmoke(baseUrl, options.label);

    const deleted = await deleteJson(baseUrl, `/api/cases/${caseId}`);
    assert(deleted.deleted === true, "Delete endpoint did not mark the synthetic smoke case deleted.");
    assert(deleted.recordsMarkedDeleted >= 1, "Delete endpoint did not delete or mark case records.");
    if (options.requireStoredFileDelete) {
      assert(deleted.storageCleanup.filesRemoved >= 1, "Delete endpoint did not remove the uploaded private file.");
    }

    return {
      ok: true,
      caseId,
      publicRoutes: publicRoutes.length,
      realCasePages: realCasePages.length,
      extractionSource: extraction.source,
      documentCount: documents.data.documents.length,
      factCount: extraction.facts.length,
      questionCount: extraction.questions.length,
      timelineCount: timeline.timeline.length,
      patternCount: generatedPatterns.patternCards.length,
      chronicFactCount: chronic.factCount,
      chronicSectionCount: chronic.chronicSectionCount,
      deletedFiles: deleted.storageCleanup.filesRemoved,
      databaseBackend: health.data.database.backend,
      storageBackend: health.data.storage.backend
    };
  });
}

async function runChronicCaseSmoke(baseUrl, label) {
  const caseResponse = await postJson(baseUrl, "/api/cases", {
    title: `Synthetic ${label} chronic smoke case`,
    mode: "CHRONIC",
    consent: true
  });
  const caseId = caseResponse.caseId;
  assert(caseId, "Chronic case creation did not return a case id.");

  const document = await postJson(baseUrl, `/api/cases/${caseId}/documents`, {
    type: "TEXT_NOTE",
    fileName: "synthetic-chronic-smoke-note.txt",
    text: syntheticChronicTextNote
  });
  assert(document.document.type === "TEXT_NOTE", "Chronic text note intake did not create a text document.");

  const extraction = await postJson(baseUrl, `/api/cases/${caseId}/extract`, {});
  assert(extraction.facts.length >= 4, "Chronic extraction did not produce enough appointment-preparation facts.");
  assert(extraction.questions.length >= 1, "Chronic extraction did not produce missing questions.");

  for (const fact of extraction.facts.slice(0, 5)) {
    await patchJson(baseUrl, `/api/cases/${caseId}/facts/${fact.id}`, {
      userStatus: "CONFIRMED"
    });
  }

  const timeline = await postJson(baseUrl, `/api/cases/${caseId}/timeline/rebuild`, {});
  assert(timeline.timeline.length >= 2, "Chronic timeline rebuild did not include reviewed facts.");

  const patterns = await postJson(baseUrl, `/api/cases/${caseId}/patterns`, {});
  if (patterns.patternCards.length > 0) {
    await patchJson(baseUrl, `/api/cases/${caseId}/patterns/${patterns.patternCards[0].id}`, {
      userStatus: "CONFIRMED"
    });
  }

  const brief = await postJson(baseUrl, `/api/cases/${caseId}/briefs`, {
    briefType: "GP",
    appointmentGoal: "Prepare a synthetic chronic review discussion."
  });
  assertSafetyDisclaimer(brief.brief.briefJson.safetyDisclaimer);
  assert(brief.brief.briefJson.chronicSections, "Chronic brief did not include chronic sections.");

  const chronicSectionCount = Object.values(brief.brief.briefJson.chronicSections).reduce((sum, items) => sum + items.length, 0);
  assert(chronicSectionCount >= 2, "Chronic brief sections did not include enough reviewed context.");

  await expectHttpOk(baseUrl, `/cases/${caseId}`);
  await expectHttpOk(baseUrl, `/cases/${caseId}/brief?type=GP`);
  await expectHttpOk(baseUrl, `/cases/${caseId}/export?type=GP`);

  const deleted = await deleteJson(baseUrl, `/api/cases/${caseId}`);
  assert(deleted.deleted === true, "Chronic delete endpoint did not mark the synthetic case deleted.");

  return {
    factCount: extraction.facts.length,
    chronicSectionCount
  };
}

async function withNextServer(envOverrides, callback) {
  const port = await getFreePort();
  const baseUrl = `http://127.0.0.1:${port}`;
  const serverLogs = [];
  const child = spawn("pnpm", ["--filter", "@clinicbrief/web", "exec", "next", "dev", "--hostname", "127.0.0.1", "--port", String(port)], {
    cwd,
    env: {
      ...process.env,
      ...envOverrides,
      NEXT_PUBLIC_APP_URL: baseUrl
    },
    stdio: ["ignore", "pipe", "pipe"]
  });

  child.stdout.on("data", (chunk) => pushServerLog(serverLogs, chunk));
  child.stderr.on("data", (chunk) => pushServerLog(serverLogs, chunk));

  try {
    await waitForServer(baseUrl, child, serverLogs);
    return await callback({ baseUrl });
  } finally {
    await stopChild(child);
  }
}

async function waitForServer(baseUrl, child, serverLogs) {
  const deadline = Date.now() + 45000;

  while (Date.now() < deadline) {
    if (child.exitCode !== null) {
      throw new Error(`Next dev server exited before becoming ready.\n${serverLogs.join("\n")}`);
    }

    try {
      const response = await fetch(`${baseUrl}/api/health`);
      if (response.status === 200 || response.status === 503) {
        return;
      }
    } catch {
      // Keep polling until Next finishes compiling the first route.
    }

    await delay(500);
  }

  throw new Error(`Timed out waiting for Next dev server.\n${serverLogs.join("\n")}`);
}

async function stopChild(child) {
  if (child.exitCode !== null) {
    return;
  }

  child.kill("SIGTERM");

  const stopped = await Promise.race([
    new Promise((resolve) => child.once("exit", () => resolve(true))),
    delay(3000).then(() => false)
  ]);

  if (!stopped && child.exitCode === null) {
    child.kill("SIGKILL");
  }
}

async function getFreePort() {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      server.close(() => {
        if (address && typeof address === "object") {
          resolve(address.port);
        } else {
          reject(new Error("Could not allocate a local smoke-test port."));
        }
      });
    });
  });
}

async function postMultipartDocument(baseUrl, caseId) {
  const formData = new FormData();
  formData.set("type", "PDF");
  formData.set("fallbackText", syntheticPdfFallbackText);
  formData.set("file", new Blob(["%PDF-1.4\n% synthetic smoke fixture\n"], { type: "application/pdf" }), "synthetic-smoke.pdf");

  return requestJson(baseUrl, `/api/cases/${caseId}/documents`, {
    method: "POST",
    body: formData
  }).then((response) => response.data);
}

async function getJson(baseUrl, path) {
  return requestJson(baseUrl, path, { method: "GET" });
}

async function getText(baseUrl, path) {
  const response = await fetch(`${baseUrl}${path}`);
  const text = await response.text();

  if (!response.ok) {
    throw new Error(`GET ${path} failed with status ${response.status}.`);
  }

  return text;
}

async function postJson(baseUrl, path, body) {
  return requestJson(baseUrl, path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body)
  }).then((response) => response.data);
}

async function postExport(baseUrl, path, body) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body)
  });
  const contentType = response.headers.get("content-type") ?? "";

  if (response.ok && contentType.includes("application/pdf")) {
    const buffer = await response.arrayBuffer();
    return {
      pdfGenerated: true,
      byteLength: buffer.byteLength
    };
  }

  const text = await response.text();
  const json = parseJson(text, path);

  if (!response.ok || json.ok === false) {
    const code = json.error?.code ? ` (${json.error.code})` : "";
    const message = json.error?.message ? `: ${json.error.message}` : "";
    throw new Error(`POST ${path} failed with status ${response.status}${code}${message}`);
  }

  return {
    ...json.data,
    pdfGenerated: false
  };
}

async function patchJson(baseUrl, path, body) {
  return requestJson(baseUrl, path, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body)
  }).then((response) => response.data);
}

async function deleteJson(baseUrl, path) {
  return requestJson(baseUrl, path, { method: "DELETE" }).then((response) => response.data);
}

async function requestJson(baseUrl, path, init) {
  const response = await fetch(`${baseUrl}${path}`, init);
  const text = await response.text();
  const json = parseJson(text, path);

  if (!response.ok || json.ok === false) {
    const code = json.error?.code ? ` (${json.error.code})` : "";
    const message = json.error?.message ? `: ${json.error.message}` : "";
    throw new Error(`${init.method ?? "GET"} ${path} failed with status ${response.status}${code}${message}`);
  }

  return json;
}

async function expectHttpOk(baseUrl, path) {
  const response = await fetch(`${baseUrl}${path}`);
  if (!response.ok) {
    throw new Error(`GET ${path} failed with status ${response.status}.`);
  }
}

function parseJson(text, path) {
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Expected JSON response from ${path}.`);
  }
}

function assertSafetyDisclaimer(value) {
  assert(
    typeof value === "string" && value.includes("does not diagnose") && value.includes("replace medical advice"),
    "Generated brief did not include the required safety disclaimer."
  );
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function missingEnv(names) {
  return names.filter((name) => !process.env[name]?.trim());
}

function failMissingEnv(command, names) {
  console.error(`clinicbrief ${command} blocked`);
  console.error(`Missing required environment variable${names.length === 1 ? "" : "s"}: ${names.join(", ")}`);
  console.error("No secret values were printed. Set the missing env and rerun this smoke command.");
  process.exit(2);
}

function getAiEnvState() {
  const configured = ["FIREWORKS_API_KEY", "FIREWORKS_MODEL"].filter((name) => process.env[name]?.trim()).length;

  if (configured === 2) {
    return "configured";
  }

  if (configured === 0) {
    return "fallback";
  }

  return "partial";
}

function normalizeBackend(value, fallback) {
  return value?.trim().toLowerCase() || fallback;
}

function pushServerLog(logs, chunk) {
  const lines = redactSecrets(String(chunk))
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  logs.push(...lines);

  while (logs.length > 40) {
    logs.shift();
  }
}

function writeProcessOutput(value, stderr = false) {
  if (!value) {
    return;
  }

  const output = redactSecrets(value);
  if (stderr) {
    process.stderr.write(output);
  } else {
    process.stdout.write(output);
  }
}

function redactSecrets(value) {
  let output = value;

  for (const name of knownSecretEnvNames) {
    const secret = process.env[name];
    if (secret && secret.length >= 4) {
      output = output.split(secret).join(`[redacted:${name}]`);
    }
  }

  return output;
}

function printSmokeSummary(result) {
  console.log(
    JSON.stringify(
      {
        ok: result.ok,
        databaseBackend: result.databaseBackend,
        storageBackend: result.storageBackend,
        extractionSource: result.extractionSource,
        publicRoutes: result.publicRoutes,
        realCasePages: result.realCasePages,
        documentCount: result.documentCount,
        factCount: result.factCount,
        questionCount: result.questionCount,
        timelineCount: result.timelineCount,
        patternCount: result.patternCount,
        chronicFactCount: result.chronicFactCount,
        chronicSectionCount: result.chronicSectionCount,
        deletedFiles: result.deletedFiles
      },
      null,
      2
    )
  );
}
