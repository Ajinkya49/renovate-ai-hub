import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { Button } from "@/components/ui/button";
import { computeEstimate, formatUSD, type RoomType } from "@/lib/pricing";

/**
 * Programmatic SEO: /renovation-cost/$city
 * Generates a per-city renovation cost guide using the same deterministic
 * pricing engine, so search engines see fast, unique, high-intent pages.
 */

const CITIES: Record<string, { name: string; state: string; zipPrefix: string }> = {
  "san-francisco": { name: "San Francisco", state: "CA", zipPrefix: "941" },
  "new-york": { name: "New York", state: "NY", zipPrefix: "100" },
  "los-angeles": { name: "Los Angeles", state: "CA", zipPrefix: "900" },
  "boston": { name: "Boston", state: "MA", zipPrefix: "021" },
  "seattle": { name: "Seattle", state: "WA", zipPrefix: "981" },
  "chicago": { name: "Chicago", state: "IL", zipPrefix: "606" },
  "austin": { name: "Austin", state: "TX", zipPrefix: "787" },
  "denver": { name: "Denver", state: "CO", zipPrefix: "800" },
  "atlanta": { name: "Atlanta", state: "GA", zipPrefix: "303" },
  "phoenix": { name: "Phoenix", state: "AZ", zipPrefix: "850" },
};

const ROOMS: { key: RoomType; label: string }[] = [
  { key: "kitchen", label: "Kitchen" },
  { key: "bathroom", label: "Bathroom" },
  { key: "basement", label: "Basement" },
  { key: "living_room", label: "Living room" },
  { key: "exterior", label: "Exterior" },
];

function exampleScope(room: RoomType) {
  // Representative medium-complexity scope per room type.
  if (room === "kitchen")
    return [
      { category: "demolition" as const, description: "Demo cabinets + counters", quantity: 120, unit: "sqft" as const },
      { category: "cabinetry" as const, description: "New cabinets", quantity: 22, unit: "lf" as const },
      { category: "countertops" as const, description: "Quartz counters", quantity: 45, unit: "sqft" as const },
      { category: "appliances" as const, description: "Range, fridge, dishwasher", quantity: 3, unit: "ea" as const },
      { category: "flooring" as const, description: "Engineered hardwood", quantity: 160, unit: "sqft" as const },
      { category: "labor_general" as const, description: "Project management", quantity: 60, unit: "hr" as const },
    ];
  if (room === "bathroom")
    return [
      { category: "demolition" as const, description: "Demo fixtures + tile", quantity: 60, unit: "sqft" as const },
      { category: "plumbing" as const, description: "Reroute + fixtures", quantity: 4, unit: "ea" as const },
      { category: "tile" as const, description: "Wall + floor tile", quantity: 90, unit: "sqft" as const },
      { category: "fixtures" as const, description: "Vanity + toilet + shower", quantity: 3, unit: "ea" as const },
      { category: "labor_general" as const, description: "Project management", quantity: 40, unit: "hr" as const },
    ];
  if (room === "basement")
    return [
      { category: "drywall" as const, description: "Frame + drywall", quantity: 500, unit: "sqft" as const },
      { category: "electrical" as const, description: "Outlets + lighting", quantity: 18, unit: "ea" as const },
      { category: "flooring" as const, description: "Luxury vinyl plank", quantity: 600, unit: "sqft" as const },
      { category: "paint" as const, description: "Walls + ceiling", quantity: 800, unit: "sqft" as const },
    ];
  if (room === "exterior")
    return [
      { category: "paint" as const, description: "Exterior paint", quantity: 1800, unit: "sqft" as const },
      { category: "windows" as const, description: "Replacement windows", quantity: 6, unit: "ea" as const },
      { category: "labor_general" as const, description: "Crew + prep", quantity: 80, unit: "hr" as const },
    ];
  return [
    { category: "paint" as const, description: "Paint", quantity: 400, unit: "sqft" as const },
    { category: "flooring" as const, description: "Flooring", quantity: 300, unit: "sqft" as const },
  ];
}

