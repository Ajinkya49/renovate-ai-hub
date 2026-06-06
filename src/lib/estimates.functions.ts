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

// Rich analysis schema matching the user-facing spec. The AI returns
// observations + quantities only — no prices. We then deterministically
// derive scope line items for the pricing engine.
const AI_ROOM_TYPES = [
  "Bathroom", "Kitchen", "Living Room", "Bedroom", "Dining Room", "Balcony", "Office", "Other",
] as const;
const FLOORING_TYPES = [
  "tile", "marble", "granite", "wood", "laminate", "vitrified", "concrete", "unknown",
] as const;
const CONDITIONS = ["new", "good", "fair", "poor", "damaged", "unknown"] as const;
const COUNTERTOP_TYPES = ["granite", "marble", "laminate", "quartz", "none", "unknown"] as const;

const VisionSchema = z.object({
  room_type: z.enum(AI_ROOM_TYPES).optional().default("Other"),
  floor_area_sqft: z.coerce.number().min(0).max(20000).optional().default(0),
  wall_area_sqft: z.coerce.number().min(0).max(40000).optional().default(0),
  ceiling_area_sqft: z.coerce.number().min(0).max(20000).optional().default(0),
  flooring_type: z.enum(FLOORING_TYPES).optional().default("unknown"),
  flooring_condition: z.enum(CONDITIONS).optional().default("unknown"),
  paint_condition: z.enum(CONDITIONS).optional().default("unknown"),
  water_damage_detected: z.coerce.boolean().optional().default(false),
  cabinet_count: z.coerce.number().min(0).max(50).optional().default(0),
  cabinet_condition: z.enum(CONDITIONS).optional().default("unknown"),
  countertop_type: z.enum(COUNTERTOP_TYPES).optional().default("none"),
  countertop_length_ft: z.coerce.number().min(0).max(200).optional().default(0),
  fixtures: z.array(z.string()).max(40).optional().default([]),
  electrical_upgrade_required: z.coerce.boolean().optional().default(false),
  plumbing_upgrade_required: z.coerce.boolean().optional().default(false),
  demolition_required: z.coerce.boolean().optional().default(false),
  renovation_complexity: z.enum(["Low", "Medium", "High"]).optional().default("Medium"),
  confidence_score: z.coerce.number().min(0).max(1).optional().default(0.6),
  notes: z.string().max(1000).optional().default(""),
});

type VisionOutput = z.infer<typeof VisionSchema>;
type DerivedScope = {
  category: (typeof SCOPE_CATEGORIES)[number];
  description: string;
  quantity: number;
  unit: (typeof UNITS)[number];
};

/** Convert rich AI analysis into deterministic scope items for pricing. */
function deriveScopeFromAnalysis(a: VisionOutput): DerivedScope[] {
  const items: DerivedScope[] = [];
  const floor = a.floor_area_sqft || 0;
  const wall = a.wall_area_sqft || (floor > 0 ? Math.round(floor * 2.4) : 0);
  const ceiling = a.ceiling_area_sqft || floor;

  if (a.demolition_required && floor > 0) {
    items.push({ category: "demolition", description: "Strip-out & debris removal", quantity: floor, unit: "sqft" });
  }
  if (["poor", "damaged"].includes(a.flooring_condition) && floor > 0) {
    const t = a.flooring_type === "unknown" ? "vitrified" : a.flooring_type;
    items.push({ category: "flooring", description: `New ${t} flooring`, quantity: floor, unit: "sqft" });
  }
  if (wall > 0 && ["fair", "poor", "damaged"].includes(a.paint_condition)) {
    items.push({ category: "paint", description: "Wall putty + 2-coat paint", quantity: wall, unit: "sqft" });
  }
  if (a.water_damage_detected) {
    items.push({ category: "labor_general", description: "Waterproofing & damp treatment", quantity: 16, unit: "hr" });
  }
  if (/false ceiling|pop|gypsum/i.test(a.notes + " " + a.fixtures.join(" ")) && ceiling > 0) {
    items.push({ category: "drywall", description: "False ceiling (POP/gypsum)", quantity: ceiling, unit: "sqft" });
  }
  if (a.cabinet_count > 0 && ["poor", "damaged"].includes(a.cabinet_condition)) {
    items.push({ category: "cabinetry", description: "Modular cabinet replacement", quantity: a.cabinet_count, unit: "ea" });
  }
  if (a.countertop_length_ft > 0 && a.countertop_type !== "none" && a.countertop_type !== "unknown") {
    items.push({ category: "countertops", description: `${a.countertop_type} countertop`, quantity: a.countertop_length_ft, unit: "lf" });
  }
  const plumbingFixtures = a.fixtures.filter((f) => /sink|toilet|shower|bath|faucet|tap/i.test(f)).length;
  if (a.plumbing_upgrade_required || plumbingFixtures > 0) {
    items.push({ category: "plumbing", description: "Fixture replacement & plumbing rework", quantity: Math.max(1, plumbingFixtures), unit: "ea" });
  }
  if (a.electrical_upgrade_required) {
    items.push({ category: "electrical", description: "Wiring / switchboard upgrade", quantity: 1, unit: "lot" });
  }
  const electricalFixtures = a.fixtures.filter((f) => /light|lamp|switch|fan|exhaust/i.test(f)).length;
  if (electricalFixtures > 0) {
    items.push({ category: "electrical", description: "Light fixtures & switches", quantity: electricalFixtures, unit: "ea" });
  }
  if (items.length === 0) {
    items.push({ category: "labor_general", description: "General renovation labor", quantity: 40, unit: "hr" });
  }
  return items.slice(0, 20);
}

