import { Link } from "@tanstack/react-router";

export function Footer() {
  return (
    <footer className="border-t border-border/60 mt-32">
      <div className="container-prose py-14 grid grid-cols-2 md:grid-cols-4 gap-10 text-sm">
        <div className="col-span-2 md:col-span-1">
          <div className="flex items-center gap-2.5">
            <span className="grid h-7 w-7 place-items-center rounded-md bg-ink text-background text-[11px] font-bold">R</span>
            <span className="font-semibold tracking-tight text-ink">RenovationOS</span>
          </div>
          <p className="mt-3 text-muted-foreground max-w-xs">AI-powered renovation estimates and contractor matching.</p>
        </div>
        <div>
          <h4 className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Product</h4>
          <ul className="mt-4 space-y-2.5 text-foreground/80">
            <li><Link to="/how-it-works" className="hover:text-ink">How it works</Link></li>
            <li><Link to="/pricing" className="hover:text-ink">Pricing</Link></li>
            <li><Link to="/contractors" className="hover:text-ink">For contractors</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Company</h4>
          <ul className="mt-4 space-y-2.5 text-foreground/80">
            <li><Link to="/about" className="hover:text-ink">About</Link></li>
            <li><Link to="/contact" className="hover:text-ink">Contact</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Legal</h4>
          <ul className="mt-4 space-y-2.5 text-foreground/80">
            <li><Link to="/privacy" className="hover:text-ink">Privacy</Link></li>
            <li><Link to="/terms" className="hover:text-ink">Terms</Link></li>
          </ul>
        </div>
      </div>
      <div className="container-prose pb-10 text-xs text-muted-foreground flex items-center justify-between">
        <span>© {new Date().getFullYear()} RenovationOS</span>
        <span>Built with care.</span>
      </div>
    </footer>
  );
}
