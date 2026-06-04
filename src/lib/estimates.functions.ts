import { createServerFn } from "@tanstack/react-start";
import { generateText, Output } from "ai";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";
import { computeEstimate, type RoomType, type Complexity, type ScopeItem } from "@/lib/pricing";

const ROOM_TYPES = [
  "kitchen",
  "bathroom",
  "living_room",
  "bedroom",
  "basement",
  "exterior",
  "other",
] as const;

const SCOPE_CATEGORIES = [
  "demolition",
  "plumbing",
  "electrical",
  "cabinetry",
  "countertops",
  "flooring",
  "tile",
  "drywall",
  "paint",
  "fixtures",
  "appliances",
  "windows",
  "hvac",
  "permits",
  "labor_general",
] as const;

const UNITS = ["sqft", "lf", "ea", "hr", "lot"] as const;

// Lenient schema — Gemini often returns slightly off-spec values (extra
// categories, string numbers, missing fields). We accept loose input and
// normalize after parsing rather than failing the whole generation.
const VisionSchema = z.object({
  detectedObjects: z.array(z.string()).max(80).optional().default([]),
  estimatedSquareFeet: z.coerce.number().min(1).max(20000).optional(),
  conditionNotes: z.string().max(2000).optional().default(""),
  complexity: z.enum(["low", "medium", "high"]).optional().default("medium"),
  scope: z
    .array(
      z.object({
        category: z.string(),
        description: z.string().min(1).max(400),
        quantity: z.coerce.number().min(0).max(100000).optional().default(1),
        unit: z.string().optional().default("ea"),
      }),
    )
    .optional()
    .default([]),
});

function normalizeScope(raw: z.infer<typeof VisionSchema>["scope"]) {
  const allowedCats = new Set<string>(SCOPE_CATEGORIES);
  const allowedUnits = new Set<string>(UNITS);
  const normalized = raw.map((item) => {
    const cat = (item.category || "").toLowerCase().replace(/\s+/g, "_");
    const unit = (item.unit || "ea").toLowerCase();
    return {
      category: (allowedCats.has(cat) ? cat : "labor_general") as (typeof SCOPE_CATEGORIES)[number],
      description: item.description.slice(0, 200),
      quantity: Math.max(0.1, Math.min(10000, item.quantity || 1)),
      unit: (allowedUnits.has(unit) ? unit : "ea") as (typeof UNITS)[number],
    };
  });
  if (normalized.length === 0) {
    normalized.push({
      category: "labor_general",
      description: "General renovation labor",
      quantity: 40,
      unit: "hr",
    });
  }
  return normalized.slice(0, 20);
}

const CreateEstimateInput = z.object({
  projectId: z.string().uuid(),
});

/**
 * Run AI vision over uploaded photos, persist analysis, compute deterministic
 * estimate, persist estimate + line items. Idempotent per project: re-running
 * replaces prior analysis/estimate.
 */
