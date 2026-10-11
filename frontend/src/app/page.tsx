import {
  About,
  Contact,
  Hero,
  SelectedWork,
  SiteFooter,
  SiteHeader,
  Stack,
} from "@/components/sections";

export default function Home() {
  return (
    <div className="grain min-h-dvh">
      <SiteHeader />
      <main>
        <Hero />
        <div className="mx-auto max-w-6xl px-6 pb-24">
          <About />
          <SelectedWork />
          <Stack />
          <Contact />
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
