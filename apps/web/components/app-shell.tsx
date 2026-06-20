import Link from "next/link";
import { SafetyDisclaimer } from "./safety-disclaimer";

export function AppShell({
  title,
  eyebrow,
  children
}: {
  title: string;
  eyebrow?: string;
  children: React.ReactNode;
}) {
  return (
    <main id="main-content" className="min-h-screen bg-[#F8F1E7] text-[#3D2F26]">
      <header className="border-b border-[#EFE2D2] bg-[#FFFDF8]">
        <div className="mx-auto flex w-[min(100%-2rem,72rem)] items-center justify-between gap-4 py-4">
          <Link href="/" className="rounded-full px-3 py-2 text-lg font-extrabold text-[#3D2F26] hover:bg-[#F2ECE0]">
            ClinicBrief
          </Link>
          <nav aria-label="Primary" className="flex items-center gap-2 text-sm font-bold text-[#5C4A3E]">
            <Link className="rounded-full px-3 py-2 hover:bg-[#F2ECE0]" href="/demo/preop">
              Demo
            </Link>
            <Link className="rounded-full px-3 py-2 hover:bg-[#F2ECE0]" href="/privacy">
              Privacy
            </Link>
          </nav>
        </div>
      </header>
      <section className="mx-auto grid w-[min(100%-2rem,72rem)] gap-6 py-6 sm:py-8">
        {eyebrow ? <p className="text-sm font-extrabold uppercase tracking-[0.12em] text-[#C8553D]">{eyebrow}</p> : null}
        <h1 className="max-w-4xl text-4xl font-semibold leading-tight text-[#3D2F26] md:text-5xl">{title}</h1>
        <SafetyDisclaimer compact />
        {children}
      </section>
    </main>
  );
}