export const generateEstimate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => CreateEstimateInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // 1. Load project (RLS-scoped to owner).
    const { data: project, error: projectErr } = await supabase
      .from("projects")
      .select("id, room_type, zip_code, region, owner_id")
      .eq("id", data.projectId)
      .single();
    if (projectErr || !project) throw new Error("Project not found");
    if (project.owner_id !== userId) throw new Error("Forbidden");

    // 2. Load uploads.
    const { data: uploads, error: upErr } = await supabase
      .from("room_uploads")
      .select("id, storage_path")
      .eq("project_id", data.projectId)
      .order("created_at", { ascending: true })
      .limit(6);
    if (upErr) throw new Error(upErr.message);
    if (!uploads || uploads.length === 0) {
      throw new Error("Upload at least one photo before generating an estimate");
    }

    // 3. Build signed URLs (private bucket) — fetch bytes and inline as base64
    //    for the vision model so it never needs to reach back into our storage.
    const imageParts: { type: "image"; image: string }[] = [];
    for (const up of uploads) {
      const { data: signed, error: sErr } = await supabaseAdmin.storage
        .from("room-uploads")
        .createSignedUrl(up.storage_path, 60);
      if (sErr || !signed) continue;
      const res = await fetch(signed.signedUrl);
      if (!res.ok) continue;
      const buf = new Uint8Array(await res.arrayBuffer());
      const b64 = btoa(String.fromCharCode(...buf));
      const mime = res.headers.get("content-type") || "image/jpeg";
      imageParts.push({ type: "image", image: `data:${mime};base64,${b64}` });
    }
    if (imageParts.length === 0) throw new Error("Could not load uploaded photos");

    // 4. Call Lovable AI Gateway with vision-capable Gemini.
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("AI gateway not configured");
    const gateway = createLovableAiGatewayProvider(key);
    const model = gateway("google/gemini-2.5-flash");

    const t0 = Date.now();
    let parsed: z.infer<typeof VisionSchema>;
    try {
      const { output } = await generateText({
        model,
        output: Output.object({ schema: VisionSchema }),
        messages: [
          {
            role: "system",
            content: [
              "You are RenovationOS AI — an expert renovation estimator for India.",
              "Analyze the uploaded room image(s) and produce a structured renovation scope.",
              "Base the scope ONLY on what is clearly visible. Be conservative. Do NOT hallucinate.",
              "Categories MUST come from: demolition, plumbing, electrical, cabinetry, countertops, flooring, tile, drywall, paint, fixtures, appliances, windows, hvac, permits, labor_general.",
              "Units MUST be one of: sqft, lf, ea, hr, lot.",
              "Complexity is one of: low, medium, high.",
              "Return ONLY the structured object — no prose, no markdown.",
            ].join(" "),
          },
          {
            role: "user",
            content: [
              { type: "text", text: `Room type: ${project.room_type}. Location: ${project.zip_code ?? "India"}.` },
              ...imageParts,
            ],
          },
        ],
      });
      parsed = output;
    } catch (err) {
      // Model returned text not matching schema (common with vision models).
      // Fall back to a conservative default scope so the user still gets an estimate.
      console.error("AI vision schema failure, using fallback scope:", err);
      parsed = {
        detectedObjects: [],
        estimatedSquareFeet: undefined,
        conditionNotes: "AI analysis unavailable — generated baseline estimate from room type.",
        complexity: "medium",
        scope: [],
      };
    }
    const latencyMs = Date.now() - t0;
    const normalizedScope = normalizeScope(parsed.scope);

    // 5. Persist AI analysis.
    await supabase.from("ai_analysis").insert({
      project_id: project.id,
      model: "google/gemini-2.5-flash",
      detected_objects: parsed.detectedObjects,
      scope: normalizedScope,
      complexity: parsed.complexity,
      confidence: 0.75,
      latency_ms: latencyMs,
    });

    // 6. Compute deterministic estimate.
    const roomType = (ROOM_TYPES as readonly string[]).includes(project.room_type)
      ? (project.room_type as RoomType)
      : ("other" as RoomType);
    const result = computeEstimate({
      roomType,
      zipCode: project.zip_code,
      region: project.region,
      complexity: parsed.complexity as Complexity,
      scope: normalizedScope as ScopeItem[],
      squareFeet: parsed.estimatedSquareFeet,
    });

    // 7. Replace any prior estimate for this project, then insert new + line items.
    await supabaseAdmin.from("estimates").delete().eq("project_id", project.id);
    const { data: est, error: estErr } = await supabaseAdmin
      .from("estimates")
      .insert({
        project_id: project.id,
        low_cents: result.lowCents,
        expected_cents: result.expectedCents,
        high_cents: result.highCents,
        timeline_weeks_min: result.timelineWeeksMin,
        timeline_weeks_max: result.timelineWeeksMax,
        confidence: result.confidence,
        assumptions: result.assumptions,
        region: result.region,
        pricing_version: result.pricingVersion,
      })
      .select("id")
      .single();
    if (estErr || !est) throw new Error(estErr?.message || "Failed to save estimate");

    await supabaseAdmin.from("estimate_line_items").insert(
      result.lineItems.map((li, i) => ({
        estimate_id: est.id,
        category: li.category,
        description: li.description,
        quantity: li.quantity,
        unit: li.unit,
        unit_cost_cents: li.unitCostCents,
        subtotal_cents: li.subtotalCents,
        sort_order: i,
      })),
    );

    await supabaseAdmin
      .from("projects")
      .update({ status: "estimated" })
      .eq("id", project.id);

    return { estimateId: est.id, projectId: project.id };
  });

const CreateProjectInput = z.object({
  title: z.string().min(1).max(120),
  roomType: z.enum(ROOM_TYPES),
  zipCode: z.string().regex(/^\d{5}$/).optional().or(z.literal("")),
  notes: z.string().max(1000).optional(),
});

export const createProject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => CreateProjectInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: project, error } = await supabase
      .from("projects")
      .insert({
        owner_id: userId,
        title: data.title,
        room_type: data.roomType,
        zip_code: data.zipCode || null,
        notes: data.notes || null,
      })
      .select("id")
      .single();
    if (error || !project) throw new Error(error?.message || "Failed to create project");
    return { projectId: project.id };
  });

const QuickEstimateInput = z.object({
  title: z.string().min(1).max(120),
  roomType: z.enum(ROOM_TYPES),
  zipCode: z.string().regex(/^\d{5}$/).optional().or(z.literal("")),
  squareFeet: z.coerce.number().min(20).max(5000),
  finishLevel: z.enum(["good", "better", "best"]),
  notes: z.string().max(1000).optional(),
});

/**
 * No-AI deterministic estimate. Builds scope from a template, runs it
 * through computeEstimate(), persists project + estimate + line items.
 */
