import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { listMyLeads, updateLeadStatus } from "@/lib/contractors.functions";
import { formatUSD } from "@/lib/pricing";

export const Route = createFileRoute("/_authenticated/contractor-leads")({
  head: () => ({
    meta: [
      { title: "My leads — RenovationOS" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: MyLeads,
});

const STATUSES = ["new", "viewed", "contacted", "quoted", "won", "lost"] as const;

function MyLeads() {
  const qc = useQueryClient();
  const fetchLeads = useServerFn(listMyLeads);
  const updateStatus = useServerFn(updateLeadStatus);
  const { data: leads, isLoading } = useQuery({
    queryKey: ["my-leads"],
    queryFn: () => fetchLeads(),
  });

  const onChange = async (leadId: string, status: (typeof STATUSES)[number]) => {
    try {
      await updateStatus({ data: { leadId, status } });
      toast.success("Status updated");
      qc.invalidateQueries({ queryKey: ["my-leads"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  };

  return (
    <div className="min-h-screen bg-background bg-grain">
      <Header />
      <main className="container-prose pt-12 pb-24">
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <div className="text-xs uppercase tracking-[0.18em] text-copper font-medium">Contractor</div>
            <h1 className="mt-2 font-display text-4xl text-ink">My leads</h1>
            <p className="mt-1 text-muted-foreground">Track every project you've claimed.</p>
          </div>
          <Link to="/marketplace" className="text-sm text-ink underline-offset-4 hover:underline">
            Browse marketplace →
          </Link>
        </div>

        <div className="mt-10 rounded-2xl border border-border bg-surface-elevated overflow-hidden shadow-soft">
          {isLoading ? (
            <div className="p-6 space-y-3">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : !leads || leads.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">No leads yet. Claim one from the marketplace.</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-5 py-3 font-medium">Project</th>
                  <th className="px-5 py-3 font-medium">Estimate</th>
                  <th className="px-5 py-3 font-medium">Lead fee</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {leads.map((l) => {
                  const project = Array.isArray(l.projects) ? l.projects[0] : l.projects;
                  const est = Array.isArray(l.estimates) ? l.estimates[0] : l.estimates;
                  return (
                    <tr key={l.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-5 py-4">
                        <div className="font-medium text-ink">{project?.title ?? "—"}</div>
                        <div className="text-xs text-muted-foreground capitalize">
                          {project?.room_type?.replace("_", " ")} {project?.zip_code ? `· ${project.zip_code}` : ""}
                        </div>
                      </td>
                      <td className="px-5 py-4 text-ink">
                        {est ? `${formatUSD(Number(est.low_cents))} – ${formatUSD(Number(est.high_cents))}` : "—"}
                      </td>
                      <td className="px-5 py-4 text-ink">{l.price_cents ? formatUSD(Number(l.price_cents)) : "—"}</td>
                      <td className="px-5 py-4">
                        <Select value={l.status as string} onValueChange={(v) => onChange(l.id, v as (typeof STATUSES)[number])}>
                          <SelectTrigger className="h-8 w-32 text-xs capitalize">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {STATUSES.map((s) => (
                              <SelectItem key={s} value={s} className="capitalize">
                                {s}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
