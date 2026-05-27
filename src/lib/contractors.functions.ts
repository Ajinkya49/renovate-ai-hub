import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

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

const slugify = (s: string) =>
  s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);

const OnboardInput = z.object({
  businessName: z.string().min(2).max(120),
  bio: z.string().max(800).optional().or(z.literal("")),
  licenseNumber: z.string().max(60).optional().or(z.literal("")),
  yearsExperience: z.number().int().min(0).max(80).optional(),
  insured: z.boolean().default(false),
  specialties: z.array(z.enum(SPECIALTIES)).min(1).max(9),
  serviceZipCodes: z.array(z.string().regex(/^\d{5}$/)).min(1).max(30),
  serviceRegions: z.array(z.string().min(2).max(60)).max(10).default([]),
});

export const upsertContractor = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => OnboardInput.parse(i))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    // Promote user to contractor role (admin client — RLS forbids self-write).
    const { data: roleRows } = await supabaseAdmin
      .from("user_roles")
      .select("id")
      .eq("user_id", userId)
      .eq("role", "contractor");
    if (!roleRows?.length) {
      await supabaseAdmin.from("user_roles").insert({ user_id: userId, role: "contractor" });
    }

    const { data: existing } = await supabaseAdmin
      .from("contractors")
      .select("id, slug")
      .eq("user_id", userId)
      .maybeSingle();

    let slug = existing?.slug ?? slugify(data.businessName);
    if (!existing) {
      // Ensure unique slug
      const { data: clash } = await supabaseAdmin
        .from("contractors")
        .select("id")
        .eq("slug", slug)
        .maybeSingle();
      if (clash) slug = `${slug}-${Math.random().toString(36).slice(2, 6)}`;
    }

    const payload = {
      user_id: userId,
      business_name: data.businessName,
      slug,
      bio: data.bio || null,
      license_number: data.licenseNumber || null,
      years_experience: data.yearsExperience ?? null,
      insured: data.insured,
      specialties: data.specialties,
      service_zip_codes: data.serviceZipCodes,
      service_regions: data.serviceRegions,
      is_active: true,
    };

    if (existing) {
      const { error } = await supabaseAdmin.from("contractors").update(payload).eq("id", existing.id);
      if (error) throw new Error(error.message);
      return { contractorId: existing.id, slug };
    }
    const { data: row, error } = await supabaseAdmin
      .from("contractors")
      .insert(payload)
      .select("id, slug")
      .single();
    if (error || !row) throw new Error(error?.message || "Failed to create profile");
    return { contractorId: row.id, slug: row.slug };
  });

export const getMyContractor = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context;
    const { data } = await supabaseAdmin
      .from("contractors")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    return data;
  });

export const listPublicContractors = createServerFn({ method: "GET" }).handler(async () => {
  const { data } = await supabaseAdmin
    .from("contractors")
    .select("id, slug, business_name, bio, specialties, service_regions, rating, review_count, insured, years_experience, logo_url")
    .eq("is_active", true)
    .order("rating", { ascending: false })
    .limit(60);
  return data ?? [];
});

const GetContractorBySlug = z.object({ slug: z.string().min(1).max(80) });
export const getContractorBySlug = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => GetContractorBySlug.parse(i))
  .handler(async ({ data }) => {
    const { data: c } = await supabaseAdmin
      .from("contractors")
      .select(
        "id, slug, business_name, bio, specialties, service_regions, service_zip_codes, rating, review_count, insured, years_experience, license_number, logo_url",
      )
      .eq("slug", data.slug)
      .eq("is_active", true)
      .maybeSingle();
    if (!c) return null;
    const { data: reviews } = await supabaseAdmin
      .from("contractor_reviews")
      .select("id, rating, body, created_at")
      .eq("contractor_id", c.id)
      .order("created_at", { ascending: false })
      .limit(20);
    return { contractor: c, reviews: reviews ?? [] };
  });

/**
 * Marketplace — return estimated projects that match the contractor's
 * specialties + service zip codes, and which the contractor has not yet
 * claimed. Uses admin client (cross-user query).
 */
type MarketplaceProject = {
  id: string;
  title: string;
  roomType: string;
  zipCode: string | null;
  createdAt: string;
  ownerId: string;
  estimate: {
    id: string;
    low_cents: number;
    expected_cents: number;
    high_cents: number;
    confidence: number | null;
    timeline_weeks_min: number | null;
    timeline_weeks_max: number | null;
  } | null;
};