function mapComplexity(c: VisionOutput["renovation_complexity"]): Complexity {
  return c.toLowerCase() as Complexity;
}
function mapAiRoomType(c: VisionOutput["room_type"], hint: string): RoomType {
  const m: Record<string, RoomType> = {
    Bathroom: "bathroom", Kitchen: "kitchen", "Living Room": "living_room",
    Bedroom: "bedroom", "Dining Room": "living_room", Balcony: "exterior",
    Office: "other", Other: "other",
  };
  return m[c] ?? ((ROOM_TYPES as readonly string[]).includes(hint) ? (hint as RoomType) : "other");
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
    const { output } = await generateText({
      model,
      output: Output.object({ schema: VisionSchema }),
      messages: [
        {
          role: "system",
          content: [
            "You are a senior construction estimator, quantity surveyor, interior contractor, and renovation consultant specializing in Indian residential renovations.",
            "Analyze the uploaded room image and identify renovation work items and quantities ONLY. Do NOT guess prices. Do NOT generate random costs.",
            "",
            "Detect room_type from: Bathroom, Kitchen, Living Room, Bedroom, Dining Room, Balcony, Office, Other.",
            "Estimate floor_area_sqft, wall_area_sqft (≈ floor × 2.4 if not directly measurable), ceiling_area_sqft.",
            "Flooring: detect type (tile/marble/granite/wood/laminate/vitrified/concrete/unknown) and condition (new/good/fair/poor/damaged/unknown).",
            "Walls: assess paint_condition (new/good/fair/poor/damaged/unknown), set water_damage_detected true if you see cracks, dampness, peeling, or staining.",
            "Ceiling: include 'false ceiling', 'POP', or 'gypsum' in notes/fixtures if visible; otherwise leave it out.",
            "Cabinets: count visible cabinets and assess condition.",
            "Countertops: detect type (granite/marble/laminate/quartz/none/unknown) and estimate countertop_length_ft.",
            "Fixtures: list short labels for each visible fixture (e.g. 'sink', 'toilet', 'shower', 'bathtub', 'faucet', 'ceiling light', 'switchboard', 'exhaust fan').",
            "Set plumbing_upgrade_required, electrical_upgrade_required, demolition_required based on visible condition.",
            "renovation_complexity: Low (cosmetic refresh), Medium (mid-grade with some plumbing/electrical), High (full gut / layout / structural).",
            "confidence_score: 0–1, how confident you are in this analysis.",
            "notes: 1–2 short sentences summarizing what you see.",
            "",
            "Be conservative — only mark a category as 'poor' or 'damaged', or set a *_required flag, if the photo clearly shows it.",
            "Return ONLY the structured object matching the provided schema.",
          ].join("\n"),
        },
        {
          role: "user",
          content: [
            { type: "text", text: `Room type hint: ${project.room_type}. Location: India${project.zip_code ? ` (PIN ${project.zip_code})` : ""}.` },
            ...imageParts,
          ],
        },
      ],
    });
    const latencyMs = Date.now() - t0;
    const analysis = output;
    const derivedScope = deriveScopeFromAnalysis(analysis);

    // 5. Persist AI analysis.
    await supabase.from("ai_analysis").insert({
      project_id: project.id,
      model: "google/gemini-2.5-flash",
      detected_objects: analysis.fixtures,
      scope: { analysis, derived: derivedScope },
      complexity: mapComplexity(analysis.renovation_complexity),
      confidence: analysis.confidence_score,
      latency_ms: latencyMs,
    });

    // 6. Compute deterministic estimate.
    const roomType = mapAiRoomType(analysis.room_type, project.room_type);
    const result = computeEstimate({
      roomType,
      zipCode: project.zip_code,
      region: project.region,
      complexity: mapComplexity(analysis.renovation_complexity),
      scope: derivedScope as ScopeItem[],
      squareFeet: analysis.floor_area_sqft || undefined,
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

    // Auto-match contractors for this fresh estimate.
    try {
      const { matchContractorsForProject } = await import("@/lib/leads.functions");
      await matchContractorsForProject(project.id);
    } catch (e) {
      console.error("[matchContractorsForProject] failed", e);
    }

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
