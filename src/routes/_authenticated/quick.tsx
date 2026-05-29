import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { quickEstimate } from "@/lib/estimates.functions";
import { buildQuickScope, finishToComplexity, type FinishLevel } from "@/lib/quick-scope";
import { computeEstimate, formatUSD, type RoomType } from "@/lib/pricing";
import { ArrowLeft, Zap } from "lucide-react";

export const Route = createFileRoute("/_authenticated/quick")({
  head: () => ({
    meta: [
      { title: "Quick estimate — RenovationOS" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: QuickEstimate,
});

const ROOM_TYPES: { value: RoomType; label: string; defaultSqft: number }[] = [
  { value: "kitchen", label: "Kitchen", defaultSqft: 150 },
  { value: "bathroom", label: "Bathroom", defaultSqft: 60 },
  { value: "living_room", label: "Living room", defaultSqft: 250 },
  { value: "bedroom", label: "Bedroom", defaultSqft: 150 },
  { value: "basement", label: "Basement", defaultSqft: 800 },
  { value: "exterior", label: "Exterior", defaultSqft: 1200 },
  { value: "other", label: "Other", defaultSqft: 200 },
];

const FINISH_LEVELS: { value: FinishLevel; label: string; blurb: string }[] = [
  { value: "good", label: "Good", blurb: "Builder-grade refresh" },
  { value: "better", label: "Better", blurb: "Mid-range remodel" },
  { value: "best", label: "Best", blurb: "Premium finishes" },
];

function QuickEstimate() {
  const navigate = useNavigate();
  const quickEstimateFn = useServerFn(quickEstimate);

  const [title, setTitle] = useState("");
  const [roomType, setRoomType] = useState<RoomType>("kitchen");
  const [squareFeet, setSquareFeet] = useState(150);
  const [zipCode, setZipCode] = useState("");
  const [finishLevel, setFinishLevel] = useState<FinishLevel>("better");
  const [submitting, setSubmitting] = useState(false);

  // Live preview — runs locally, no server hop, no AI.
  const preview = useMemo(() => {
    const scope = buildQuickScope(roomType, squareFeet || 100, finishLevel);
    return computeEstimate({
      roomType,
      zipCode: zipCode || null,
      complexity: finishToComplexity(finishLevel),
      scope,
      squareFeet,
    });
  }, [roomType, squareFeet, zipCode, finishLevel]);

  const onRoomChange = (v: RoomType) => {
    setRoomType(v);
    const d = ROOM_TYPES.find((r) => r.value === v)?.defaultSqft ?? 150;
    setSquareFeet(d);
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return toast.error("Give your project a title.");
    if (zipCode && !/^\d{5}$/.test(zipCode)) return toast.error("ZIP code must be 5 digits.");
    setSubmitting(true);
    try {
      const { projectId } = await quickEstimateFn({
        data: {
          title: title.trim(),
          roomType,
          zipCode: zipCode || undefined,
          squareFeet,
          finishLevel,
        },
      });
      toast.success("Estimate saved");
      navigate({ to: "/projects/$projectId", params: { projectId } });
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Something went wrong");
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background bg-grain">
      <Header />
      <main className="container-prose pt-12 pb-24 max-w-3xl">
        <button
          onClick={() => navigate({ to: "/dashboard" })}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-ink transition-colors mb-6"
        >
          <ArrowLeft className="h-4 w-4" /> Back to dashboard
        </button>

        <div className="inline-flex items-center gap-1.5 text-xs uppercase tracking-[0.18em] text-primary">
          <Zap className="h-3.5 w-3.5" /> Quick estimate
        </div>
        <h1 className="mt-2 font-display text-4xl text-ink">Instant price range</h1>
        <p className="mt-2 text-muted-foreground">
          No photos, no AI — just pick a room, size, and finish level. Result updates as you type.
        </p>

        <form onSubmit={onSubmit} className="mt-10 grid lg:grid-cols-5 gap-8">
          <div className="lg:col-span-3 space-y-6">
            <div className="space-y-2">
              <Label htmlFor="title">Project title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Master bath refresh"
                maxLength={120}
                disabled={submitting}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="roomType">Room type</Label>
              <select
                id="roomType"
                value={roomType}
                onChange={(e) => onRoomChange(e.target.value as RoomType)}
                disabled={submitting}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50"
              >
                {ROOM_TYPES.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="sqft">Square feet</Label>
                <Input
                  id="sqft"
                  type="number"
                  min={20}
                  max={5000}
                  value={squareFeet}
                  onChange={(e) => setSquareFeet(Math.max(20, Math.min(5000, Number(e.target.value) || 0)))}
                  disabled={submitting}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="zip">ZIP code (optional)</Label>
                <Input
                  id="zip"
                  value={zipCode}
                  onChange={(e) => setZipCode(e.target.value.replace(/\D/g, "").slice(0, 5))}
                  placeholder="94110"
                  inputMode="numeric"
                  disabled={submitting}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Finish level</Label>
              <div className="grid grid-cols-3 gap-2">
                {FINISH_LEVELS.map((f) => (
                  <button
                    type="button"
                    key={f.value}
                    onClick={() => setFinishLevel(f.value)}
                    disabled={submitting}
                    className={`rounded-xl border px-3 py-3 text-left transition-all ${
                      finishLevel === f.value
                        ? "border-ink bg-ink/5 shadow-soft"
                        : "border-border hover:border-ink/40"
                    }`}
                  >
                    <div className="text-sm font-semibold text-ink">{f.label}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{f.blurb}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <aside className="lg:col-span-2">
            <div className="sticky top-6 rounded-2xl border border-border bg-surface-elevated p-6 shadow-soft">
              <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Live estimate</div>
              <div className="mt-3 font-display text-3xl text-ink">
                {formatUSD(preview.lowCents)} – {formatUSD(preview.highCents)}
              </div>
              <div className="mt-1 text-sm text-muted-foreground">
                Most likely: <span className="font-medium text-ink">{formatUSD(preview.expectedCents)}</span>
              </div>
              <div className="mt-4 text-xs text-muted-foreground">
                Timeline: {preview.timelineWeeksMin}–{preview.timelineWeeksMax} weeks · Region: {preview.region}
              </div>
              <div className="mt-4 text-xs text-muted-foreground">
                Confidence: {Math.round(preview.confidence * 100)}%
              </div>
              <Button
                type="submit"
                disabled={submitting}
                className="mt-6 w-full h-11 rounded-xl bg-ink text-background hover:bg-ink/90"
              >
                {submitting ? "Saving…" : "Save estimate"}
              </Button>
              <p className="mt-3 text-[11px] text-muted-foreground leading-relaxed">
                Want a more accurate quote? <button type="button" onClick={() => navigate({ to: "/new" })} className="underline hover:text-ink">Upload photos</button> for an AI-powered scope.
              </p>
            </div>
          </aside>
        </form>
      </main>
      <Footer />
    </div>
  );
}