export const listMarketplaceProjects = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ contractor: { id: string } | null; projects: MarketplaceProject[] }> => {
    const { userId } = context;
    const { data: contractor } = await supabaseAdmin
      .from("contractors")
      .select("id, service_zip_codes, specialties")
      .eq("user_id", userId)
      .maybeSingle();
    if (!contractor) return { contractor: null, projects: [] };

    const zips = contractor.service_zip_codes ?? [];
    // Get already-claimed project ids for this contractor.
    const { data: claimed } = await supabaseAdmin
      .from("contractor_leads")
      .select("project_id")
      .eq("contractor_id", contractor.id);
    const claimedIds = new Set((claimed ?? []).map((r) => r.project_id));

    let query = supabaseAdmin
      .from("projects")
      .select(
        "id, title, room_type, zip_code, region, created_at, owner_id, estimates(id, low_cents, expected_cents, high_cents, confidence, timeline_weeks_min, timeline_weeks_max)",
      )
      .eq("status", "estimated")
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(40);
    if (zips.length > 0) query = query.in("zip_code", zips);

    const { data: projects, error } = await query;
    if (error) throw new Error(error.message);

    const filtered: MarketplaceProject[] = (projects ?? [])
      .filter((p) => !claimedIds.has(p.id))
      .map((p) => {
        const est = Array.isArray(p.estimates) ? p.estimates[0] : p.estimates;
        return {
          id: p.id,
          title: p.title,
          roomType: p.room_type as string,
          zipCode: p.zip_code,
          createdAt: p.created_at,
          ownerId: p.owner_id,
          estimate: est
            ? {
                id: est.id,
                low_cents: Number(est.low_cents),
                expected_cents: Number(est.expected_cents),
                high_cents: Number(est.high_cents),
                confidence: est.confidence != null ? Number(est.confidence) : null,
                timeline_weeks_min: est.timeline_weeks_min,
                timeline_weeks_max: est.timeline_weeks_max,
              }
            : null,
        };
      });
    return { contractor: { id: contractor.id }, projects: filtered };
  });

const ClaimInput = z.object({ projectId: z.string().uuid() });
export const claimLead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => ClaimInput.parse(i))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { data: contractor } = await supabaseAdmin
      .from("contractors")
      .select("id, business_name")
      .eq("user_id", userId)
      .maybeSingle();
    if (!contractor) throw new Error("Create a contractor profile first");

    const { data: project } = await supabaseAdmin
      .from("projects")
      .select("id, owner_id, title")
      .eq("id", data.projectId)
      .maybeSingle();
    if (!project) throw new Error("Project not found");

    const { data: est } = await supabaseAdmin
      .from("estimates")
      .select("id, expected_cents")
      .eq("project_id", project.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    // Idempotent: skip if already claimed.
    const { data: existing } = await supabaseAdmin
      .from("contractor_leads")
      .select("id")
      .eq("contractor_id", contractor.id)
      .eq("project_id", project.id)
      .maybeSingle();
    if (existing) return { leadId: existing.id, alreadyClaimed: true };

    const priceCents = est?.expected_cents ? Math.round(Number(est.expected_cents) * 0.01) : 5000; // 1% of estimate or $50 floor
    const { data: lead, error } = await supabaseAdmin
      .from("contractor_leads")
      .insert({
        contractor_id: contractor.id,
        project_id: project.id,
        homeowner_id: project.owner_id,
        estimate_id: est?.id ?? null,
        price_cents: priceCents,
        status: "new",
        score: 0.8,
      })
      .select("id")
      .single();
    if (error || !lead) throw new Error(error?.message || "Could not claim lead");

    await supabaseAdmin.from("lead_events").insert({
      lead_id: lead.id,
      event_type: "claimed",
      actor_id: userId,
    });

    await supabaseAdmin.from("projects").update({ status: "matched" }).eq("id", project.id);

    await supabaseAdmin.from("notifications").insert({
      user_id: project.owner_id,
      channel: "in_app",
      title: "A contractor is interested in your project",
      body: `${contractor.business_name} matched with "${project.title}".`,
      link: `/projects/${project.id}`,
    });

    return { leadId: lead.id, alreadyClaimed: false };
  });

export const listMyLeads = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context;
    const { data: contractor } = await supabaseAdmin
      .from("contractors")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();
    if (!contractor) return [];
    const { data } = await supabaseAdmin
      .from("contractor_leads")
      .select(
        "id, status, price_cents, score, created_at, project_id, projects(id, title, room_type, zip_code), estimates(expected_cents, low_cents, high_cents)",
      )
      .eq("contractor_id", contractor.id)
      .order("created_at", { ascending: false });
    return data ?? [];
  });

const UpdateLeadStatus = z.object({
  leadId: z.string().uuid(),
  status: z.enum(["new", "viewed", "contacted", "quoted", "won", "lost"]),
});
export const updateLeadStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => UpdateLeadStatus.parse(i))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { data: lead } = await supabaseAdmin
      .from("contractor_leads")
      .select("id, contractor_id, contractors(user_id)")
      .eq("id", data.leadId)
      .single();
    if (!lead) throw new Error("Lead not found");
    const owner = Array.isArray(lead.contractors) ? lead.contractors[0] : lead.contractors;
    if (owner?.user_id !== userId) throw new Error("Forbidden");
    await supabaseAdmin
      .from("contractor_leads")
      .update({ status: data.status, updated_at: new Date().toISOString() })
      .eq("id", data.leadId);
    await supabaseAdmin.from("lead_events").insert({
      lead_id: data.leadId,
      event_type: `status_${data.status}`,
      actor_id: userId,
    });
    return { ok: true };
  });