export const Route = createFileRoute("/renovation-cost/$city")({
  loader: ({ params }) => {
    const city = CITIES[params.city];
    if (!city) throw notFound();
    const zip = `${city.zipPrefix}00`;
    const rooms = ROOMS.map(({ key, label }) => {
      const est = computeEstimate({
        roomType: key,
        zipCode: zip,
        complexity: "medium",
        scope: exampleScope(key),
      });
      return { key, label, est };
    });
    return { city, rooms };
  },
  head: ({ loaderData, params }) => {
    const name = loaderData?.city?.name ?? params.city;
    const title = `Renovation cost in ${name} — 2026 guide | RenovationOS`;
    const desc = `Real renovation cost ranges for kitchens, bathrooms, and more in ${name}. AI-powered estimates from photos in 90 seconds.`;
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
      ],
      links: [{ rel: "canonical", href: `/renovation-cost/${params.city}` }],
    };
  },
  component: CityPage,
  notFoundComponent: () => (
    <div className="min-h-screen grid place-items-center bg-background text-center p-8">
      <div>
        <h1 className="font-display text-3xl text-ink">City not covered yet</h1>
        <Link to="/" className="mt-4 inline-block text-sm underline">Back home</Link>
      </div>
    </div>
  ),
  errorComponent: () => <div className="p-12 text-center">Couldn't load this page.</div>,
});

function CityPage() {
  const { city, rooms } = Route.useLoaderData();
  return (
    <div className="min-h-screen bg-background bg-grain">
      <Header />
      <main className="container-prose pt-16 pb-24 max-w-3xl">
        <div className="text-xs uppercase tracking-[0.18em] text-copper font-medium">Cost guide · {city.state}</div>
        <h1 className="mt-3 font-display text-5xl text-ink">Renovation cost in {city.name}</h1>
        <p className="mt-4 text-lg text-muted-foreground leading-relaxed">
          Typical mid-grade renovation ranges in {city.name}, {city.state} — calibrated to local labor & material costs.
          For your specific project, upload photos and get an AI estimate in 90 seconds.
        </p>

        <div className="mt-10 grid gap-3">
          {rooms.map(({ key, label, est }) => (
            <div key={key} className="rounded-2xl border border-border bg-surface-elevated p-5 flex items-center justify-between gap-4">
              <div>
                <div className="font-medium text-ink">{label}</div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  ~{est.timelineWeeksMin}–{est.timelineWeeksMax} weeks · medium complexity
                </div>
              </div>
              <div className="text-right">
                <div className="font-display text-2xl text-ink">
                  {formatUSD(est.lowCents)} – {formatUSD(est.highCents)}
                </div>
                <div className="text-xs text-muted-foreground">Expected: {formatUSD(est.expectedCents)}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-12 rounded-2xl border border-border bg-ink text-background p-8 text-center">
          <h2 className="font-display text-3xl">Get your own {city.name} estimate</h2>
          <p className="mt-2 text-background/70">Upload photos. Get scoped pricing + matched contractors.</p>
          <Button asChild className="mt-5 h-11 px-6 rounded-xl bg-background text-ink hover:bg-background/90">
            <Link to="/signup">Start free</Link>
          </Button>
        </div>

        <section className="mt-12">
          <h2 className="font-display text-2xl text-ink">Other cities</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {Object.entries(CITIES)
              .filter(([slug]) => slug !== (window.location.pathname.split("/").pop() ?? ""))
              .map(([slug, c]) => (
                <Link
                  key={slug}
                  to="/renovation-cost/$city"
                  params={{ city: slug }}
                  className="px-3 py-1.5 rounded-full border border-border text-xs hover:border-ink/40 text-ink"
                >
                  {c.name}
                </Link>
              ))}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

export { CITIES };
