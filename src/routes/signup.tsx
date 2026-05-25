import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Header } from "@/components/site/Header";
import { toast } from "sonner";
import { z } from "zod";

export const Route = createFileRoute("/signup")({
  head: () => ({
    meta: [
      { title: "Create account — RenovationOS" },
      { name: "description", content: "Start your free renovation estimate." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SignupPage,
});

const schema = z.object({
  displayName: z.string().trim().min(1, "Name is required").max(100),
  email: z.string().trim().email("Enter a valid email").max(255),
  password: z.string().min(8, "At least 8 characters").max(72),
});

function SignupPage() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) navigate({ to: "/dashboard" });
  }, [user, loading, navigate]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse({ displayName, email, password });
    if (!parsed.success) { toast.error(parsed.error.issues[0].message); return; }
    setSubmitting(true);
    const { error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`,
        data: { display_name: parsed.data.displayName },
      },
    });
    setSubmitting(false);
    if (error) toast.error(error.message);
    else toast.success("Check your email to confirm your account.");
  };

  const onGoogle = async () => {
    const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin + "/dashboard" });
    if (result.error) toast.error(result.error.message);
  };

  return (
    <div className="min-h-screen bg-background bg-grain">
      <Header />
      <main className="container-prose flex justify-center pt-16 pb-24">
        <div className="w-full max-w-sm">
          <div className="text-center">
            <h1 className="font-display text-4xl text-ink">Create your account</h1>
            <p className="mt-2 text-sm text-muted-foreground">Free for homeowners. Always.</p>
          </div>

          <div className="mt-8 space-y-3">
            <Button onClick={onGoogle} variant="outline" className="w-full h-11 rounded-xl">
              Continue with Google
            </Button>
            <div className="relative py-2">
              <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border" /></div>
              <div className="relative flex justify-center text-xs"><span className="bg-background px-2 text-muted-foreground">or</span></div>
            </div>
            <form onSubmit={onSubmit} className="space-y-3">
              <div>
                <Label htmlFor="name">Full name</Label>
                <Input id="name" required value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="mt-1.5 h-11 rounded-xl" />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1.5 h-11 rounded-xl" />
              </div>
              <div>
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" autoComplete="new-password" required value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1.5 h-11 rounded-xl" />
              </div>
              <Button type="submit" disabled={submitting} className="w-full h-11 rounded-xl bg-ink text-background hover:bg-ink/90">
                {submitting ? "Creating…" : "Create account"}
              </Button>
            </form>
          </div>

          <p className="mt-8 text-center text-sm text-muted-foreground">
            Already have an account? <Link to="/login" className="text-ink font-medium hover:underline">Sign in</Link>
          </p>
        </div>
      </main>
    </div>
  );
}
