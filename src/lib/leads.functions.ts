import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Lead system — auto-match contractors to a finished estimate, credit-based
 * unlock flow, stub credit purchases, contractor credit wallet.
 *
 * Money is in INR paise (1 INR = 100 paise) consistent with the estimate engine.
 * Credit packages are platform-priced placeholders — flip on real payments later.
 */

// -----------------------------
// Credit packages (stub pricing)
// -----------------------------
export const CREDIT_PACKAGES = [
  { key: "starter", label: "Starter", credits: 20, amountCents: 99900, perCredit: "₹49.95" },
  { key: "growth", label: "Growth", credits: 100, amountCents: 399900, perCredit: "₹39.99" },
  { key: "pro", label: "Pro", credits: 500, amountCents: 1499900, perCredit: "₹29.99" },
] as const;

type PackageKey = (typeof CREDIT_PACKAGES)[number]["key"];

// -----------------------------
// Credit cost per project type
// -----------------------------
const ROOM_BASE_COST: Record<string, number> = {
  kitchen: 30,
  bathroom: 20,
  basement: 20,
  exterior: 15,
  living_room: 10,
  bedroom: 10,
  other: 10,
};

function specialtyForRoom(roomType: string): string {
  const map: Record<string, string> = {
    kitchen: "kitchen",
    bathroom: "bathroom",
    basement: "basement",
    exterior: "exterior",
    living_room: "general",
    bedroom: "general",
    other: "general",
  };
  return map[roomType] ?? "general";
}

function computeCreditCost(roomType: string, expectedCents: number | null): number {
  const base = ROOM_BASE_COST[roomType] ?? 10;
  // Bigger projects = pricier lead. Tier by expected cost in INR (paise).
  const inr = (expectedCents ?? 0) / 100;
  let mult = 1;
  if (inr > 500_000) mult = 1.5;
  else if (inr > 200_000) mult = 1.25;
  return Math.max(5, Math.round(base * mult));
}

// =============================
// Matching (server-only helper)
// =============================
/**
 * Insert one locked `contractor_leads` row for every active contractor whose
 * service area + specialty overlaps the project. Idempotent per (project,
 * contractor). Returns the number of new leads created.
 */
