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
    <main id="main-content" className="min-h-screen bg-clinic-surface">
      <header className="border-b border-clinic-line bg-white">
        <div className="mx-auto flex w-[min(100%-2rem,72rem)] items-center justify-between gap-4 py-4">
          <Link href="/" className="text-lg font-semibold text-clinic-ink">
            ClinicBrief
          </Link>
          <nav aria-label="Primary" className="flex items-center gap-3 text-sm text-clinic-muted">
            <Link className="rounded-md px-3 py-2 hover:bg-clinic-surface" href="/demo/preop">
              Demo
            </Link>
            <Link className="rounded-md px-3 py-2 hover:bg-clinic-surface" href="/privacy">
              Privacy
            </Link>
          </nav>
        </div>
      </header>
      <section className="mx-auto grid w-[min(100%-2rem,72rem)] gap-6 py-10">
        {eyebrow ? <p className="text-sm font-semibold uppercase tracking-[0.08em] text-clinic-primary">{eyebrow}</p> : null}
        <h1 className="max-w-3xl text-3xl font-semibold tracking-normal text-clinic-ink md:text-5xl">{title}</h1>
        <SafetyDisclaimer compact />
        {children}
      </section>
    </main>
  );
}