export const quickEstimate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => QuickEstimateInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { buildQuickScope, finishToComplexity } = await import("@/lib/quick-scope");

    const { data: project, error: pErr } = await supabase
      .from("projects")
      .insert({
        owner_id: userId,
        title: data.title,
        room_type: data.roomType,
        zip_code: data.zipCode || null,
        notes: data.notes || null,
      })
      .select("id")
      .single();
    if (pErr || !project) throw new Error(pErr?.message || "Failed to create project");

    const scope = buildQuickScope(data.roomType as RoomType, data.squareFeet, data.finishLevel);
    const complexity = finishToComplexity(data.finishLevel);
    const result = computeEstimate({
      roomType: data.roomType as RoomType,
      zipCode: data.zipCode || null,
      complexity,
      scope,
      squareFeet: data.squareFeet,
    });

    const { data: est, error: estErr } = await supabaseAdmin
      .from("estimates")
      .insert({
        project_id: project.id,
        low_cents: result.lowCents,
        expected_cents: result.expectedCents,
        high_cents: result.highCents,
        timeline_weeks_min: result.timelineWeeksMin,
        timeline_weeks_max: result.timelineWeeksMax,
        confidence: result.confidence,
        assumptions: [
          `Quick estimate — no photo analysis.`,
          `Finish level: ${data.finishLevel}.`,
          `Approx. ${data.squareFeet} sqft.`,
          ...result.assumptions,
        ],
        region: result.region,
        pricing_version: result.pricingVersion,
      })
      .select("id")
      .single();
    if (estErr || !est) throw new Error(estErr?.message || "Failed to save estimate");

    await supabaseAdmin.from("estimate_line_items").insert(
      result.lineItems.map((li, i) => ({
        estimate_id: est.id,
        category: li.category,
        description: li.description,
        quantity: li.quantity,
        unit: li.unit,
        unit_cost_cents: li.unitCostCents,
        subtotal_cents: li.subtotalCents,
        sort_order: i,
      })),
    );

    await supabaseAdmin
      .from("projects")
      .update({ status: "estimated" })
      .eq("id", project.id);

    return { projectId: project.id, estimateId: est.id };
  });

const GetEstimateInput = z.object({ projectId: z.string().uuid() });

export const getProjectWithEstimate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => GetEstimateInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const [{ data: project }, { data: estimate }, { data: uploads }] = await Promise.all([
      supabase
        .from("projects")
        .select("id, title, room_type, zip_code, status, notes, created_at")
        .eq("id", data.projectId)
        .single(),
      supabase
        .from("estimates")
        .select("id, low_cents, expected_cents, high_cents, timeline_weeks_min, timeline_weeks_max, confidence, assumptions, region, created_at")
        .eq("project_id", data.projectId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("room_uploads")
        .select("id, storage_path, created_at")
        .eq("project_id", data.projectId)
        .order("created_at", { ascending: true }),
    ]);
    if (!project) throw new Error("Project not found");

    let lineItems: Array<{
      id: string;
      category: string;
      description: string;
      quantity: number;
      unit: string | null;
      unit_cost_cents: number;
      subtotal_cents: number;
    }> = [];
    if (estimate) {
      const { data: li } = await supabase
        .from("estimate_line_items")
        .select("id, category, description, quantity, unit, unit_cost_cents, subtotal_cents")
        .eq("estimate_id", estimate.id)
        .order("sort_order", { ascending: true });
      lineItems = li ?? [];
    }

    // Build signed URLs for thumbnails.
    const thumbs: { id: string; url: string }[] = [];
    for (const u of uploads ?? []) {
      const { data: signed } = await supabaseAdmin.storage
        .from("room-uploads")
        .createSignedUrl(u.storage_path, 60 * 30);
      if (signed) thumbs.push({ id: u.id, url: signed.signedUrl });
    }

    return { project, estimate, lineItems, uploads: thumbs };
  });

export const listMyProjects = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const { data, error } = await supabase
      .from("projects")
      .select("id, title, room_type, status, created_at, zip_code")
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

const ProjectMatchesInput = z.object({ projectId: z.string().uuid() });

export const listProjectMatches = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => ProjectMatchesInput.parse(input))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    // Verify ownership.
    const { data: project } = await supabaseAdmin
      .from("projects")
      .select("id, owner_id")
      .eq("id", data.projectId)
      .maybeSingle();
    if (!project || project.owner_id !== userId) throw new Error("Not found");

    const { data: leads } = await supabaseAdmin
      .from("contractor_leads")
      .select(
        "id, status, score, created_at, contractor_id, contractors(id, slug, business_name, bio, specialties, rating, review_count, insured, years_experience, logo_url)",
      )
      .eq("project_id", data.projectId)
      .order("created_at", { ascending: false });

    return (leads ?? []).map((l) => {
      const c = Array.isArray(l.contractors) ? l.contractors[0] : l.contractors;
      return {
        leadId: l.id,
        status: l.status,
        score: l.score != null ? Number(l.score) : null,
        createdAt: l.created_at,
        contractor: c
          ? {
              id: c.id,
              slug: c.slug,
              businessName: c.business_name,
              bio: c.bio,
              specialties: c.specialties ?? [],
              rating: Number(c.rating ?? 0),
              reviewCount: c.review_count ?? 0,
              insured: !!c.insured,
              yearsExperience: c.years_experience,
              logoUrl: c.logo_url,
            }
          : null,
      };
    });
  });
