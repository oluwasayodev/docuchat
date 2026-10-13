import type { Metadata } from "next";
import { HomeAsk } from "@/components/home/home-ask";

export const instant = false;

export const metadata: Metadata = {
  title: "Home",
  description: "Ask across your documents and trace every answer back to the page.",
};

export default function AppHome() {
  return (
    <main className="mx-auto w-full max-w-5xl px-6 pb-24 pt-20 md:pt-28">
      <div className="mx-auto max-w-[640px] text-center">
        <p className="font-mono text-[0.7rem] uppercase tracking-[0.22em] text-accent">
          Workspace
        </p>
        <h1 className="mt-4 font-serif text-4xl leading-tight text-ink md:text-5xl">
          Ask across your documents.
        </h1>
      </div>

      <div className="mt-10">
        <HomeAsk />
      </div>
    </main>
  );
}
