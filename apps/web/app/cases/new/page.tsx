import Link from "next/link";
import { NewCaseForm } from "./_components/new-case-form";

export default async function NewCasePage({ searchParams }: { searchParams: Promise<{ demo?: string }> }) {
  const params = await searchParams;

  return (
    <main className="min-h-screen bg-[#F8F1E7] text-[#3D2F26]">
      <div className="mx-auto grid w-[min(100%-2rem,68rem)] gap-8 py-6 sm:py-8">
        <nav aria-label="Primary" className="flex min-h-11 items-center justify-between">
          <Link className="rounded-full px-3 py-2 text-lg font-extrabold text-[#3D2F26] hover:bg-[#FFFDF8]" href="/">
            ClinicBrief
          </Link>
          <div className="flex items-center gap-2 text-sm font-bold">
            <Link className="rounded-full px-3 py-2 text-[#5C4A3E] hover:bg-[#FFFDF8]" href="/demo/preop">
              Demo
            </Link>
            <Link className="rounded-full px-3 py-2 text-[#5C4A3E] hover:bg-[#FFFDF8]" href="/privacy">
              Privacy
            </Link>
          </div>
        </nav>

        <section className="mx-auto grid w-full max-w-[38rem] gap-5 text-center">
          <p className="text-sm font-extrabold uppercase tracking-[0.12em] text-[#C8553D]">
            Guided appointment prep
          </p>
          <h1 className="text-4xl font-semibold leading-tight sm:text-5xl">Create your appointment pack</h1>
          <p className="mx-auto max-w-[32rem] text-base font-medium leading-7 text-[#8A7A6E]">
            A simple step-by-step flow for speech, notes, documents, review, and a patient-controlled brief.
          </p>
        </section>

        <NewCaseForm guidedDemo={params.demo === "guided"} />
      </div>
    </main>
  );
}
