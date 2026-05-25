import { Link } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";

export function Header() {
  const { user, signOut } = useAuth();
  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-background/80 backdrop-blur-xl">
      <div className="container-prose flex h-16 items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5 group">
          <span className="grid h-7 w-7 place-items-center rounded-md bg-ink text-background text-[11px] font-bold tracking-tight">R</span>
          <span className="text-[15px] font-semibold tracking-tight text-ink">RenovationOS</span>
        </Link>
        <nav className="hidden md:flex items-center gap-7 text-sm text-muted-foreground">
          <Link to="/how-it-works" className="hover:text-ink transition-colors">How it works</Link>
          <Link to="/contractors" className="hover:text-ink transition-colors">For contractors</Link>
          <Link to="/pricing" className="hover:text-ink transition-colors">Pricing</Link>
        </nav>
        <div className="flex items-center gap-2">
          {user ? (
            <>
              <Button asChild variant="ghost" size="sm"><Link to="/dashboard">Dashboard</Link></Button>
              <Button onClick={() => signOut()} size="sm" variant="outline">Sign out</Button>
            </>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm"><Link to="/login">Sign in</Link></Button>
              <Button asChild size="sm" className="bg-ink text-background hover:bg-ink/90"><Link to="/signup">Get estimate</Link></Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
