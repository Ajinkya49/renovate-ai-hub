import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { getMyContractor, upsertContractor } from "@/lib/contractors.functions";

export const Route = createFileRoute("/_authenticated/contractor-onboarding")({
  head: () => ({
    meta: [
      { title: "Contractor onboarding — RenovationOS" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ContractorOnboarding,
});

const SPECIALTIES = [
  "kitchen",
  "bathroom",
  "basement",
  "exterior",
  "additions",
  "flooring",
  "electrical",
  "plumbing",
  "general",
] as const;

function ContractorOnboarding() {
  const navigate = useNavigate();
  const fetchMine = useServerFn(getMyContractor);
  const upsert = useServerFn(upsertContractor);
  const { data: existing } = useQuery({
    queryKey: ["my-contractor"],
    queryFn: () => fetchMine(),
  });

  const [businessName, setBusinessName] = useState("");
  const [bio, setBio] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [yearsExperience, setYearsExperience] = useState<string>("");
  const [insured, setInsured] = useState(false);
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [zipsRaw, setZipsRaw] = useState("");
  const [regionsRaw, setRegionsRaw] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (existing) {
      setBusinessName(existing.business_name ?? "");
      setBio(existing.bio ?? "");
      setLicenseNumber(existing.license_number ?? "");
      setYearsExperience(existing.years_experience ? String(existing.years_experience) : "");
      setInsured(!!existing.insured);
      setSpecialties(existing.specialties ?? []);
      setZipsRaw((existing.service_zip_codes ?? []).join(", "));
      setRegionsRaw((existing.service_regions ?? []).join(", "));
    }
  }, [existing]);

  const toggleSpec = (s: string) =>
    setSpecialties((cur) => (cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s]));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const zips = zipsRaw
        .split(/[,\s]+/)
        .map((z) => z.trim())
        .filter((z) => /^\d{5}$/.test(z));
      const regions = regionsRaw
        .split(",")
        .map((r) => r.trim())
        .filter(Boolean);
      if (zips.length === 0) {
        toast.error("Add at least one 5-digit service ZIP code");
        return;
      }
      if (specialties.length === 0) {
        toast.error("Pick at least one specialty");
        return;
      }
      const res = await upsert({
        data: {
          businessName,
          bio,
          licenseNumber,
          yearsExperience: yearsExperience ? Number(yearsExperience) : undefined,
          insured,
          specialties: specialties as (typeof SPECIALTIES)[number][],
          serviceZipCodes: zips,
          serviceRegions: regions,
        },
      });
      toast.success(existing ? "Profile updated" : "Profile created");
      navigate({ to: "/marketplace" });
      void res;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background bg-grain">
      <Header />
      <main className="container-prose pt-12 pb-24 max-w-2xl">
        <div className="text-xs uppercase tracking-[0.18em] text-copper font-medium">For contractors</div>
        <h1 className="mt-3 font-display text-4xl text-ink">
          {existing ? "Edit your profile" : "Create your contractor profile"}
        </h1>
        <p className="mt-2 text-muted-foreground">
          Tell us what you do and where you work. Matching homeowners will see your profile.
        </p>

        <form onSubmit={submit} className="mt-10 space-y-6">
          <div>
            <Label htmlFor="bn">Business name</Label>
            <Input id="bn" required maxLength={120} value={businessName} onChange={(e) => setBusinessName(e.target.value)} className="mt-1.5 h-11" />
          </div>
          <div>
            <Label htmlFor="bio">Bio</Label>
            <Textarea id="bio" maxLength={800} value={bio} onChange={(e) => setBio(e.target.value)} className="mt-1.5" rows={4} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="lic">License #</Label>
              <Input id="lic" maxLength={60} value={licenseNumber} onChange={(e) => setLicenseNumber(e.target.value)} className="mt-1.5 h-11" />
            </div>
            <div>
              <Label htmlFor="yrs">Years experience</Label>
              <Input id="yrs" type="number" min={0} max={80} value={yearsExperience} onChange={(e) => setYearsExperience(e.target.value)} className="mt-1.5 h-11" />
            </div>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <Checkbox checked={insured} onCheckedChange={(v) => setInsured(!!v)} />
            <span className="text-sm">Licensed & insured</span>
          </label>

          <div>
            <Label>Specialties</Label>
            <div className="mt-2 flex flex-wrap gap-2">
              {SPECIALTIES.map((s) => {
                const active = specialties.includes(s);
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => toggleSpec(s)}
                    className={`px-3 h-8 rounded-full border text-xs capitalize transition-colors ${
                      active
                        ? "bg-ink text-background border-ink"
                        : "bg-background text-muted-foreground border-border hover:border-ink/40"
                    }`}
                  >
                    {s}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <Label htmlFor="zips">Service ZIP codes</Label>
            <Input id="zips" placeholder="94110, 94103, 94107" value={zipsRaw} onChange={(e) => setZipsRaw(e.target.value)} className="mt-1.5 h-11" />
            <p className="mt-1 text-xs text-muted-foreground">5-digit codes, comma separated.</p>
          </div>
          <div>
            <Label htmlFor="regions">Service regions (display)</Label>
            <Input id="regions" placeholder="San Francisco, East Bay" value={regionsRaw} onChange={(e) => setRegionsRaw(e.target.value)} className="mt-1.5 h-11" />
          </div>

          <Button type="submit" disabled={submitting} className="h-11 px-6 rounded-xl bg-ink text-background hover:bg-ink/90">
            {submitting ? "Saving…" : existing ? "Save changes" : "Create profile"}
          </Button>
        </form>
      </main>
      <Footer />
    </div>
  );
}
