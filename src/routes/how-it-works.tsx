import { createFileRoute } from "@tanstack/react-router";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";

export const Route = createFileRoute("/how-it-works")({
  head: () => ({
    meta: [
      { title: "How it works — RenovationOS" },
      { name: "description", content: "From photo to estimate to matched contractor in three steps." },
      { property: "og:title", content: "How RenovationOS works" },
      { property: "og:description", content: "From photo to estimate to matched contractor in three steps." },
      { property: "og:url", content: "/how-it-works" },
    ],
    links: [{ rel: "canonical", href: "/how-it-works" }],
  }),
  component: HowItWorks,
});

function HowItWorks() {
  const steps = [
    { n: "01", t: "Upload room photos", d: "Drag in a few photos from your phone or computer. We compress and strip EXIF data automatically. Multiple angles improve accuracy." },
    { n: "02", t: "AI vision analysis", d: "Our vision model identifies the room type, fixtures, finishes, demolition signals, and complexity — then outputs a structured renovation scope." },
    { n: "03", t: "Deterministic pricing", d: "A versioned pricing engine applies regional labor rates, material multipliers, contingency, and permit assumptions. No hallucinated numbers." },
    { n: "04", t: "Estimate + line items", d: "You receive low / expected / high cost ranges, a confidence score, a timeline, and an itemized breakdown you can share with contractors." },
    { n: "05", t: "Contractor matching", d: "Opt in to be matched with vetted local contractors based on your ZIP, project type, and timeline. You stay in control of who you talk to." },
  ];
  return (
    <div className="min-h-screen bg-background bg-grain">
      <Header />
      <main className="container-prose pt-16 pb-24">
        <div className="max-w-2xl">
          <div className="text-xs uppercase tracking-[0.18em] text-copper font-medium">How it works</div>
          <h1 className="mt-4 font-display text-5xl md:text-6xl text-ink">From photo to estimate, in five steps.</h1>
        </div>
        <ol className="mt-16 space-y-5 max-w-3xl">
          {steps.map((s) => (
            <li key={s.n} className="rounded-2xl border border-border bg-surface-elevated p-7 shadow-soft">
              <div className="flex items-baseline gap-4">
                <span className="font-display text-2xl text-copper tabular-nums">{s.n}</span>
                <h3 className="text-lg font-semibold text-ink">{s.t}</h3>
              </div>
              <p className="mt-3 text-muted-foreground leading-relaxed pl-12">{s.d}</p>
            </li>
          ))}
        </ol>
      </main>
      <Footer />
    </div>
  );
}
