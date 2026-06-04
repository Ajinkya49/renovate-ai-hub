/**
 * RenovationOS — Deterministic Pricing Engine v1
 *
 * Pure TypeScript module. No I/O, no randomness. Same input → same output.
 * Returns LOW / EXPECTED / HIGH cost ranges in USD cents plus line items,
 * timeline, and confidence. Uses regional cost-of-living multipliers and
 * complexity multipliers derived from AI vision scope.
 */

export type RoomType =
  | "kitchen"
  | "bathroom"
  | "living_room"
  | "bedroom"
  | "basement"
  | "exterior"
  | "other";

export type Complexity = "low" | "medium" | "high";

export type ScopeItem = {
  category:
    | "demolition"
    | "plumbing"
    | "electrical"
    | "cabinetry"
    | "countertops"
    | "flooring"
    | "tile"
    | "drywall"
    | "paint"
    | "fixtures"
    | "appliances"
    | "windows"
    | "hvac"
    | "permits"
    | "labor_general";
  description: string;
  quantity: number;
  unit: "sqft" | "lf" | "ea" | "hr" | "lot";
};

export type PricingInput = {
  roomType: RoomType;
  zipCode?: string | null;
  region?: string | null;
  complexity: Complexity;
  scope: ScopeItem[];
  squareFeet?: number;
};

export type LineItem = {
  category: ScopeItem["category"];
  description: string;
  quantity: number;
  unit: string;
  unitCostCents: number;
  subtotalCents: number;
};

export type PricingResult = {
  lowCents: number;
  expectedCents: number;
  highCents: number;
  lineItems: LineItem[];
  timelineWeeksMin: number;
  timelineWeeksMax: number;
  confidence: number;
  assumptions: string[];
  pricingVersion: "v1";
  region: string;
};

// Base unit costs in INR paise (1 INR = 100 paise). India median pricing.
// Sourced from RenovationOS India pricing reference. Conservative midpoints.
const BASE_UNIT_COSTS: Record<ScopeItem["category"], number> = {
  demolition: 5000, // ₹50/sqft
  plumbing: 5000000, // ₹50,000 per fixture/ea
  electrical: 500000, // ₹5,000 per ea (outlet/point avg)
  cabinetry: 1500000, // ₹15,000 per linear foot
  countertops: 150000, // ₹1,500 per sqft
  flooring: 20000, // ₹200 per sqft installed
  tile: 25000, // ₹250 per sqft installed
  drywall: 8000, // ₹80 per sqft (false ceiling / partition)
  paint: 3000, // ₹30 per sqft
  fixtures: 800000, // ₹8,000 per ea
  appliances: 4000000, // ₹40,000 per ea
  windows: 1500000, // ₹15,000 per ea
  hvac: 8000000, // ₹80,000 per lot
  permits: 1000000, // ₹10,000 per lot
  labor_general: 40000, // ₹400 per hour
};

// 3-digit ZIP → regional cost multiplier (cost-of-living adjusted).
// Defaults to 1.0 when unknown.
const ZIP_PREFIX_MULTIPLIER: Record<string, number> = {
  // High-cost metros
  "100": 1.55, "101": 1.55, "102": 1.55, "103": 1.5, "104": 1.5,
  "110": 1.5, "111": 1.45, "112": 1.45, "113": 1.4, "114": 1.4,
  "940": 1.6, "941": 1.65, "942": 1.55, "943": 1.55, "944": 1.55,
  "945": 1.55, "946": 1.55, "947": 1.55, "948": 1.55, "949": 1.55,
  "900": 1.45, "902": 1.45, "904": 1.45, "905": 1.45,
  "021": 1.45, "022": 1.45, "024": 1.4, "020": 1.4,
  "981": 1.4, "980": 1.4, "982": 1.35,
  "200": 1.4, "201": 1.4, "220": 1.35,
  // Mid-cost
  "606": 1.2, "300": 1.1, "303": 1.1, "750": 1.1, "770": 1.1,
  "850": 1.15, "800": 1.15, "972": 1.2,
  // Lower-cost
  "350": 0.88, "360": 0.88, "390": 0.85,
  "650": 0.92, "660": 0.92,
};

const ROOM_COMPLEXITY_BASE_MULTIPLIER: Record<RoomType, number> = {
  kitchen: 1.0,
  bathroom: 1.0,
  living_room: 0.7,
  bedroom: 0.6,
  basement: 0.85,
  exterior: 1.1,
  other: 0.85,
};

