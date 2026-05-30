import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getProjectWithEstimate, listProjectMatches } from "@/lib/estimates.functions";
import { formatUSD } from "@/lib/pricing";
import { ArrowLeft, CheckCircle2, Clock, Sparkles, RefreshCw, Shield, Star, Users } from "lucide-react";

export const Route = createFileRoute("/_authenticated/projects/$projectId")({
  head: () => ({
    meta: [
      { title: "Your estimate — RenovationOS" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ProjectDetail,
});

function ProjectDetail() {
  const { projectId } = Route.useParams();
  const navigate = useNavigate();
  const fetchProject = useServerFn(getProjectWithEstimate);
  const fetchMatches = useServerFn(listProjectMatches);
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["project", projectId],
    queryFn: () => fetchProject({ data: { projectId } }),
  });
  const { data: matches, refetch: refetchMatches } = useQuery({
    queryKey: ["project-matches", projectId],
    queryFn: () => fetchMatches({ data: { projectId } }),
  });

  return (
    <div className="min-h-screen bg-background bg-grain">
      <Header />
      <main className="container-prose pt-12 pb-24 max-w-5xl">
        <button
          onClick={() => navigate({ to: "/dashboard" })}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-ink transition-colors mb-6"
        >
          <ArrowLeft className="h-4 w-4" /> Back to dashboard
        </button>

        {isLoading ? (
          <div className="space-y-6">
            <Skeleton className="h-12 w-2/3" />
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        ) : !data?.project ? (
          <div className="text-muted-foreground">Project not found.</div>
        ) : (
          <>
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                  {data.project.room_type.replace("_", " ")}
                </div>
                <h1 className="mt-2 font-display text-4xl text-ink">{data.project.title}</h1>
              </div>
              <Button variant="outline" size="sm" onClick={() => { refetch(); refetchMatches(); }}>
                <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Refresh
              </Button>
            </div>

            {data.uploads.length > 0 && (
              <div className="mt-8 grid grid-cols-3 sm:grid-cols-6 gap-2">
                {data.uploads.map((u) => (
                  <div key={u.id} className="aspect-square rounded-lg overflow-hidden border border-border bg-muted">
                    <img src={u.url} alt="" className="h-full w-full object-cover" />
                  </div>
                ))}
              </div>
            )}

            {data.estimate ? (
              <>
                {/* Range cards */}
                <section className="mt-12">
                  <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Estimated cost range</div>
                  <div className="mt-4 grid sm:grid-cols-3 gap-3">
                    <RangeCard label="Low" amount={data.estimate.low_cents} />
                    <RangeCard label="Expected" amount={data.estimate.expected_cents} highlight />
                    <RangeCard label="High" amount={data.estimate.high_cents} />
                  </div>
                  <div className="mt-5 flex flex-wrap gap-x-8 gap-y-2 text-sm text-muted-foreground">
                    <div className="inline-flex items-center gap-1.5">
                      <Clock className="h-4 w-4" />
                      Timeline: {data.estimate.timeline_weeks_min}–{data.estimate.timeline_weeks_max} weeks
                    </div>
                    <div className="inline-flex items-center gap-1.5">
                      <Sparkles className="h-4 w-4" />
                      Confidence: {Math.round(Number(data.estimate.confidence ?? 0) * 100)}%
                    </div>
                    <div>Region: {data.estimate.region}</div>
                  </div>
                </section>

                {/* Line items */}
                <section className="mt-12">
                  <h2 className="font-display text-2xl text-ink">Scope breakdown</h2>
                  <div className="mt-4 rounded-2xl border border-border bg-surface-elevated overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50 text-muted-foreground">
                        <tr>
                          <th className="text-left font-medium px-4 py-3">Item</th>
                          <th className="text-left font-medium px-4 py-3 hidden sm:table-cell">Category</th>
                          <th className="text-right font-medium px-4 py-3">Qty</th>
                          <th className="text-right font-medium px-4 py-3">Subtotal</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.lineItems.map((li) => (
                          <tr key={li.id} className="border-t border-border">
                            <td className="px-4 py-3 text-ink">{li.description}</td>
                            <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell capitalize">
                              {li.category.replace("_", " ")}
                            </td>
                            <td className="px-4 py-3 text-right text-muted-foreground">
                              {li.quantity} {li.unit ?? ""}
                            </td>
                            <td className="px-4 py-3 text-right font-medium text-ink">
                              {formatUSD(li.subtotal_cents)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>

                {/* Assumptions */}
                <section className="mt-12">
                  <h2 className="font-display text-2xl text-ink">Assumptions</h2>
                  <ul className="mt-4 space-y-2">
                    {(data.estimate.assumptions as string[]).map((a, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <CheckCircle2 className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                        <span>{a}</span>
                      </li>
                    ))}
                  </ul>
                </section>

                {/* Contractor matches */}
                <section className="mt-12">
                  <div className="flex items-center justify-between gap-4">
                    <h2 className="font-display text-2xl text-ink inline-flex items-center gap-2">
                      <Users className="h-5 w-5" /> Interested contractors
                    </h2>
                    {matches && matches.length > 0 && (
                      <span className="text-xs text-muted-foreground">
                        {matches.length} match{matches.length === 1 ? "" : "es"}
                      </span>
                    )}
                  </div>

                  {!matches || matches.length === 0 ? (
                    <div className="mt-4 rounded-2xl border border-dashed border-border bg-surface-elevated p-8 text-center">
                      <p className="text-sm text-muted-foreground">
                        No contractors have claimed this project yet. We'll notify you the moment one matches.
                      </p>
                      <Button asChild variant="outline" size="sm" className="mt-4">
                        <Link to="/contractors">Browse contractors</Link>
                      </Button>
                    </div>
                  ) : (
                    <ul className="mt-4 grid sm:grid-cols-2 gap-3">
                      {matches.map((m) => (
                        <li
                          key={m.leadId}
                          className="rounded-2xl border border-border bg-surface-elevated p-5 hover:border-ink/40 hover:shadow-soft transition-all"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="font-semibold text-ink truncate">
                                {m.contractor?.businessName ?? "Contractor"}
                              </div>
                              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                                {m.contractor?.insured && (
                                  <span className="inline-flex items-center gap-1">
                                    <Shield className="h-3 w-3" /> Insured
                                  </span>
                                )}
                                {m.contractor?.yearsExperience != null && (
                                  <span>{m.contractor.yearsExperience}+ yrs</span>
                                )}
                                {m.contractor && m.contractor.rating > 0 && (
                                  <span className="inline-flex items-center gap-0.5">
                                    <Star className="h-3 w-3 fill-current text-copper" />
                                    {m.contractor.rating.toFixed(1)} ({m.contractor.reviewCount})
                                  </span>
                                )}
                              </div>
                            </div>
                            <span className="px-2 py-0.5 rounded-full bg-muted text-[10px] uppercase tracking-wider text-ink capitalize">
                              {m.status}
                            </span>
                          </div>
                          {m.contractor?.bio && (
                            <p className="mt-3 text-sm text-muted-foreground line-clamp-2">{m.contractor.bio}</p>
                          )}
                          {m.contractor && m.contractor.specialties.length > 0 && (
                            <div className="mt-3 flex flex-wrap gap-1">
                              {m.contractor.specialties.slice(0, 4).map((s: string) => (
                                <span
                                  key={s}
                                  className="px-2 py-0.5 rounded-full bg-ink/5 text-[11px] capitalize text-ink"
                                >
                                  {s}
                                </span>
                              ))}
                            </div>
                          )}
                          {m.contractor && (
                            <div className="mt-4">
                              <Button asChild size="sm" variant="outline" className="h-9 rounded-lg">
                                <Link to="/contractors/$slug" params={{ slug: m.contractor.slug }}>
                                  View profile
                                </Link>
                              </Button>
                            </div>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </section>

                <div className="mt-12 flex flex-wrap gap-3">
                  <Button asChild className="bg-ink text-background hover:bg-ink/90 h-11 px-5 rounded-xl">
                    <Link to="/contractors">Get matched with contractors</Link>
                  </Button>
                  <Button asChild variant="outline" className="h-11 px-5 rounded-xl">
                    <Link to="/new">Start another estimate</Link>
                  </Button>
                </div>
              </>
            ) : (
              <div className="mt-12 rounded-2xl border border-dashed border-border bg-surface-elevated p-10 text-center">
                <p className="text-sm text-muted-foreground">Estimate is still processing or hasn't been generated.</p>
              </div>
            )}
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}

function RangeCard({ label, amount, highlight }: { label: string; amount: number; highlight?: boolean }) {
  return (
    <div
      className={`rounded-2xl p-6 border ${
        highlight ? "border-ink bg-ink text-background" : "border-border bg-surface-elevated"
      }`}
    >
      <div className={`text-xs uppercase tracking-[0.18em] ${highlight ? "text-background/70" : "text-muted-foreground"}`}>
        {label}
      </div>
      <div className={`mt-2 font-display text-4xl ${highlight ? "text-background" : "text-ink"}`}>
        {formatUSD(amount)}
      </div>
    </div>
  );
}
