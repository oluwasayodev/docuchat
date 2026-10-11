import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Home",
  description: "Upload documents, read them, and ask questions with citations.",
};

const features = [
  {
    index: "01",
    title: "Library",
    body: "Upload PDFs and other documents. We parse, chunk, and index them so they’re ready to reason over.",
  },
  {
    index: "02",
    title: "Reader",
    body: "Open any source beside the chat. Citations link back to the exact page they came from.",
  },
  {
    index: "03",
    title: "Conversation",
    body: "Ask questions and get answers grounded in your documents, with the passages to prove it.",
  },
];

export default function AppHome() {
  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-16 md:py-24">
      <p className="font-mono text-[0.7rem] uppercase tracking-[0.22em] text-accent">
        Workspace
      </p>
      <h1 className="mt-4 max-w-2xl font-serif text-4xl leading-tight text-ink md:text-5xl">
        Your documents, answerable.
      </h1>
      <p className="mt-5 max-w-xl text-base leading-relaxed text-muted">
        Upload what you’re working with, keep it beside the conversation, and trace every
        answer back to the page it came from.
      </p>

      <div className="mt-8">
        <Link
          href="/app/workspace"
          className="inline-flex items-center gap-2 rounded-xs bg-ink px-5 py-2.5 font-mono text-[0.72rem] uppercase tracking-[0.18em] text-paper transition-colors hover:bg-accent"
        >
          Open the workspace
          <span aria-hidden>→</span>
        </Link>
      </div>

      <div className="mt-16 grid gap-px overflow-hidden rounded-xs border border-line bg-line sm:grid-cols-3">
        {features.map((feature) => (
          <div key={feature.index} className="flex flex-col gap-3 bg-paper-raised p-6">
            <span className="font-mono text-[0.7rem] tracking-[0.18em] text-accent">
              {feature.index}
            </span>
            <h2 className="font-serif text-xl text-ink">{feature.title}</h2>
            <p className="text-sm leading-relaxed text-muted">{feature.body}</p>
          </div>
        ))}
      </div>
    </main>
  );
}
