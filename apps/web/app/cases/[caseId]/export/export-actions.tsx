"use client";

import { useState } from "react";
import { Clipboard, Download, FileDown, Printer } from "lucide-react";
import { Events, trackEvent } from "@clinicbrief/events";
import type { ExportBundle } from "@clinicbrief/exports";
import type { BriefType, CaseMode } from "@clinicbrief/types";

export function ExportActions({
  caseId,
  briefType,
  bundle,
  mode,
  sourceCount
}: {
  caseId: string;
  briefType: BriefType;
  bundle: ExportBundle;
  mode: CaseMode;
  sourceCount: number;
}) {
  const [status, setStatus] = useState("Ready to export.");

  async function downloadServerPdf() {
    setStatus("Preparing PDF download.");
    const response = await fetch(`/api/cases/${caseId}/export`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ briefType })
    });

    const contentType = response.headers.get("content-type") ?? "";

    if (response.ok && contentType.includes("application/pdf")) {
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = bundle.pdfFileName;
      anchor.click();
      URL.revokeObjectURL(url);
      trackEvent(Events.PdfExported, { mode, briefType, sourceCount });
      setStatus("PDF download started.");
      return;
    }

    setStatus("Server PDF is unavailable. Browser print and Markdown fallback are ready.");
  }

  async function copyMarkdown() {
    await navigator.clipboard.writeText(bundle.markdown);
    setStatus("Markdown copied.");
  }

  function downloadMarkdown() {
    const blob = new Blob([bundle.markdown], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = bundle.markdownFileName;
    anchor.click();
    URL.revokeObjectURL(url);
    setStatus("Markdown download started.");
  }

  function printPdfFallback() {
    trackEvent(Events.PdfExported, { mode, briefType, sourceCount });
    setStatus("Opening print dialog. Choose Save as PDF for a PDF fallback.");
    window.print();
  }

  return (
    <section className="grid gap-3 rounded-md border border-clinic-line bg-white p-5 shadow-soft">
      <button
        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-clinic-primary px-5 py-3 font-semibold text-white transition hover:bg-cyan-800"
        onClick={downloadServerPdf}
        type="button"
      >
        <FileDown size={18} aria-hidden />
        Download PDF
      </button>
      <button
        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-clinic-success px-5 py-3 font-semibold text-white transition hover:bg-emerald-700"
        onClick={printPdfFallback}
        type="button"
      >
        <Printer size={18} aria-hidden />
        {bundle.pdfFallback.label}
      </button>
      <button
        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-clinic-line bg-white px-5 py-3 font-semibold text-clinic-ink transition hover:bg-cyan-50"
        onClick={downloadMarkdown}
        type="button"
      >
        <Download size={18} aria-hidden />
        Download Markdown
      </button>
      <button
        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-clinic-line bg-white px-5 py-3 font-semibold text-clinic-ink transition hover:bg-cyan-50"
        onClick={copyMarkdown}
        type="button"
      >
        <Clipboard size={18} aria-hidden />
        Copy Markdown
      </button>
      <p className="text-sm leading-6 text-clinic-muted" role="status">
        {status}
      </p>
    </section>
  );
}
