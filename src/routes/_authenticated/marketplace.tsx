import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { listMarketplaceProjects, claimLead } from "@/lib/contractors.functions";
import { formatUSD } from "@/lib/pricing";
import { ArrowRight, MapPin, Clock } from "lucide-react";

export const Route = createFileRoute("/_authenticated/marketplace")({
  head: () => ({
    meta: [
      { title: "Lead marketplace — RenovationOS" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Marketplace,
});

function Marketplace() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const fetchProjects = useServerFn(listMarketplaceProjects);
  const claim = useServerFn(claimLead);
  const { data, isLoading } = useQuery({
    queryKey: ["marketplace"],
    queryFn: () => fetchProjects(),
  });

  const onClaim = async (projectId: string) => {
    try {
      const res = await claim({ data: { projectId } });
      toast.success(res.alreadyClaimed ? "Already in your leads" : "Lead claimed");
      qc.invalidateQueries({ queryKey: ["marketplace"] });
      qc.invalidateQueries({ queryKey: ["my-leads"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not claim");
    }
  };

  if (!isLoading && data && !data.contractor) {
    return (
      <div className="min-h-screen bg-background bg-grain">
        <Header />
        <main className="container-prose pt-20 pb-24 max-w-xl">
          <h1 className="font-display text-4xl text-ink">Become a contractor first</h1>
          <p className="mt-3 text-muted-foreground">
            Create your contractor profile to browse and claim renovation leads.
          </p>
          <Button onClick={() => navigate({ to: "/contractor-onboarding" })} className="mt-6 h-11 px-6 rounded-xl bg-ink text-background hover:bg-ink/90">
            Create profile
          </Button>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background bg-grain">
      <Header />
      <main className="container-prose pt-12 pb-24">
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <div className="text-xs uppercase tracking-[0.18em] text-copper font-medium">Marketplace</div>
            <h1 className="mt-2 font-display text-4xl text-ink">Available leads</h1>
            <p className="mt-1 text-muted-foreground">Projects with AI-scoped estimates in your service area.</p>
          </div>
          <Link to="/contractor-leads" className="text-sm text-ink underline-offset-4 hover:underline">
            My leads →
          </Link>
        </div>

        <div className="mt-10 grid gap-4">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-32 w-full rounded-2xl" />)
          ) : !data || data.projects.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-surface-elevated p-10 text-center text-muted-foreground">
              No matching leads yet. Check back soon — fresh homeowner estimates arrive daily.
            </div>
          ) : (
            data.projects.map((p) => (
              <article key={p.id} className="rounded-2xl border border-border bg-surface-elevated p-6 shadow-soft">
                <div className="flex items-start justify-between gap-6 flex-wrap">
                  <div className="min-w-0">
                    <h2 className="text-lg font-semibold text-ink">{p.title}</h2>
                    <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      <span className="capitalize">{p.roomType.replace("_", " ")}</span>
                      {p.zipCode && (
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {p.zipCode}
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(p.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  {p.estimate && (
                    <div className="text-right">
                      <div className="text-xs text-muted-foreground">Estimated range</div>
                      <div className="font-display text-2xl text-ink">
                        {formatUSD(Number(p.estimate.low_cents))} – {formatUSD(Number(p.estimate.high_cents))}
                      </div>
                    </div>
                  )}
                </div>
                <div className="mt-5 flex items-center justify-between gap-3">
                  <div className="text-xs text-muted-foreground">
                    {p.estimate ? `~${p.estimate.timeline_weeks_min}–${p.estimate.timeline_weeks_max} weeks` : "Timeline TBD"}
                  </div>
                  <Button onClick={() => onClaim(p.id)} size="sm" className="bg-ink text-background hover:bg-ink/90 rounded-lg">
                    Claim lead <ArrowRight className="h-3.5 w-3.5 ml-1" />
                  </Button>
                </div>
              </article>
            ))
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
