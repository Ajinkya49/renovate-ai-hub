import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { listMyProjects } from "@/lib/estimates.functions";
import { Plus, Camera, ArrowRight, Zap } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — RenovationOS" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const fetchProjects = useServerFn(listMyProjects);
  const { data: projects, isLoading } = useQuery({
    queryKey: ["my-projects"],
    queryFn: () => fetchProjects(),
  });

  const name =
    (user?.user_metadata?.display_name as string) || user?.email?.split("@")[0] || "there";

  return (
    <div className="min-h-screen bg-background bg-grain">
      <Header />
      <main className="container-prose pt-12 pb-24">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Dashboard</div>
            <h1 className="mt-2 font-display text-4xl text-ink">Hi, {name}.</h1>
            <p className="mt-1 text-muted-foreground">Start a new estimate or pick up where you left off.</p>
          </div>
          <Button
            onClick={() => navigate({ to: "/new" })}
            className="h-11 px-5 rounded-xl bg-ink text-background hover:bg-ink/90"
          >
            <Plus className="h-4 w-4 mr-1.5" /> New project
          </Button>
        </div>

        <div className="mt-12 grid md:grid-cols-3 gap-5">
          <Link
            to="/new"
            className="rounded-2xl border border-dashed border-border bg-surface-elevated p-7 hover:border-ink/40 hover:shadow-soft transition-all group"
          >
            <div className="grid h-10 w-10 place-items-center rounded-lg bg-ink/5 text-ink group-hover:bg-primary/10 group-hover:text-primary transition-colors">
              <Camera className="h-5 w-5" />
            </div>
            <h3 className="mt-5 text-lg font-semibold text-ink">Upload room photos</h3>
            <p className="mt-1.5 text-sm text-muted-foreground">
              AI-powered scope from your photos in about 90 seconds.
            </p>
          </Link>

          <Link
            to="/quick"
            className="rounded-2xl border border-dashed border-border bg-surface-elevated p-7 hover:border-ink/40 hover:shadow-soft transition-all group"
          >
            <div className="grid h-10 w-10 place-items-center rounded-lg bg-ink/5 text-ink group-hover:bg-primary/10 group-hover:text-primary transition-colors">
              <Zap className="h-5 w-5" />
            </div>
            <h3 className="mt-5 text-lg font-semibold text-ink">Quick estimate</h3>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Instant price range from room type, size, and finish level — no photos, no AI.
            </p>
          </Link>


          <div className="md:col-span-2 rounded-2xl border border-border bg-surface-elevated p-7 shadow-soft">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Recent projects</h3>
            <div className="mt-5">
              {isLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-14 w-full" />
                  <Skeleton className="h-14 w-full" />
                </div>
              ) : !projects || projects.length === 0 ? (
                <div className="grid place-items-center py-10 text-center">
                  <p className="text-sm text-muted-foreground">
                    No projects yet. Upload photos to generate your first estimate.
                  </p>
                </div>
              ) : (
                <ul className="divide-y divide-border">
                  {projects.map((p) => (
                    <li key={p.id}>
                      <Link
                        to="/projects/$projectId"
                        params={{ projectId: p.id }}
                        className="flex items-center justify-between gap-4 py-4 group"
                      >
                        <div className="min-w-0">
                          <div className="font-medium text-ink truncate">{p.title}</div>
                          <div className="text-xs text-muted-foreground capitalize">
                            {p.room_type.replace("_", " ")} · {p.status}
                            {p.zip_code ? ` · ${p.zip_code}` : ""}
                          </div>
                        </div>
                        <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-ink transition-colors" />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
