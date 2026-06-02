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

                {/* Left-side step cards */}
                <div className="absolute left-[-28px] top-6 hidden md:flex flex-col gap-2 w-[260px]">
                  <div className="rounded-2xl bg-surface-elevated border border-border shadow-card p-4">
                    <div className="flex items-center gap-3">
                      <div className="grid h-8 w-8 place-items-center rounded-lg bg-copper/10 text-copper">
                        <Camera className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="text-[10px] text-muted-foreground">1</div>
                        <div className="text-sm font-semibold text-ink leading-tight">Upload photos</div>
                      </div>
                    </div>
                    <div className="mt-2 text-[11px] text-muted-foreground">2–5 photos</div>
                    <div className="mt-2 flex items-center gap-1.5">
                      <div className="h-8 w-8 rounded-md bg-muted overflow-hidden">
                        <img src={heroImage} alt="" className="h-full w-full object-cover" />
                      </div>
                      <div className="h-8 w-8 rounded-md bg-muted overflow-hidden">
                        <img src={heroImage} alt="" className="h-full w-full object-cover" />
                      </div>
                      <div className="h-8 w-8 rounded-md border border-dashed border-border grid place-items-center text-muted-foreground">
                        <Plus className="h-3 w-3" />
                      </div>
                    </div>
                  </div>

                  <div className="pl-3 text-copper/60 text-sm leading-none">↓</div>

                  <div className="rounded-2xl bg-surface-elevated border border-border shadow-card p-4">
                    <div className="flex items-center gap-3">
                      <div className="grid h-8 w-8 place-items-center rounded-lg bg-copper/10 text-copper">
                        <Sparkles className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="text-[10px] text-muted-foreground">2</div>
                        <div className="text-sm font-semibold text-ink leading-tight">AI analysis</div>
                      </div>
                    </div>
                    <div className="mt-2 text-[11px] text-muted-foreground">Detecting scope & materials…</div>
                    <div className="mt-2 flex items-center gap-2">
                      <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                        <div className="h-full w-[92%] rounded-full bg-gradient-to-r from-copper/40 via-copper to-copper" />
                      </div>
                      <div className="text-[10px] tabular-nums text-copper font-medium">92%</div>
                    </div>
                  </div>

                  <div className="pl-3 text-copper/60 text-sm leading-none">↓</div>

                  <div className="rounded-2xl bg-surface-elevated border border-border shadow-card p-4">
                    <div className="flex items-center gap-3">
                      <div className="grid h-8 w-8 place-items-center rounded-lg bg-emerald-500/10 text-emerald-600">
                        <Check className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="text-[10px] text-muted-foreground">3</div>
                        <div className="text-sm font-semibold text-ink leading-tight">Instant estimate</div>
                      </div>
                    </div>
                    <div className="mt-2 text-[11px] text-muted-foreground">Pricing engine calculating…</div>
                  </div>
                </div>

                {/* Floating estimate card */}
                <div className="absolute right-[-16px] bottom-[-24px] hidden md:block rounded-2xl bg-surface-elevated border border-border shadow-card p-5 w-[300px]">
                  <div className="flex items-center justify-between">
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Kitchen · Austin, TX</div>
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-[10px] px-2 py-0.5 font-medium">
                      Highly accurate <Check className="h-3 w-3" />
                    </span>
                  </div>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="font-display text-3xl text-ink">$42,300</span>
                    <span className="text-xs text-muted-foreground">expected</span>
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">$34.8k – $51.2k · 6–9 weeks</div>
                  <div className="mt-3 h-1.5 rounded-full bg-muted overflow-hidden">
                    <div className="h-full w-3/4 rounded-full bg-gradient-to-r from-copper/40 via-copper to-copper/80" />
                  </div>
                  <ul className="mt-4 space-y-2 text-xs">
                    {[
                      { Icon: Box, label: "Kitchen cabinets", v: "$15,200" },
                      { Icon: Layers, label: "Countertops", v: "$6,800" },
                      { Icon: Layers, label: "Flooring", v: "$4,600" },
                      { Icon: Lightbulb, label: "Lighting", v: "$2,200" },
                      { Icon: HardHat, label: "Labor", v: "$13,500" },
                    ].map((r) => (
                      <li key={r.label} className="flex items-center justify-between text-ink">
                        <span className="flex items-center gap-2 text-muted-foreground">
                          <r.Icon className="h-3.5 w-3.5" />
                          {r.label}
                        </span>
                        <span className="tabular-nums">{r.v}</span>
                      </li>
                    ))}
                  </ul>
                  <button className="mt-4 w-full inline-flex items-center justify-between rounded-lg border border-border px-3 py-2 text-xs font-medium text-ink hover:bg-muted/40 transition-colors">
                    View full estimate <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* TRUST STRIP — logos + ratings + vetted */}
        <section className="border-y border-border/60 bg-surface/60">
          <div className="container-prose py-6 flex flex-wrap items-center justify-between gap-x-8 gap-y-4 text-sm">
            <div className="text-muted-foreground text-xs">Trusted by homeowners across the US</div>
            <div className="flex items-center gap-2">
              <Star className="h-4 w-4 fill-emerald-500 text-emerald-500" />
              <span className="font-semibold text-ink">Trustpilot</span>
              <span className="flex items-center gap-0.5 text-amber-500">
                {[0,1,2,3,4].map((i) => <Star key={i} className="h-3 w-3 fill-current" />)}
              </span>
              <span className="text-ink font-medium tabular-nums">4.8</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-base">
                <span style={{color:"#4285F4"}}>G</span>
                <span style={{color:"#EA4335"}}>o</span>
                <span style={{color:"#FBBC05"}}>o</span>
                <span style={{color:"#4285F4"}}>g</span>
                <span style={{color:"#34A853"}}>l</span>
                <span style={{color:"#EA4335"}}>e</span>
              </span>
              <span className="flex items-center gap-0.5 text-amber-500">
                {[0,1,2,3,4].map((i) => <Star key={i} className="h-3 w-3 fill-current" />)}
              </span>
              <span className="text-ink font-medium tabular-nums">4.9</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-semibold italic" style={{color:"#EE3124"}}>Angi</span>
              <span className="flex items-center gap-0.5 text-amber-500">
                {[0,1,2,3,4].map((i) => <Star key={i} className="h-3 w-3 fill-current" />)}
              </span>
              <span className="text-ink font-medium tabular-nums">4.7</span>
            </div>
            <div className="flex items-center gap-3">
              <div>
                <div className="text-ink font-semibold text-sm">Vetted contractors</div>
                <div className="text-[11px] text-muted-foreground">Background checked · Licensed · Insured</div>
              </div>
              <div className="flex items-center">
                <div className="flex -space-x-2">
                  {["bg-copper/70","bg-ink/70","bg-emerald-500/70"].map((c,i) => (
                    <div key={i} className={`h-7 w-7 rounded-full border-2 border-background ${c}`} />
                  ))}
                </div>
                <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-[11px] text-ink">+1,800</span>
              </div>
            </div>
          </div>
        </section>

        {/* STATS WITH ICONS */}
        <section className="bg-surface/30">
          <div className="container-prose py-14 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[
              { Icon: TrendingUp, color: "text-copper bg-copper/10", k: "12,400+", v: "Estimates generated", sub: "Transparent. Accurate. Fast." },
              { Icon: Users, color: "text-emerald-600 bg-emerald-500/10", k: "1,800+", v: "Vetted contractors", sub: "Quality pros you can trust." },
              { Icon: ShieldCheck, color: "text-indigo-600 bg-indigo-500/10", k: "92%", v: "Within ±15% of final", sub: "Industry-leading accuracy." },
              { Icon: BadgeCheck, color: "text-amber-600 bg-amber-500/10", k: "< 90s", v: "Median time to estimate", sub: "From photos to numbers." },
            ].map((s) => (
              <div key={s.v} className="flex flex-col items-center">
                <div className={`grid h-10 w-10 place-items-center rounded-full ${s.color}`}>
                  <s.Icon className="h-5 w-5" />
                </div>
                <div className="mt-4 font-display text-3xl md:text-4xl text-ink">{s.k}</div>
                <div className="mt-2 text-[11px] uppercase tracking-wider text-muted-foreground">{s.v}</div>
                <div className="mt-1 text-xs text-muted-foreground">{s.sub}</div>
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
