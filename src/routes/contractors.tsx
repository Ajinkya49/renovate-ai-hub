import { createFileRoute, Link } from "@tanstack/react-router";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/contractors")({
  head: () => ({
    meta: [
      { title: "For contractors — RenovationOS" },
      { name: "description", content: "Get matched with homeowners who have real, AI-scoped projects." },
      { property: "og:title", content: "Grow your renovation business with RenovationOS" },
      { property: "og:description", content: "Get matched with homeowners who have real, AI-scoped projects." },
      { property: "og:url", content: "/contractors" },
    ],
    links: [{ rel: "canonical", href: "/contractors" }],
  }),
  component: Contractors,
});

function Contractors() {
  return (
    <div className="min-h-screen bg-background bg-grain">
      <Header />
      <main className="container-prose pt-16 pb-24">
        <div className="max-w-2xl">
          <div className="text-xs uppercase tracking-[0.18em] text-copper font-medium">For contractors</div>
          <h1 className="mt-4 font-display text-5xl md:text-6xl text-ink">Real projects.<br/>Real scope. Real homeowners.</h1>
          <p className="mt-6 text-lg text-muted-foreground leading-relaxed">
            Every lead arrives with an AI-detected scope, photos, a deterministic estimate range, and a verified homeowner — so you can quote faster and win more.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg" className="h-12 px-6 rounded-xl bg-ink text-background hover:bg-ink/90">
              <Link to="/signup">Join the waitlist</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="h-12 px-6 rounded-xl">
              <Link to="/pricing">See pricing</Link>
            </Button>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
