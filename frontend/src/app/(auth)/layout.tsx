import Link from "next/link";
import type { ReactNode } from "react";
import { RetrievalField } from "@/components/retrieval-field";
import { ThemeToggle } from "@/components/theme-toggle";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="grain grid min-h-dvh lg:grid-cols-[1.05fr_1fr]">
      <aside className="relative hidden flex-col justify-between overflow-hidden border-r border-line bg-paper-raised p-12 lg:flex">
        <div className="pointer-events-none absolute inset-0 opacity-60">
          <RetrievalField />
        </div>
        <div className="relative">
          <Link href="/" className="flex items-center gap-3">
            <span className="grid h-8 w-8 place-items-center rounded-xs border border-ink/80 font-serif text-sm">
              DC
            </span>
            <span className="font-mono text-xs uppercase tracking-[0.2em] text-ink-soft">
              DocuChat
            </span>
          </Link>
        </div>
        <div className="relative max-w-md">
          <p className="font-mono text-xs uppercase tracking-[0.22em] text-accent">
            Retrieval, grounded
          </p>
          <h2 className="mt-5 font-serif text-4xl leading-tight text-ink">
            Ask your documents. Get answers you can trace.
          </h2>
          <p className="mt-5 text-ink-soft">
            Upload PDFs, chat with them, and see exactly which passages every answer
            came from.
          </p>
        </div>
        <p className="relative font-mono text-[0.7rem] uppercase tracking-[0.16em] text-muted">
          Oluwasayo Akinkunmi
        </p>
      </aside>

      <main className="flex min-h-dvh flex-col">
        <header className="flex items-center justify-between px-6 py-5">
          <Link
            href="/"
            className="font-mono text-[0.7rem] uppercase tracking-[0.18em] text-muted transition-colors hover:text-ink"
          >
            ← Back home
          </Link>
          <ThemeToggle />
        </header>
        <div className="flex flex-1 items-center justify-center px-6 pb-16">
          <div className="w-full max-w-sm">{children}</div>
        </div>
      </main>
    </div>
  );
}
