import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { createProject, generateEstimate } from "@/lib/estimates.functions";
import { Upload, X, Sparkles, ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/_authenticated/new")({
  head: () => ({
    meta: [
      { title: "New estimate — RenovationOS" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: NewProject,
});

const ROOM_TYPES: { value: string; label: string }[] = [
  { value: "kitchen", label: "Kitchen" },
  { value: "bathroom", label: "Bathroom" },
  { value: "living_room", label: "Living room" },
  { value: "bedroom", label: "Bedroom" },
  { value: "basement", label: "Basement" },
  { value: "exterior", label: "Exterior" },
  { value: "other", label: "Other" },
];

function NewProject() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const createProjectFn = useServerFn(createProject);
  const generateEstimateFn = useServerFn(generateEstimate);

  const [title, setTitle] = useState("");
  const [roomType, setRoomType] = useState("kitchen");
  const [zipCode, setZipCode] = useState("");
  const [notes, setNotes] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [stage, setStage] = useState<"idle" | "creating" | "uploading" | "analyzing">("idle");
  const [progress, setProgress] = useState(0);

  const handleFiles = (selected: FileList | null) => {
    if (!selected) return;
    const next = Array.from(selected).slice(0, 6 - files.length);
    const valid = next.filter((f) => f.type.startsWith("image/") && f.size <= 15 * 1024 * 1024);
    setFiles((prev) => [...prev, ...valid]);
    setPreviews((prev) => [...prev, ...valid.map((f) => URL.createObjectURL(f))]);
  };

  const removeFile = (i: number) => {
    setFiles((prev) => prev.filter((_, idx) => idx !== i));
    setPreviews((prev) => prev.filter((_, idx) => idx !== i));
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!title.trim()) return toast.error("Give your project a title.");
    if (files.length === 0) return toast.error("Upload at least one room photo.");
    if (zipCode && !/^\d{5}$/.test(zipCode)) return toast.error("ZIP code must be 5 digits.");

    setSubmitting(true);
    try {
      setStage("creating");
      setProgress(10);
      const { projectId } = await createProjectFn({
        data: {
          title: title.trim(),
          roomType: roomType as "kitchen",
          zipCode: zipCode || undefined,
          notes: notes.trim() || undefined,
        },
      });

      setStage("uploading");
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const ext = file.name.split(".").pop() || "jpg";
        const path = `${user.id}/${projectId}/${Date.now()}-${i}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("room-uploads")
          .upload(path, file, { contentType: file.type, upsert: false });
        if (upErr) throw upErr;
        const { error: insErr } = await supabase.from("room_uploads").insert({
          project_id: projectId,
          owner_id: user.id,
          storage_path: path,
          mime_type: file.type,
          bytes: file.size,
        });
        if (insErr) throw insErr;
        setProgress(10 + Math.round(((i + 1) / files.length) * 50));
      }

      setStage("analyzing");
      setProgress(70);
      await generateEstimateFn({ data: { projectId } });
      setProgress(100);

      toast.success("Estimate ready");
      navigate({ to: "/projects/$projectId", params: { projectId } });
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Something went wrong");
      setSubmitting(false);
      setStage("idle");
      setProgress(0);
    }
  };

  const stageLabel = {
    idle: "",
    creating: "Creating project…",
    uploading: "Uploading photos…",
    analyzing: "AI analyzing your room…",
  }[stage];

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

        <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">New project</div>
        <h1 className="mt-2 font-display text-4xl text-ink">Get your AI estimate</h1>
        <p className="mt-2 text-muted-foreground">
          Upload 1–6 photos of your room. We'll analyze them and generate a price range in about a minute.
        </p>

        <form onSubmit={onSubmit} className="mt-10 space-y-8">
          <div className="grid sm:grid-cols-2 gap-5">
            <div className="sm:col-span-2 space-y-2">
              <Label htmlFor="title">Project title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Kitchen refresh"
                maxLength={120}
                disabled={submitting}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="roomType">Room type</Label>
              <select
                id="roomType"
                value={roomType}
                onChange={(e) => setRoomType(e.target.value)}
                disabled={submitting}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50"
              >
                {ROOM_TYPES.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
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
            <div className="sm:col-span-2 space-y-2">
              <Label htmlFor="notes">Notes (optional)</Label>
              <textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Goals, must-haves, budget ceiling…"
                maxLength={1000}
                rows={3}
                disabled={submitting}
                className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50"
              />
            </div>
          </div>

          <div className="space-y-3">
            <Label>Room photos ({files.length}/6)</Label>
            <label
              className={`flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border bg-surface-elevated py-12 px-6 text-center cursor-pointer hover:border-ink/40 transition-colors ${
                submitting ? "opacity-50 pointer-events-none" : ""
              }`}
            >
              <Upload className="h-6 w-6 text-muted-foreground" />
              <div className="text-sm font-medium text-ink">Click to upload, or drag and drop</div>
              <div className="text-xs text-muted-foreground">JPG or PNG up to 15MB · up to 6 photos</div>
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => handleFiles(e.target.files)}
                disabled={submitting || files.length >= 6}
              />
            </label>

            {previews.length > 0 && (
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {previews.map((src, i) => (
                  <div key={i} className="relative aspect-square rounded-lg overflow-hidden border border-border bg-muted">
                    <img src={src} alt="" className="h-full w-full object-cover" />
                    {!submitting && (
                      <button
                        type="button"
                        onClick={() => removeFile(i)}
                        className="absolute top-1 right-1 grid h-6 w-6 place-items-center rounded-full bg-ink/80 text-background hover:bg-ink"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {submitting && (
            <div className="rounded-xl border border-border bg-surface-elevated p-5">
              <div className="flex items-center gap-2 text-sm font-medium text-ink">
                <Sparkles className="h-4 w-4 text-primary animate-pulse" />
                {stageLabel}
              </div>
              <Progress value={progress} className="mt-3" />
            </div>
          )}

          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={submitting}
              className="h-11 px-6 rounded-xl bg-ink text-background hover:bg-ink/90"
            >
              {submitting ? "Working…" : "Generate estimate"}
            </Button>
          </div>
        </form>
      </main>
      <Footer />
    </div>
  );
}
