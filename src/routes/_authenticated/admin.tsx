import { createFileRoute } from "@tanstack/react-router";
import { createServerFn, useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { Skeleton } from "@/components/ui/skeleton";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { formatUSD } from "@/lib/pricing";

const getAdminOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    // Verify admin role via security-definer has_role.
    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
    if (!isAdmin) throw new Error("Forbidden");

    const [{ count: projects }, { count: contractors }, { count: leads }, { count: users }, { data: recent }] =
      await Promise.all([
        supabaseAdmin.from("projects").select("id", { count: "exact", head: true }),
        supabaseAdmin.from("contractors").select("id", { count: "exact", head: true }),
        supabaseAdmin.from("contractor_leads").select("id", { count: "exact", head: true }),
        supabaseAdmin.from("profiles").select("id", { count: "exact", head: true }),
        supabaseAdmin
          .from("projects")
          .select("id, title, room_type, status, zip_code, created_at, estimates(expected_cents)")
          .order("created_at", { ascending: false })
          .limit(15),
      ]);
    return {
      counts: { projects: projects ?? 0, contractors: contractors ?? 0, leads: leads ?? 0, users: users ?? 0 },
      recent: recent ?? [],
    };
  });

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Admin — RenovationOS" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Admin,
});

function Admin() {
  const fetchOverview = useServerFn(getAdminOverview);
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-overview"],
    queryFn: () => fetchOverview(),
    retry: false,
  });

  if (error) {
    return (
      <div className="min-h-screen bg-background bg-grain">
        <Header />
        <main className="container-prose pt-20 pb-24 max-w-xl">
          <h1 className="font-display text-4xl text-ink">Admin only</h1>
          <p className="mt-3 text-muted-foreground">You don't have access to this page.</p>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background bg-grain">
      <Header />
      <main className="container-prose pt-12 pb-24">
        <div className="text-xs uppercase tracking-[0.18em] text-copper font-medium">Admin</div>
        <h1 className="mt-2 font-display text-4xl text-ink">Platform overview</h1>

        <div className="mt-10 grid grid-cols-2 md:grid-cols-4 gap-4">
          {([
            ["Users", data?.counts.users],
            ["Projects", data?.counts.projects],
            ["Contractors", data?.counts.contractors],
            ["Leads", data?.counts.leads],
          ] as const).map(([label, value]) => (
            <div key={label} className="rounded-2xl border border-border bg-surface-elevated p-5 shadow-soft">
              <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
              <div className="mt-2 font-display text-3xl text-ink">{isLoading ? "—" : value ?? 0}</div>
            </div>
          ))}
        </div>

        <h2 className="mt-12 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Recent projects</h2>
        <div className="mt-4 rounded-2xl border border-border bg-surface-elevated overflow-hidden">
          {isLoading ? (
            <div className="p-6 space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-5 py-3 font-medium">Title</th>
                  <th className="px-5 py-3 font-medium">Room</th>
                  <th className="px-5 py-3 font-medium">ZIP</th>
                  <th className="px-5 py-3 font-medium">Estimate</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {(data?.recent ?? []).map((p) => {
                  const est = Array.isArray(p.estimates) ? p.estimates[0] : p.estimates;
                  return (
                    <tr key={p.id}>
                      <td className="px-5 py-3 text-ink truncate max-w-xs">{p.title}</td>
                      <td className="px-5 py-3 text-muted-foreground capitalize">{p.room_type?.replace("_", " ")}</td>
                      <td className="px-5 py-3 text-muted-foreground">{p.zip_code ?? "—"}</td>
                      <td className="px-5 py-3 text-ink">{est?.expected_cents ? formatUSD(Number(est.expected_cents)) : "—"}</td>
                      <td className="px-5 py-3 text-muted-foreground capitalize">{p.status}</td>
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
