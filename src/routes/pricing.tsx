import { createFileRoute } from "@tanstack/react-router";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Pricing — RenovationOS" },
      { name: "description", content: "Free for homeowners. Pay-per-lead and subscription tiers for contractors." },
      { property: "og:title", content: "RenovationOS pricing" },
      { property: "og:description", content: "Free for homeowners. Pay-per-lead and subscription tiers for contractors." },
      { property: "og:url", content: "/pricing" },
    ],
    links: [{ rel: "canonical", href: "/pricing" }],
  }),
  component: Pricing,
});

function Pricing() {
  const tiers = [
    { name: "Homeowner", price: "Free", desc: "Forever. No card.", cta: "Start estimate", to: "/signup", features: ["Unlimited estimates", "AI vision analysis", "Line-item breakdown", "Contractor matching", "PDF reports"] },
    { name: "Contractor — Starter", price: "$49", suffix: "/mo", desc: "Solo operators.", cta: "Join waitlist", to: "/contractors", features: ["Up to 10 leads/mo", "Profile page", "Reviews", "Email notifications"] },
    { name: "Contractor — Pro", price: "$199", suffix: "/mo", desc: "Growing teams.", featured: true, cta: "Join waitlist", to: "/contractors", features: ["Unlimited leads", "Priority routing", "Lead intelligence", "SMS alerts", "ROI dashboard"] },
  ];
  return (
    <div className="min-h-screen bg-background bg-grain">
      <Header />
      <main className="container-prose pt-16 pb-24">
        <div className="text-center max-w-2xl mx-auto">
          <div className="text-xs uppercase tracking-[0.18em] text-copper font-medium">Pricing</div>
          <h1 className="mt-4 font-display text-5xl md:text-6xl text-ink">Simple, fair, transparent.</h1>
          <p className="mt-4 text-muted-foreground">Homeowners pay nothing. Contractors only pay for what works.</p>
        </div>
        <div className="mt-16 grid md:grid-cols-3 gap-5">
          {tiers.map((t) => (
            <div key={t.name} className={`rounded-2xl border p-7 shadow-soft ${t.featured ? "border-ink bg-ink text-background" : "border-border bg-surface-elevated"}`}>
              <div className={`text-xs uppercase tracking-wider ${t.featured ? "text-copper" : "text-muted-foreground"}`}>{t.name}</div>
              <div className="mt-3 flex items-baseline gap-1">
                <span className="font-display text-5xl">{t.price}</span>
                {t.suffix && <span className={`text-sm ${t.featured ? "text-background/60" : "text-muted-foreground"}`}>{t.suffix}</span>}
              </div>
              <p className={`mt-1 text-sm ${t.featured ? "text-background/70" : "text-muted-foreground"}`}>{t.desc}</p>
              <Button asChild className={`mt-6 w-full h-11 rounded-xl ${t.featured ? "bg-background text-ink hover:bg-background/90" : "bg-ink text-background hover:bg-ink/90"}`}>
                <Link to={t.to}>{t.cta}</Link>
              </Button>
              <ul className="mt-7 space-y-2.5 text-sm">
                {t.features.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <Check className={`h-4 w-4 mt-0.5 ${t.featured ? "text-copper" : "text-ink"}`} />
                    <span className={t.featured ? "text-background/85" : "text-foreground/85"}>{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </main>
      <Footer />
    </div>
  );
}