const COMPLEXITY_MULTIPLIER: Record<Complexity, number> = {
  low: 0.85,
  medium: 1.0,
  high: 1.35,
};

// Variance band (low/high) widens with lower confidence.
const VARIANCE_BY_COMPLEXITY: Record<Complexity, { low: number; high: number }> = {
  low: { low: 0.88, high: 1.15 },
  medium: { low: 0.82, high: 1.25 },
  high: { low: 0.72, high: 1.45 },
};

function regionalMultiplier(zipCode?: string | null): { mult: number; region: string } {
  if (!zipCode || zipCode.length < 3) return { mult: 1.0, region: "national_median" };
  const prefix = zipCode.slice(0, 3);
  const mult = ZIP_PREFIX_MULTIPLIER[prefix];
  return mult ? { mult, region: `zip_${prefix}xx` } : { mult: 1.0, region: "national_median" };
}

function timelineForComplexity(roomType: RoomType, complexity: Complexity): [number, number] {
  const base: Record<RoomType, [number, number]> = {
    kitchen: [4, 8],
    bathroom: [3, 6],
    living_room: [2, 4],
    bedroom: [1, 3],
    basement: [4, 10],
    exterior: [3, 8],
    other: [2, 5],
  };
  const [lo, hi] = base[roomType];
  const factor = complexity === "low" ? 0.8 : complexity === "high" ? 1.5 : 1.0;
  return [Math.max(1, Math.round(lo * factor)), Math.max(2, Math.round(hi * factor))];
}

function confidenceScore(input: PricingInput): number {
  let c = 0.6;
  if (input.scope.length >= 4) c += 0.15;
  if (input.zipCode) c += 0.1;
  if (input.complexity === "low") c += 0.1;
  if (input.complexity === "high") c -= 0.05;
  return Math.min(0.95, Math.max(0.4, Number(c.toFixed(2))));
}

export function computeEstimate(input: PricingInput): PricingResult {
  const { mult: regionMult, region } = regionalMultiplier(input.zipCode);
  const roomMult = ROOM_COMPLEXITY_BASE_MULTIPLIER[input.roomType];
  const complexityMult = COMPLEXITY_MULTIPLIER[input.complexity];
  const totalMult = regionMult * roomMult * complexityMult;

  const lineItems: LineItem[] = input.scope.map((item) => {
    const baseUnit = BASE_UNIT_COSTS[item.category];
    const unitCostCents = Math.round(baseUnit * totalMult);
    const subtotalCents = Math.round(unitCostCents * item.quantity);
    return {
      category: item.category,
      description: item.description,
      quantity: item.quantity,
      unit: item.unit,
      unitCostCents,
      subtotalCents,
    };
  });

  const expectedSubtotal = lineItems.reduce((s, li) => s + li.subtotalCents, 0);
  // Contractor margin + contingency
  const expectedCents = Math.round(expectedSubtotal * 1.22);

  const variance = VARIANCE_BY_COMPLEXITY[input.complexity];
  const lowCents = Math.round(expectedCents * variance.low);
  const highCents = Math.round(expectedCents * variance.high);

  const [timelineWeeksMin, timelineWeeksMax] = timelineForComplexity(
    input.roomType,
    input.complexity,
  );

  const assumptions = [
    `Regional pricing applied: ${region} (×${regionMult.toFixed(2)}).`,
    `Complexity tier: ${input.complexity} (×${complexityMult.toFixed(2)}).`,
    `Includes 22% contractor margin + contingency.`,
    `Estimate excludes structural changes and unforeseen conditions.`,
  ];

  return {
    lowCents,
    expectedCents,
    highCents,
    lineItems,
    timelineWeeksMin,
    timelineWeeksMax,
    confidence: confidenceScore(input),
    assumptions,
    pricingVersion: "v1",
    region,
  };
}

// USD → INR conversion rate used to display estimates in Indian Rupees.
// Base pricing tables remain in USD cents internally; we convert at the edge.
export const USD_TO_INR = 83;

export function formatINR(usdCents: number): string {
  const rupees = (usdCents / 100) * USD_TO_INR;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(rupees);
}

// Backwards-compatible alias — all call sites now render INR.
export const formatUSD = formatINR;
