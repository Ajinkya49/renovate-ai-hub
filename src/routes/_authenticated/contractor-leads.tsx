import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Lock, Unlock, Wallet, Sparkles, MapPin, Clock } from "lucide-react";
import { getMyLeadsWithCredits, getCreditWallet, unlockLead, buyCreditsStub } from "@/lib/leads.functions";
import { formatINR } from "@/lib/pricing";

export const Route = createFileRoute("/_authenticated/contractor-leads")({
  head: () => ({
    meta: [
      { title: "My leads — RenovationOS" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: MyLeads,
});

function MyLeads() {
  const qc = useQueryClient();
  const fetchLeads = useServerFn(getMyLeadsWithCredits);
  const fetchWallet = useServerFn(getCreditWallet);
  const unlock = useServerFn(unlockLead);
  const buy = useServerFn(buyCreditsStub);
  const [busy, setBusy] = useState<string | null>(null);

  const { data: leadsData, isLoading } = useQuery({
    queryKey: ["my-leads-v2"],
    queryFn: () => fetchLeads(),
  });
  const { data: walletData } = useQuery({
    queryKey: ["credit-wallet"],
    queryFn: () => fetchWallet(),
  });

  const balance = walletData?.wallet?.balance ?? 0;
  const packages = walletData?.packages ?? [];

  const onUnlock = async (leadId: string, cost: number) => {
    if (balance < cost) {
      toast.error(`Need ${cost} credits, you have ${balance}. Buy more below.`);
      return;
    }
    setBusy(leadId);
    try {
      await unlock({ data: { leadId } });
      toast.success("Lead unlocked");
      qc.invalidateQueries({ queryKey: ["my-leads-v2"] });
      qc.invalidateQueries({ queryKey: ["credit-wallet"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to unlock");
    } finally {
      setBusy(null);
    }
  };

  const onBuy = async (key: "starter" | "growth" | "pro") => {
    setBusy(`buy-${key}`);
    try {
      await buy({ data: { packageKey: key } });
      toast.success("Credits added (test mode — no payment processed)");
      qc.invalidateQueries({ queryKey: ["credit-wallet"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="min-h-screen bg-background bg-grain">
      <Header />
      <main className="container-prose pt-12 pb-24">
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <div className="text-xs uppercase tracking-[0.18em] text-copper font-medium">Contractor</div>
            <h1 className="mt-2 font-display text-4xl text-ink">Lead inbox</h1>
            <p className="mt-1 text-muted-foreground">Unlock matched homeowners with credits.</p>
          </div>
          <Link to="/marketplace" className="text-sm text-ink underline-offset-4 hover:underline">
            Browse marketplace →
          </Link>
        </div>

        {/* Credit wallet */}
        <section className="mt-8 rounded-2xl border border-border bg-surface-elevated p-6 shadow-soft">
          <div className="flex items-start justify-between gap-6 flex-wrap">
            <div>
              <div className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                <Wallet className="h-3.5 w-3.5" /> Credit balance
              </div>
              <div className="mt-2 font-display text-5xl text-ink">{balance}</div>
              <div className="mt-1 text-xs text-muted-foreground">
                Purchased {walletData?.wallet?.lifetime_purchased ?? 0} · Spent {walletData?.wallet?.lifetime_spent ?? 0}
              </div>
            </div>
            <div className="flex-1 min-w-[280px] grid sm:grid-cols-3 gap-3">
              {packages.map((p) => (
                <div key={p.key} className="rounded-xl border border-border p-4 flex flex-col">
                  <div className="text-sm font-medium text-ink">{p.label}</div>
                  <div className="mt-1 font-display text-2xl text-ink">{p.credits} credits</div>
                  <div className="text-xs text-muted-foreground mt-1">{formatINR(p.amountCents)} · {p.perCredit}/credit</div>
                  <Button
                    onClick={() => onBuy(p.key)}
                    disabled={busy === `buy-${p.key}`}
                    size="sm"
                    variant={p.key === "growth" ? "default" : "outline"}
                    className="mt-3"
                  >
                    {busy === `buy-${p.key}` ? "…" : "Buy (test)"}
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Leads */}
        <section className="mt-10">
          <h2 className="font-display text-2xl text-ink">Matched leads</h2>
          {isLoading ? (
            <div className="mt-4 space-y-3">
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          ) : !leadsData?.contractor ? (
            <div className="mt-4 rounded-2xl border border-dashed border-border p-10 text-center text-muted-foreground">
              Create your contractor profile to start receiving leads.{" "}
              <Link to="/contractor-onboarding" className="text-ink underline">Set up profile</Link>
            </div>
          ) : !leadsData.leads.length ? (
            <div className="mt-4 rounded-2xl border border-dashed border-border p-10 text-center text-muted-foreground">
              No matched leads yet. We'll notify you the moment a homeowner's project matches your area & specialty.
            </div>
          ) : (
            <ul className="mt-4 grid gap-3">
              {leadsData.leads.map((l) => (
                <li key={l.id} className="rounded-2xl border border-border bg-surface-elevated p-5 hover:border-ink/40 transition-colors">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-ink">
                          {l.project?.title ?? "Project"}
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-muted text-[10px] uppercase tracking-wider text-ink capitalize">
                          {l.status}
                        </span>
                        {l.isUnlocked && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] uppercase tracking-wider">
                            <Unlock className="h-3 w-3" /> Unlocked
                          </span>
                        )}
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        <span className="capitalize">{l.project?.roomType.replace("_", " ")}</span>
                        {l.project?.zipCode && (
                          <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{l.project.zipCode}</span>
                        )}
                        {l.estimate && (
                          <span className="inline-flex items-center gap-1">
                            <Sparkles className="h-3 w-3" />
                            {formatINR(l.estimate.lowCents)}–{formatINR(l.estimate.highCents)}
                          </span>
                        )}
                        {l.estimate?.timelineWeeksMin && (
                          <span className="inline-flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {l.estimate.timelineWeeksMin}–{l.estimate.timelineWeeksMax}w
                          </span>
                        )}
                      </div>

                      {l.isUnlocked ? (
                        <div className="mt-3 text-sm">
                          <div className="text-ink">Homeowner: <span className="font-medium">{l.homeowner?.displayName}</span></div>
                          {l.project?.notes && (
                            <p className="mt-1 text-muted-foreground">{l.project.notes}</p>
                          )}
                          <Button asChild size="sm" variant="outline" className="mt-3">
                            <Link to="/projects/$projectId" params={{ projectId: l.project!.id }}>
                              View project
                            </Link>
                          </Button>
                        </div>
                      ) : (
                        <p className="mt-3 text-sm text-muted-foreground inline-flex items-center gap-1">
                          <Lock className="h-3.5 w-3.5" /> Homeowner details hidden until unlocked.
                        </p>
                      )}
                    </div>

                    {!l.isUnlocked && (
                      <div className="text-right shrink-0">
                        <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Unlock cost</div>
                        <div className="font-display text-3xl text-ink mt-1">{l.creditCost}</div>
                        <div className="text-[10px] text-muted-foreground">credits</div>
                        <Button
                          onClick={() => onUnlock(l.id, l.creditCost)}
                          disabled={busy === l.id || balance < l.creditCost}
                          size="sm"
                          className="mt-3 bg-ink text-background hover:bg-ink/90"
                        >
                          {busy === l.id ? "Unlocking…" : balance < l.creditCost ? "Need credits" : "Unlock lead"}
                        </Button>
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
      <Footer />
    </div>
  );
}
