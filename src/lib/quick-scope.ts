/**
 * Quick Scope Builder — deterministic, no-AI scope templates.
 *
 * Given a room type, square footage, and finish level, returns a realistic
 * default scope that feeds straight into computeEstimate(). This powers the
 * "Quick Estimate" flow so users can get a price range without uploading
 * photos or calling any AI model.
 */
import type { RoomType, ScopeItem, Complexity } from "./pricing";

export type FinishLevel = "good" | "better" | "best";

const FINISH_TO_COMPLEXITY: Record<FinishLevel, Complexity> = {
  good: "low",
  better: "medium",
  best: "high",
};

const FINISH_QTY_MULT: Record<FinishLevel, number> = {
  good: 0.85,
  better: 1.0,
  best: 1.25,
};

export function finishToComplexity(level: FinishLevel): Complexity {
  return FINISH_TO_COMPLEXITY[level];
}

/**
 * Build a default scope for a room. Quantities scale with square footage
 * where it makes sense (flooring, paint, demo, tile) and with finish level
 * (cabinetry LF, fixture/appliance count, etc).
 */
export function buildQuickScope(
  roomType: RoomType,
  squareFeet: number,
  level: FinishLevel,
): ScopeItem[] {
  const sqft = Math.max(20, Math.min(5000, Math.round(squareFeet)));
  const f = FINISH_QTY_MULT[level];

  switch (roomType) {
    case "kitchen": {
      const cabLF = Math.max(12, Math.round(sqft * 0.4 * f));
      const counterSqft = Math.max(20, Math.round(sqft * 0.35 * f));
      return [
        { category: "demolition", description: "Remove existing cabinets, counters, flooring", quantity: sqft, unit: "sqft" },
        { category: "plumbing", description: "Reconnect sink, dishwasher, ice maker", quantity: 3, unit: "ea" },
        { category: "electrical", description: "Outlets, under-cabinet lighting, range circuit", quantity: 8, unit: "ea" },
        { category: "cabinetry", description: `${level === "best" ? "Custom" : level === "better" ? "Semi-custom" : "Stock"} cabinets`, quantity: cabLF, unit: "lf" },
        { category: "countertops", description: level === "best" ? "Quartz / natural stone" : level === "better" ? "Quartz" : "Laminate / butcher block", quantity: counterSqft, unit: "sqft" },
        { category: "flooring", description: "New kitchen flooring", quantity: sqft, unit: "sqft" },
        { category: "tile", description: "Backsplash", quantity: Math.round(sqft * 0.3), unit: "sqft" },
        { category: "paint", description: "Walls and ceiling", quantity: sqft, unit: "sqft" },
        { category: "appliances", description: "Range, fridge, dishwasher, microwave", quantity: level === "best" ? 5 : 4, unit: "ea" },
        { category: "fixtures", description: "Faucet, sink, lighting", quantity: 4, unit: "ea" },
        { category: "permits", description: "Building & electrical permits", quantity: 1, unit: "lot" },
      ];
    }
    case "bathroom": {
      return [
        { category: "demolition", description: "Remove fixtures, tile, vanity", quantity: sqft, unit: "sqft" },
        { category: "plumbing", description: "Tub/shower, toilet, vanity rough-in", quantity: 4, unit: "ea" },
        { category: "electrical", description: "GFCI outlets, fan, vanity lighting", quantity: 5, unit: "ea" },
        { category: "tile", description: "Shower walls and floor", quantity: Math.round(sqft * 1.5 * f), unit: "sqft" },
        { category: "flooring", description: "Bathroom floor tile", quantity: sqft, unit: "sqft" },
        { category: "fixtures", description: "Toilet, vanity, faucet, shower trim", quantity: level === "best" ? 6 : 5, unit: "ea" },
        { category: "cabinetry", description: "Vanity cabinet", quantity: Math.max(3, Math.round(sqft * 0.15)), unit: "lf" },
        { category: "paint", description: "Walls and ceiling", quantity: sqft, unit: "sqft" },
        { category: "permits", description: "Plumbing permit", quantity: 1, unit: "lot" },
      ];
    }
    case "living_room":
    case "bedroom": {
      return [
        { category: "demolition", description: "Minor demo / prep", quantity: Math.round(sqft * 0.2), unit: "sqft" },
        { category: "drywall", description: "Patch and repair", quantity: Math.round(sqft * 0.3), unit: "sqft" },
        { category: "flooring", description: "Replace flooring", quantity: sqft, unit: "sqft" },
        { category: "paint", description: "Walls, ceiling, trim", quantity: sqft, unit: "sqft" },
        { category: "electrical", description: "Outlets, lighting, switches", quantity: roomType === "living_room" ? 6 : 4, unit: "ea" },
        { category: "fixtures", description: "Light fixtures, ceiling fan", quantity: 2, unit: "ea" },
      ];
    }
    case "basement": {
      return [
        { category: "demolition", description: "Clear existing finishes", quantity: sqft, unit: "sqft" },
        { category: "drywall", description: "Frame and drywall walls/ceiling", quantity: Math.round(sqft * 1.8), unit: "sqft" },
        { category: "electrical", description: "Outlets, lighting, panel work", quantity: 14, unit: "ea" },
        { category: "plumbing", description: "Rough-in (if bathroom)", quantity: level === "good" ? 0 : 3, unit: "ea" },
        { category: "flooring", description: "Moisture-resistant flooring", quantity: sqft, unit: "sqft" },
        { category: "paint", description: "Walls and ceiling", quantity: Math.round(sqft * 1.5), unit: "sqft" },
        { category: "hvac", description: "Extend HVAC runs", quantity: 1, unit: "lot" },
        { category: "permits", description: "Building permit", quantity: 1, unit: "lot" },
      ];
    }
    case "exterior": {
      return [
        { category: "demolition", description: "Remove existing siding/trim", quantity: sqft, unit: "sqft" },
        { category: "windows", description: "Replacement windows", quantity: Math.max(4, Math.round(sqft / 120)), unit: "ea" },
        { category: "paint", description: "Exterior paint", quantity: sqft, unit: "sqft" },
        { category: "drywall", description: "Sheathing repair", quantity: Math.round(sqft * 0.2), unit: "sqft" },
        { category: "labor_general", description: "Carpentry & trim labor", quantity: Math.round(sqft * 0.08), unit: "hr" },
        { category: "permits", description: "Building permit", quantity: 1, unit: "lot" },
      ];
    }
    case "other":
    default: {
      return [
        { category: "demolition", description: "General demolition", quantity: Math.round(sqft * 0.4), unit: "sqft" },
        { category: "drywall", description: "Drywall repair", quantity: Math.round(sqft * 0.5), unit: "sqft" },
        { category: "flooring", description: "Flooring", quantity: sqft, unit: "sqft" },
        { category: "paint", description: "Paint", quantity: sqft, unit: "sqft" },
        { category: "electrical", description: "Electrical updates", quantity: 4, unit: "ea" },
        { category: "labor_general", description: "General labor", quantity: Math.round(sqft * 0.15), unit: "hr" },
      ];
    }
  }
}
