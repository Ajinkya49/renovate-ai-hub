import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { Button } from "@/components/ui/button";
import { getContractorBySlug } from "@/lib/contractors.functions";
import { Shield, Star, MapPin } from "lucide-react";

export const Route = createFileRoute("/contractors/$slug")({
  loader: async ({ params }) => {
    const res = await getContractorBySlug({ data: { slug: params.slug } });
    if (!res) throw notFound();
    return res;
  },
  head: ({ loaderData }) => {
    const c = loaderData?.contractor;
    const title = c ? `${c.business_name} — RenovationOS` : "Contractor — RenovationOS";
    const desc = c?.bio?.slice(0, 155) ?? `${c?.business_name ?? "Contractor"} on RenovationOS.`;
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
      ],
    };
  },
  component: ContractorProfile,
  notFoundComponent: () => (
    <div className="min-h-screen grid place-items-center bg-background">
      <div className="text-center">
        <h1 className="font-display text-3xl text-ink">Contractor not found</h1>
        <Link to="/contractors" className="mt-4 inline-block text-sm underline">Browse contractors</Link>
      </div>
    </div>
  ),
  errorComponent: () => (
    <div className="min-h-screen grid place-items-center bg-background">
      <div className="text-sm text-muted-foreground">Couldn't load this profile.</div>
    </div>
  ),
});

function ContractorProfile() {
  const { contractor: c, reviews } = Route.useLoaderData();
  const avgRating = Number(c.rating ?? 0);

  return (
    <div className="min-h-screen bg-background bg-grain">
      <Header />
      <main className="container-prose pt-16 pb-24 max-w-3xl">
        <div className="flex items-start justify-between gap-6 flex-wrap">
          <div>
            <div className="text-xs uppercase tracking-[0.18em] text-copper font-medium">Contractor</div>
            <h1 className="mt-3 font-display text-5xl text-ink">{c.business_name}</h1>
            <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              {c.insured && (
                <span className="inline-flex items-center gap-1.5"><Shield className="h-3.5 w-3.5" /> Licensed & insured</span>
              )}
              {c.years_experience != null && <span>{c.years_experience}+ years</span>}
              {avgRating > 0 && (
                <span className="inline-flex items-center gap-1"><Star className="h-3.5 w-3.5 fill-current" /> {avgRating.toFixed(1)} ({c.review_count})</span>
              )}
            </div>
          </div>
          <Button asChild className="h-11 px-5 rounded-xl bg-ink text-background hover:bg-ink/90">
            <Link to="/signup">Get a quote</Link>
          </Button>
        </div>

        {c.bio && <p className="mt-10 text-lg text-foreground leading-relaxed">{c.bio}</p>}

        <div className="mt-10 grid sm:grid-cols-2 gap-4">
          <div className="rounded-2xl border border-border bg-surface-elevated p-5">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Specialties</div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {(c.specialties ?? []).map((s: string) => (
                <span key={s} className="px-2.5 py-1 rounded-full bg-muted text-xs capitalize text-ink">{s}</span>
              ))}
            </div>
          </div>
          <div className="rounded-2xl border border-border bg-surface-elevated p-5">
            <div className="text-xs uppercase tracking-wider text-muted-foreground inline-flex items-center gap-1"><MapPin className="h-3 w-3" /> Service area</div>
            <div className="mt-2 text-sm text-foreground">
              {(c.service_regions?.length ? c.service_regions : c.service_zip_codes ?? []).join(", ") || "—"}
            </div>
          </div>
        </div>

        {reviews.length > 0 && (
          <section className="mt-14">
            <h2 className="font-display text-2xl text-ink">Reviews</h2>
            <div className="mt-4 space-y-4">
              {reviews.map((r) => (
                <div key={r.id} className="rounded-xl border border-border bg-surface-elevated p-5">
                  <div className="inline-flex items-center gap-1 text-copper text-xs">
                    {Array.from({ length: r.rating }).map((_, i) => (
                      <Star key={i} className="h-3 w-3 fill-current" />
                    ))}
                  </div>
                  {r.body && <p className="mt-2 text-sm text-foreground">{r.body}</p>}
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
      <Footer />
    </div>
  );
}
