import { preopCase } from "@clinicbrief/fixtures";
import Link from "next/link";
import { ReviewClient } from "./_components/review-client";

export default async function ReviewPage({ params }: { params: Promise<{ caseId: string }> }) {
  const { caseId } = await params;
  const isDemoCase = caseId === preopCase.id;

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#F8F1E7] text-[#3D2F26]">
      <div className="mx-auto grid w-full max-w-6xl gap-5 px-4 py-4 sm:py-6">
        <nav aria-label="Primary" className="flex min-h-11 items-center justify-between">
          <Link className="rounded-full px-3 py-2 text-lg font-extrabold text-[#3D2F26] hover:bg-[#FFFDF8]" href="/">
            ClinicBrief
          </Link>
          <div className="flex items-center gap-2 text-sm font-bold">
            <Link className="rounded-full px-3 py-2 text-[#5C4A3E] hover:bg-[#FFFDF8]" href={`/cases/${caseId}`}>
              Hub
            </Link>
            <Link className="rounded-full px-3 py-2 text-[#5C4A3E] hover:bg-[#FFFDF8]" href="/privacy">
              Privacy
            </Link>
          </div>
        </nav>

        <section className="mx-auto grid w-full max-w-[44rem] gap-3 text-center">
          <p className="text-sm font-extrabold uppercase tracking-[0.12em] text-[#C8553D]">
            {isDemoCase ? "Synthetic demo review" : "Review before sharing"}
          </p>
          <h1 className="text-4xl font-semibold leading-tight sm:text-5xl">Check the key points</h1>
          <p className="mx-auto max-w-[38rem] text-base font-medium leading-7 text-[#8A7A6E]">
            {isDemoCase
              ? "This screen uses built-in sample pre-op documents, so the asthma and medication examples are synthetic demo facts."
              : "Only reviewed source material from your conversation and uploaded documents should appear here."}
          </p>
        </section>

        <ReviewClient caseId={caseId} />
      </div>
    </main>
  );
}