export async function matchContractorsForProject(projectId: string): Promise<number> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { data: project } = await supabaseAdmin
    .from("projects")
    .select("id, owner_id, room_type, zip_code, title")
    .eq("id", projectId)
    .maybeSingle();
  if (!project) return 0;

  const { data: estimate } = await supabaseAdmin
    .from("estimates")
    .select("id, expected_cents")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const specialty = specialtyForRoom(project.room_type as string);
  const creditCost = computeCreditCost(
    project.room_type as string,
    estimate?.expected_cents ? Number(estimate.expected_cents) : null,
  );

  // Find candidate contractors: active + specialty overlap.
  // Zip preference: if project has a zip, prefer exact match, else fall back.
  let query = supabaseAdmin
    .from("contractors")
    .select("id, user_id, business_name, rating, review_count, service_zip_codes, specialties")
    .eq("is_active", true)
    .contains("specialties", [specialty]);

  if (project.zip_code) {
    query = query.contains("service_zip_codes", [project.zip_code]);
  }

  const { data: candidates } = await query.limit(25);
  let pool = candidates ?? [];

  // Fallback: if no zip-matched contractors, drop the zip filter.
  if (pool.length === 0 && project.zip_code) {
    const { data: fallback } = await supabaseAdmin
      .from("contractors")
      .select("id, user_id, business_name, rating, review_count, service_zip_codes, specialties")
      .eq("is_active", true)
      .contains("specialties", [specialty])
      .limit(15);
    pool = fallback ?? [];
  }
  if (pool.length === 0) return 0;

  // Existing leads for this project to keep idempotent.
  const { data: existing } = await supabaseAdmin
    .from("contractor_leads")
    .select("contractor_id")
    .eq("project_id", projectId);
  const alreadyMatched = new Set((existing ?? []).map((r) => r.contractor_id));

  const rows = pool
    .filter((c) => !alreadyMatched.has(c.id))
    .map((c) => {
      // Lightweight score: rating + zip exact match bonus.
      const zipBonus = project.zip_code && (c.service_zip_codes ?? []).includes(project.zip_code) ? 0.2 : 0;
      const score = Math.min(1, Number(c.rating ?? 0) / 5 + zipBonus);
      return {
        project_id: projectId,
        contractor_id: c.id,
        homeowner_id: project.owner_id,
        estimate_id: estimate?.id ?? null,
        status: "new" as const,
        score: Number(score.toFixed(3)),
        credit_cost: creditCost,
        is_unlocked: false,
      };
    });

  if (rows.length === 0) return 0;

  const { data: inserted, error } = await supabaseAdmin
    .from("contractor_leads")
    .insert(rows)
    .select("id, contractor_id");
  if (error) throw new Error(error.message);

  // Notify each matched contractor in-app.
  if (inserted && inserted.length > 0) {
    const userIds = pool
      .filter((c) => inserted.some((r) => r.contractor_id === c.id))
      .map((c) => c.user_id);
    if (userIds.length > 0) {
      await supabaseAdmin.from("notifications").insert(
        userIds.map((uid) => ({
          user_id: uid,
          channel: "in_app",
          title: "New lead matched",
          body: `A new ${(project.room_type as string).replace("_", " ")} project matches your area — ${creditCost} credits to unlock.`,
          link: "/contractor-leads",
        })),
      );
    }

    // Log events.
    await supabaseAdmin.from("lead_events").insert(
      inserted.map((r) => ({
        lead_id: r.id,
        event_type: "matched",
        metadata: { credit_cost: creditCost, source: "auto" },
      })),
    );
  }

  // Bump project status to matched.
  await supabaseAdmin.from("projects").update({ status: "matched" }).eq("id", projectId);

  return inserted?.length ?? 0;
}

// =============================
// Unlock lead with credits
// =============================
const UnlockInput = z.object({ leadId: z.string().uuid() });

export const unlockLead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => UnlockInput.parse(i))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: result, error } = await supabaseAdmin.rpc("unlock_lead_with_credits", {
      _lead_id: data.leadId,
      _user_id: userId,
    });
    if (error) throw new Error(error.message);

    // Notify homeowner that a contractor has engaged.
    const { data: lead } = await supabaseAdmin
      .from("contractor_leads")
      .select("homeowner_id, project_id, contractors(business_name), projects(title)")
      .eq("id", data.leadId)
      .single();
    if (lead) {
      const contractor = Array.isArray(lead.contractors) ? lead.contractors[0] : lead.contractors;
      const project = Array.isArray(lead.projects) ? lead.projects[0] : lead.projects;
      await supabaseAdmin.from("notifications").insert({
        user_id: lead.homeowner_id,
        channel: "in_app",
        title: "A contractor is reviewing your project",
        body: `${contractor?.business_name ?? "A contractor"} unlocked "${project?.title ?? "your project"}" and will reach out shortly.`,
        link: `/projects/${lead.project_id}`,
      });
    }

    return result as { ok: boolean; balance?: number; cost?: number; already_unlocked?: boolean };
  });

// =============================
// Credit wallet
// =============================
export const getCreditWallet = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: contractor } = await supabaseAdmin
      .from("contractors")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();
    if (!contractor) {
      return { contractor: null, wallet: null, history: [], packages: CREDIT_PACKAGES };
    }

    // Ensure wallet row exists.
    await supabaseAdmin
      .from("lead_credits")
      .upsert({ contractor_id: contractor.id, balance: 0 }, { onConflict: "contractor_id", ignoreDuplicates: true });

    const [{ data: wallet }, { data: history }] = await Promise.all([
      supabaseAdmin
        .from("lead_credits")
        .select("balance, lifetime_purchased, lifetime_spent")
        .eq("contractor_id", contractor.id)
        .maybeSingle(),
      supabaseAdmin
        .from("lead_purchases")
        .select("id, kind, credits_delta, balance_after, package_key, amount_cents, created_at")
        .eq("contractor_id", contractor.id)
        .order("created_at", { ascending: false })
        .limit(20),
    ]);

    return {
      contractor: { id: contractor.id },
      wallet: wallet ?? { balance: 0, lifetime_purchased: 0, lifetime_spent: 0 },
      history: history ?? [],
      packages: CREDIT_PACKAGES,
    };
  });

