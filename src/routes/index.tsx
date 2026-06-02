import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Camera,
  Sparkles,
  Hammer,
  Shield,
  Clock,
  Wallet,
  Plus,
  Check,
  PlayCircle,
  Lock,
  Star,
  TrendingUp,
  Users,
  ShieldCheck,
  BadgeCheck,
  ChevronRight,
  Box,
  Layers,
  Lightbulb,
  HardHat,
} from "lucide-react";
import heroImage from "@/assets/hero-kitchen.jpg";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "RenovationOS — Instant AI renovation estimates" },
      { name: "description", content: "Upload room photos. Get instant cost ranges, timelines, and matched local contractors. Powered by AI vision." },
      { property: "og:title", content: "RenovationOS — Instant AI renovation estimates" },
      { property: "og:description", content: "Upload room photos. Get instant cost ranges, timelines, and matched local contractors." },
      { property: "og:url", content: "/" },
    ],
    links: [{ rel: "canonical", href: "/" }],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-background bg-grain">
      <Header />
      <main>
        {/* HERO */}
        <section className="container-prose pt-20 md:pt-28 pb-20">
          <div className="grid lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-7 animate-fade-up">
              <div className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-xs text-muted-foreground">
                <span className="h-1.5 w-1.5 rounded-full bg-copper" />
                AI vision · Deterministic pricing · Instant
              </div>
              <h1 className="mt-6 font-display text-5xl md:text-7xl leading-[1.02] text-ink">
                Renovation estimates,<br/>
                <span className="italic text-copper">in minutes.</span>
              </h1>
              <p className="mt-6 text-lg text-muted-foreground max-w-xl leading-relaxed">
                Upload a few photos of your room. Our AI analyses the scope, our pricing engine builds the numbers, and we match you with vetted local contractors — all before you finish your coffee.
              </p>
              <div className="mt-9 flex flex-wrap items-center gap-3">
                <Button asChild size="lg" className="bg-ink text-background hover:bg-ink/90 h-12 px-6 rounded-xl text-base">
                  <Link to="/signup">Get my estimate <ArrowRight className="ml-1.5 h-4 w-4" /></Link>
                </Button>
                <Button asChild variant="ghost" size="lg" className="h-12 px-5 rounded-xl text-base">
                  <Link to="/how-it-works">How it works</Link>
                </Button>
              </div>
              <p className="mt-6 text-xs text-muted-foreground">Free for homeowners · No credit card · ~90 seconds</p>
            </div>
            <div className="lg:col-span-5 animate-fade-up [animation-delay:120ms]">
              <div className="relative">
                <div className="absolute -inset-4 rounded-3xl bg-copper/10 blur-3xl" />
                <div className="relative overflow-hidden rounded-3xl border border-border/80 shadow-card">
                  <img
                    src={heroImage}
                    alt="Sunlit modern kitchen mid-renovation"
                    width={1600}
                    height={1100}
                    className="w-full h-auto object-cover"
                  />
                </div>
                {/* Floating estimate card */}
                <div className="absolute -bottom-6 -left-6 hidden md:block rounded-2xl bg-surface-elevated border border-border shadow-card p-5 w-72">
                  <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Kitchen · Austin, TX</div>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="font-display text-3xl text-ink">$42,300</span>
                    <span className="text-xs text-muted-foreground">expected</span>
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">$34.8k — $51.2k · 6–9 weeks</div>
                  <div className="mt-3 h-1.5 rounded-full bg-muted overflow-hidden">
                    <div className="h-full w-3/4 rounded-full bg-gradient-to-r from-copper/40 via-copper to-copper/80" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* TRUST STRIP */}
        <section className="border-y border-border/60 bg-surface/60">
          <div className="container-prose py-8 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {[
              { k: "12,400+", v: "Estimates generated" },
              { k: "1,800+", v: "Vetted contractors" },
              { k: "92%", v: "Within ±15% of final" },
              { k: "< 90s", v: "Median time to estimate" },
            ].map((s) => (
              <div key={s.v}>
                <div className="font-display text-2xl md:text-3xl text-ink">{s.k}</div>
                <div className="mt-1 text-xs uppercase tracking-wider text-muted-foreground">{s.v}</div>
              </div>
            ))}
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section className="container-prose py-28">
          <div className="max-w-2xl">
            <div className="text-xs uppercase tracking-[0.18em] text-copper font-medium">How it works</div>
            <h2 className="mt-4 font-display text-4xl md:text-5xl text-ink">Three steps. No back-and-forth.</h2>
          </div>
          <div className="mt-14 grid md:grid-cols-3 gap-6">
            {[
              { icon: Camera, title: "Snap & upload", body: "A few photos of your space — phone camera is fine. We handle the rest, including compression and EXIF stripping." },
              { icon: Sparkles, title: "AI scope detection", body: "Vision models identify the room, fixtures, finishes, complexity, and demolition signals — then output a structured renovation scope." },
              { icon: Hammer, title: "Deterministic estimate", body: "Our pricing engine applies regional labor rates, material multipliers, contingency, and permit assumptions. No hallucinated numbers." },
            ].map((s, i) => (
              <div key={s.title} className="group rounded-2xl border border-border bg-surface-elevated p-7 shadow-soft hover:shadow-card transition-shadow">
                <div className="flex items-center gap-3">
                  <div className="grid h-9 w-9 place-items-center rounded-lg bg-ink/5 text-ink">
                    <s.icon className="h-4 w-4" />
                  </div>
                  <span className="text-xs text-muted-foreground tabular-nums">{String(i + 1).padStart(2, "0")}</span>
                </div>
                <h3 className="mt-5 text-lg font-semibold text-ink">{s.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{s.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* FEATURE STRIPE */}
        <section className="bg-ink text-background">
          <div className="container-prose py-24 grid lg:grid-cols-2 gap-14 items-center">
            <div>
              <div className="text-xs uppercase tracking-[0.18em] text-copper font-medium">For homeowners</div>
              <h2 className="mt-4 font-display text-4xl md:text-5xl">An estimate you can <span className="italic text-copper">trust</span>.</h2>
              <p className="mt-5 text-background/70 max-w-lg">
                We don't ask an LLM to guess your kitchen costs. Vision detects the scope; a deterministic pricing engine — versioned, auditable, regionally adjusted — generates low / expected / high ranges with itemized line items and a confidence score.
              </p>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              {[
                { icon: Wallet, t: "Low / Expected / High", d: "Explicit ranges, not a single fake number." },
                { icon: Clock, t: "Timeline prediction", d: "Weeks to completion, factoring complexity." },
                { icon: Shield, t: "Vetted contractors", d: "Licensed, insured, response time tracked." },
                { icon: Sparkles, t: "Confidence score", d: "Know exactly how confident the model is." },
              ].map((f) => (
                <div key={f.t} className="rounded-2xl border border-background/10 bg-background/5 p-5">
                  <f.icon className="h-4 w-4 text-copper" />
                  <div className="mt-3 text-sm font-semibold">{f.t}</div>
                  <div className="mt-1 text-xs text-background/60">{f.d}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="container-prose py-28 text-center">
          <h2 className="font-display text-5xl md:text-6xl text-ink">Ready in 90 seconds.</h2>
          <p className="mt-5 text-muted-foreground max-w-lg mx-auto">No sales call. No spam. Just your estimate and matched contractors when you're ready.</p>
          <Button asChild size="lg" className="mt-9 bg-ink text-background hover:bg-ink/90 h-12 px-7 rounded-xl text-base">
            <Link to="/signup">Start my estimate <ArrowRight className="ml-1.5 h-4 w-4" /></Link>
          </Button>
        </section>
      </main>
      <Footer />
    </div>
  );
}
