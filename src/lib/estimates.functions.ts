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

const VisionSchema = z.object({
  detectedObjects: z.array(z.string()).max(40),
  estimatedSquareFeet: z.number().min(20).max(5000).optional(),
  conditionNotes: z.string().max(800),
  complexity: z.enum(["low", "medium", "high"]),
  scope: z
    .array(
      z.object({
        category: z.enum(SCOPE_CATEGORIES),
        description: z.string().min(2).max(200),
        quantity: z.number().min(0.1).max(10000),
        unit: z.enum(["sqft", "lf", "ea", "hr", "lot"]),
      }),
    )
    .min(1)
    .max(20),
});

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
            "You are RenovationOS Vision — an expert renovation scoper for U.S. residential projects.",
            "Analyze the uploaded room photos and produce a structured renovation scope.",
            "Be conservative and realistic. Only include work that is clearly justified by what is visible.",
            "Categories MUST come from the allowed enum. Units: sqft, lf, ea, hr, lot.",
            "Complexity: low = cosmetic refresh; medium = mid-grade remodel with some plumbing/electrical;",
            "high = full gut, layout changes, structural or extensive systems work.",
          ].join(" "),
        },
        {
          role: "user",
          content: [
            { type: "text", text: `Room type: ${project.room_type}. ZIP: ${project.zip_code ?? "unknown"}.` },
            ...imageParts,
          ],
        },
      ],
    });
    const latencyMs = Date.now() - t0;

    // 5. Persist AI analysis.
    await supabase.from("ai_analysis").insert({
      project_id: project.id,
      model: "google/gemini-2.5-flash",
      detected_objects: output.detectedObjects,
      scope: output.scope,
      complexity: output.complexity,
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
      complexity: output.complexity as Complexity,
      scope: output.scope as ScopeItem[],
      squareFeet: output.estimatedSquareFeet,
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
