import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Star } from "lucide-react";
import { getReviewEligibility, submitReview } from "@/lib/contractors.functions";

export function WriteReview({ contractorId, contractorSlug }: { contractorId: string; contractorSlug: string }) {
  const { user } = useAuth();
  const getElig = useServerFn(getReviewEligibility);
  const submit = useServerFn(submitReview);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["review-eligibility", contractorId, user?.id],
    queryFn: () => getElig({ data: { contractorId } }),
    enabled: !!user,
  });

  const [rating, setRating] = useState<number>(0);
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  if (!user || isLoading || !data?.canReview) return null;

  // Pre-populate with existing review on first render
  if (data.existing && rating === 0 && !done) {
    setRating(data.existing.rating);
    setBody(data.existing.body ?? "");
  }

  const onSubmit = async () => {
    if (rating < 1) return;
    setSaving(true);
    try {
      await submit({ data: { contractorId, rating, body } });
      setDone(true);
      qc.invalidateQueries({ queryKey: ["contractor", contractorSlug] });
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="mt-14 rounded-2xl border border-border bg-surface-elevated p-6">
      <h3 className="font-display text-xl text-ink">
        {data.existing ? "Update your review" : "Write a review"}
      </h3>
      <p className="mt-1 text-sm text-muted-foreground">
        You've worked with this contractor — share your experience.
      </p>
      <div className="mt-4 flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setRating(n)}
            className="p-1 hover:scale-110 transition-transform"
            aria-label={`${n} stars`}
          >
            <Star className={`h-6 w-6 ${n <= rating ? "fill-copper text-copper" : "text-muted-foreground"}`} />
          </button>
        ))}
      </div>
      <Textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="What stood out about working with them? (optional)"
        className="mt-4"
        rows={4}
        maxLength={2000}
      />
      <div className="mt-4 flex items-center gap-3">
        <Button onClick={onSubmit} disabled={rating < 1 || saving} className="bg-ink text-background hover:bg-ink/90">
          {saving ? "Saving…" : data.existing ? "Update review" : "Submit review"}
        </Button>
        {done && <span className="text-sm text-muted-foreground">Thanks — your review is live.</span>}
      </div>
    </section>
  );
}
