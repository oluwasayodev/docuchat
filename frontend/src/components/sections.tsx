import Link from "next/link";
import type { ReactNode } from "react";
import { Reveal } from "@/components/reveal";
import { RetrievalField } from "@/components/retrieval-field";
import { ThemeToggle } from "@/components/theme-toggle";
import { about, nav, profile, stack, stats, work } from "@/lib/content";

export function Section({
  id,
  index,
  label,
  children,
}: {
  id?: string;
  index: string;
  label: string;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      className="grid grid-cols-1 gap-x-10 gap-y-6 border-t border-line py-16 md:grid-cols-[8.5rem_minmax(0,1fr)] md:py-24"
    >
      <div className="md:sticky md:top-28 md:self-start">
        <span className="font-mono text-xs text-muted">{index}</span>
        <p className="mt-1 font-mono text-[0.7rem] uppercase tracking-[0.2em] text-accent">
          {label}
        </p>
      </div>
      <div>{children}</div>
    </section>
  );
}

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-line/70 bg-paper/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-3">
          <span className="grid h-8 w-8 place-items-center rounded-xs border border-ink/80 font-serif text-sm">
            {profile.initials}
          </span>
          <span className="hidden font-mono text-xs uppercase tracking-[0.2em] text-ink-soft sm:block">
            {profile.name}
          </span>
        </Link>
        <nav className="flex items-center gap-4">
          {nav.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="hidden font-mono text-xs uppercase tracking-[0.18em] text-muted transition-colors hover:text-ink sm:block"
            >
              {item.label}
            </a>
          ))}
          <ThemeToggle />
          <a
            href={`mailto:${profile.email}`}
            className="rounded-xs border border-ink px-3 py-1.5 font-mono text-xs uppercase tracking-[0.18em] text-ink transition-colors hover:bg-ink hover:text-paper"
          >
            Contact
          </a>
        </nav>
      </div>
    </header>
  );
}

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 opacity-70">
        <RetrievalField />
      </div>
      <div className="relative mx-auto max-w-6xl px-6 pb-20 pt-24 md:pb-28 md:pt-36">
        <p className="font-mono text-xs uppercase tracking-[0.22em] text-accent">
          {profile.role}
        </p>
        <h1 className="mt-6 max-w-4xl font-serif text-5xl leading-[1.03] tracking-[-0.02em] text-ink md:text-7xl">
          {profile.headline}
        </h1>
        <p className="mt-8 max-w-2xl text-lg leading-relaxed text-ink-soft">
          {profile.intro}
        </p>
        <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-3">
          <a
            href="#work"
            className="rounded-xs bg-ink px-5 py-2.5 font-mono text-xs uppercase tracking-[0.18em] text-paper transition-colors hover:bg-accent"
          >
            View work
          </a>
          <a
            href={`mailto:${profile.email}`}
            className="link-underline font-mono text-xs uppercase tracking-[0.18em] text-ink"
          >
            Get in touch
          </a>
        </div>
        <dl className="mt-16 grid max-w-2xl grid-cols-2 gap-6 border-t border-line pt-8 sm:grid-cols-3">
          {stats.map((stat) => (
            <div key={stat.label}>
              <dt className="font-serif text-3xl text-ink">{stat.value}</dt>
              <dd className="mt-1 font-mono text-[0.7rem] uppercase tracking-[0.16em] text-muted">
                {stat.label}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

export function About() {
  return (
    <Section id="about" index="01" label="About">
      <div className="max-w-2xl space-y-5">
        {about.paragraphs.map((paragraph, i) => (
          <p
            key={paragraph}
            className={
              i === 0
                ? "text-xl leading-relaxed text-ink"
                : "text-lg leading-relaxed text-ink-soft"
            }
          >
            {paragraph}
          </p>
        ))}
      </div>
    </Section>
  );
}

export function SelectedWork() {
  return (
    <Section id="work" index="02" label="Selected work">
      <h2 className="max-w-2xl font-serif text-3xl text-ink md:text-4xl">
        Systems built end to end, with evidence.
      </h2>
      <div className="mt-12 space-y-14">
        {work.map((item) => (
          <Reveal key={item.title}>
            <article className="grid grid-cols-1 gap-6 border-t border-line pt-8 md:grid-cols-[minmax(0,1fr)_15rem]">
              <div>
                <div className="flex items-baseline gap-4">
                  <span className="font-mono text-xs text-muted">{item.index}</span>
                  <h3 className="font-serif text-2xl text-ink md:text-3xl">
                    {item.title}
                  </h3>
                </div>
                <p className="mt-2 text-ink-soft">{item.subtitle}</p>
                <ul className="mt-5 space-y-2">
                  {item.bullets.map((bullet) => (
                    <li
                      key={bullet}
                      className="flex gap-3 text-sm leading-relaxed text-ink-soft"
                    >
                      <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-accent" />
                      <span>{bullet}</span>
                    </li>
                  ))}
                </ul>
                {item.href ? (
                  <a
                    href={item.href}
                    className="link-underline mt-6 inline-block font-mono text-xs uppercase tracking-[0.18em] text-ink"
                  >
                    {item.linkLabel ?? "Read case study"} ↗
                  </a>
                ) : null}
              </div>
              <div className="md:border-l md:border-line md:pl-6">
                <p className="font-mono text-[0.7rem] uppercase tracking-[0.16em] text-muted">
                  {item.year}
                </p>
                <p className="mt-3 text-sm text-ink-soft">{item.role}</p>
                <ul className="mt-4 flex flex-wrap gap-1.5">
                  {item.stack.map((tag) => (
                    <li
                      key={tag}
                      className="rounded-xs border border-line px-2 py-1 font-mono text-[0.65rem] uppercase tracking-[0.1em] text-muted"
                    >
                      {tag}
                    </li>
                  ))}
                </ul>
              </div>
            </article>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}

export function Stack() {
  return (
    <Section id="stack" index="03" label="Toolkit">
      <h2 className="font-serif text-3xl text-ink md:text-4xl">
        What I reach for.
      </h2>
      <div className="mt-10 grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-3">
        {stack.map((group) => (
          <div key={group.group}>
            <h3 className="font-mono text-xs uppercase tracking-[0.18em] text-accent">
              {group.group}
            </h3>
            <ul className="mt-4 space-y-2">
              {group.items.map((item) => (
                <li key={item} className="text-ink-soft">
                  {item}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </Section>
  );
}

export function Contact() {
  return (
    <Section id="contact" index="04" label="Contact">
      <div className="grid grid-cols-1 gap-8 md:grid-cols-[minmax(0,1fr)_15rem]">
        <div>
          <h2 className="max-w-xl font-serif text-3xl text-ink md:text-4xl">
            Have a system worth building? Let&apos;s talk.
          </h2>
          <a
            href={`mailto:${profile.email}`}
            className="link-underline mt-6 inline-block font-serif text-2xl text-accent"
          >
            {profile.email}
          </a>
        </div>
        <ul className="space-y-3 md:border-l md:border-line md:pl-6">
          {profile.links.map((link) => (
            <li key={link.label}>
              <a
                href={link.href}
                className="link-underline font-mono text-xs uppercase tracking-[0.16em] text-ink"
              >
                {link.label} ↗
              </a>
            </li>
          ))}
        </ul>
      </div>
    </Section>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-6 py-10 sm:flex-row sm:items-center sm:justify-between">
        <p className="font-mono text-[0.7rem] uppercase tracking-[0.16em] text-muted">
          {profile.name} — {profile.location}
        </p>
        <p className="font-mono text-[0.7rem] uppercase tracking-[0.16em] text-muted">
          Set in Fraunces, Geist &amp; Geist Mono · Built with Next.js
        </p>
      </div>
    </footer>
  );
}