// =============================
// Stub: buy credits (no real payment)
// =============================
const BuyCreditsInput = z.object({
  packageKey: z.enum(["starter", "growth", "pro"]),
});

export const buyCreditsStub = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => BuyCreditsInput.parse(i))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const pkg = CREDIT_PACKAGES.find((p) => p.key === (data.packageKey as PackageKey));
    if (!pkg) throw new Error("Unknown package");

    const { data: contractor } = await supabaseAdmin
      .from("contractors")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();
    if (!contractor) throw new Error("Create a contractor profile first");

    const { data: result, error } = await supabaseAdmin.rpc("add_lead_credits", {
      _contractor_id: contractor.id,
      _credits: pkg.credits,
      _package_key: pkg.key,
      _amount_cents: pkg.amountCents,
      _kind: "purchase",
    });
    if (error) throw new Error(error.message);

    return result as { ok: boolean; balance: number };
  });

// =============================
// Contractor lead inbox v2 (credit-aware)
// =============================
export const getMyLeadsWithCredits = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: contractor } = await supabaseAdmin
      .from("contractors")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();
    if (!contractor) return { contractor: null, leads: [] };

    const { data: leads } = await supabaseAdmin
      .from("contractor_leads")
      .select(
        "id, status, score, credit_cost, is_unlocked, unlocked_at, created_at, project_id, homeowner_id, projects(id, title, room_type, zip_code, notes), estimates(id, low_cents, expected_cents, high_cents, timeline_weeks_min, timeline_weeks_max, confidence)",
      )
      .eq("contractor_id", contractor.id)
      .order("created_at", { ascending: false })
      .limit(100);

    // For unlocked leads only, also expose homeowner display name + email.
    const unlockedHomeowners = (leads ?? [])
      .filter((l) => l.is_unlocked)
      .map((l) => l.homeowner_id);
    let profiles: Record<string, { display_name: string | null }> = {};
    if (unlockedHomeowners.length > 0) {
      const { data: pData } = await supabaseAdmin
        .from("profiles")
        .select("id, display_name")
        .in("id", unlockedHomeowners);
      profiles = Object.fromEntries((pData ?? []).map((p) => [p.id, { display_name: p.display_name }]));
    }

    return {
      contractor: { id: contractor.id },
      leads: (leads ?? []).map((l) => {
        const project = Array.isArray(l.projects) ? l.projects[0] : l.projects;
        const estimate = Array.isArray(l.estimates) ? l.estimates[0] : l.estimates;
        return {
          id: l.id,
          status: l.status,
          score: l.score != null ? Number(l.score) : null,
          creditCost: l.credit_cost,
          isUnlocked: l.is_unlocked,
          unlockedAt: l.unlocked_at,
          createdAt: l.created_at,
          project: project
            ? {
                id: project.id,
                title: project.title,
                roomType: project.room_type as string,
                zipCode: project.zip_code,
                notes: l.is_unlocked ? project.notes : null,
              }
            : null,
          estimate: estimate
            ? {
                lowCents: Number(estimate.low_cents),
                expectedCents: Number(estimate.expected_cents),
                highCents: Number(estimate.high_cents),
                timelineWeeksMin: estimate.timeline_weeks_min,
                timelineWeeksMax: estimate.timeline_weeks_max,
                confidence: estimate.confidence != null ? Number(estimate.confidence) : null,
              }
            : null,
          homeowner: l.is_unlocked
            ? { displayName: profiles[l.homeowner_id]?.display_name ?? "Homeowner" }
            : null,
        };
      }),
    };
  });
