import { getCityTechnicalSpecs, type CityTechnicalSpecs, type CityFrameType } from "@/lib/city-bike-specs";
import type { ShopifyBike } from "@/types/shopify";

export interface Answers {
  category: string;
  budget: number;
  level: string;
  usage: string;
  brand?: string;
  cityPriority?: string;
}

export interface MatchedBikeResult {
  id: string;
  brand: string;
  model: string;
  category: string;
  price: number;
  availability: ShopifyBike["availability"];
  productHandle: string;
  level: string;
  usage: string;
  image: string;
  isFallbackAboveBudget?: boolean;
  matchReasons?: string[];
}

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function normalizeForDedup(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[^a-z0-9 ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function getDedupKey(bike: ShopifyBike) {
  return `${normalizeForDedup(bike.brand || "")}|${normalizeForDedup(bike.title || "")}`;
}

function getTechnicalDataCompletenessScore(bike: ShopifyBike) {
  const technicalFields = [
    bike.electricBikeCategory,
    bike.motorBrand,
    bike.motorModel,
    bike.torqueNm,
    bike.boostTorqueNm,
    bike.batteryWh,
    bike.travelFrontMm,
    bike.travelRearMm,
    bike.weightKg,
    bike.emtbPowerType,
    bike.emtbProfile,
  ];

  return technicalFields.reduce<number>((score, value) => (value !== undefined ? score + 1 : score), 0);
}

function isAvailableForSale(bike: ShopifyBike) {
  return bike.availability === "in_stock";
}

function deduplicateBikesByVisibleModel(bikes: ShopifyBike[]) {
  const deduped: ShopifyBike[] = [];
  const indexByKey = new Map<string, number>();
  const removedDiagnostics: Array<{
    title: string;
    kept: ShopifyBike;
    removed: ShopifyBike;
    reason: string;
  }> = [];
  const duplicateTitlesRemoved = new Set<string>();

  bikes.forEach((bike) => {
    const key = getDedupKey(bike);
    const existingIndex = indexByKey.get(key);

    if (existingIndex === undefined) {
      indexByKey.set(key, deduped.length);
      deduped.push(bike);
      return;
    }

    const currentKept = deduped[existingIndex];
    const keptAvailable = isAvailableForSale(currentKept);
    const candidateAvailable = isAvailableForSale(bike);

    if (candidateAvailable !== keptAvailable) {
      if (candidateAvailable) {
        deduped[existingIndex] = bike;
        removedDiagnostics.push({
          title: bike.title,
          kept: bike,
          removed: currentKept,
          reason: "kept available-for-sale record",
        });
      } else {
        removedDiagnostics.push({
          title: bike.title,
          kept: currentKept,
          removed: bike,
          reason: "kept available-for-sale record",
        });
      }
      duplicateTitlesRemoved.add(bike.title);
      return;
    }

    const keptCompleteness = getTechnicalDataCompletenessScore(currentKept);
    const candidateCompleteness = getTechnicalDataCompletenessScore(bike);

    if (candidateCompleteness !== keptCompleteness) {
      if (candidateCompleteness > keptCompleteness) {
        deduped[existingIndex] = bike;
        removedDiagnostics.push({
          title: bike.title,
          kept: bike,
          removed: currentKept,
          reason: "kept record with more complete technical data",
        });
      } else {
        removedDiagnostics.push({
          title: bike.title,
          kept: currentKept,
          removed: bike,
          reason: "kept record with more complete technical data",
        });
      }
      duplicateTitlesRemoved.add(bike.title);
      return;
    }

    removedDiagnostics.push({
      title: bike.title,
      kept: currentKept,
      removed: bike,
      reason: "kept first record (same availability and technical completeness)",
    });
    duplicateTitlesRemoved.add(bike.title);
  });

  return {
    bikes: deduped,
    removedDiagnostics,
    duplicateTitlesRemoved: Array.from(duplicateTitlesRemoved),
  };
}

type RoadBikeProfile = "RACE" | "ENDURANCE" | "OTHER";
type MTBProfile = "XC_RACE" | "TRAIL" | "ENDURO" | "OTHER";
type GravelProfile = "RACE_GRAVEL" | "ALL_ROAD_FAST" | "ADVENTURE_BIKEPACKING" | "OTHER";
type EMTBRiderIntent =
  | "LONG_DISTANCE"
  | "STEEP_CLIMBS"
  | "TRAIL_BALANCED"
  | "DESCENT_FOCUSED"
  | "AGILE_NATURAL";
type EMTBSuitabilityTier = "PERFECT" | "EXCELLENT" | "GOOD" | "ACCEPTABLE" | "POOR";
type CityPriorityPreference =
  | "PRACTICAL_DAILY"
  | "AUTONOMY"
  | "COMFORT"
  | "LOW_MAINTENANCE"
  | "EASY_MOUNTING";
type CitySuitabilityTier = EMTBSuitabilityTier;

interface ResolvedCityBike extends ShopifyBike, CityTechnicalSpecs {}

interface EMTBRankingDetails {
  riderIntent: EMTBRiderIntent;
  suitabilityTier: EMTBSuitabilityTier;
  uncappedSuitabilityTier: EMTBSuitabilityTier;
  profileTierCap: EMTBSuitabilityTier;
  technicalScore: number;
  scoreBeforeTierCap: number;
  profileContribution: number;
  batteryContribution: number;
  powerContribution: number;
  levelAdjustment: number;
  brandAdjustment: number;
  finalRankingValue: number;
  reasonCodes: string[];
  technicalFacts: Record<string, string | number>;
}

interface CityRankingDetails {
  cityPriority: CityPriorityPreference;
  suitabilityTier: CitySuitabilityTier;
  technicalScore: number;
  primaryContribution: number;
  contextualContribution: number;
  budgetContribution: number;
  levelAdjustment: number;
  utilityCoverageCount: number;
  familyKey: string;
  matchReasons: string[];
}

/**
 * Classify a ROAD bike into a profile based on its title
 */
function getRoadBikeProfile(title: string): RoadBikeProfile {
  const normalized = normalize(title);

  // RACE profiles: Madone, SuperSix, SuperSix EVO, Addict RC, Foil, Émonda, Emonda
  const racePatterns = ["madone", "supersix", "émonda", "emonda", "foil", "addictrc"];
  for (const pattern of racePatterns) {
    if (normalized.includes(pattern)) {
      return "RACE";
    }
  }

  // ENDURANCE profiles: Domane, Synapse, Addict (without RC)
  const endurancePatterns = ["domane", "synapse"];
  for (const pattern of endurancePatterns) {
    if (normalized.includes(pattern)) {
      return "ENDURANCE";
    }
  }

  // Special case: Addict without RC
  if (normalized.includes("addict") && !normalized.includes("addictrc")) {
    return "ENDURANCE";
  }

  return "OTHER";
}

/**
 * Classify an MTB bike into a profile based on title and product handle
 */
function getMTBProfile(title: string, productHandle: string): MTBProfile {
  const normalized = normalize(`${title} ${productHandle}`);

  // XC_RACE profiles: Supercaliber, Scalpel, Scale
  const xcRacePatterns = ["supercaliber", "scalpel", "scale"];
  for (const pattern of xcRacePatterns) {
    if (normalized.includes(pattern)) {
      return "XC_RACE";
    }
  }

  // TRAIL profiles: Fuel EX
  if (normalized.includes("fuelex")) {
    return "TRAIL";
  }

  // ENDURO profiles: Slash, Genius
  const enduroPatterns = ["slash", "genius"];
  for (const pattern of enduroPatterns) {
    if (normalized.includes(pattern)) {
      return "ENDURO";
    }
  }

  return "OTHER";
}

/**
 * Classify a GRAVEL bike into a profile based on title and product handle
 */
function getGravelProfile(title: string, productHandle: string): GravelProfile {
  const normalized = normalize(`${title} ${productHandle}`);

  // Specific rules must run before generic rules.
  if (normalized.includes("addictgravelrc")) {
    return "RACE_GRAVEL";
  }

  if (normalized.includes("topstonecarbon")) {
    return "ALL_ROAD_FAST";
  }

  if (normalized.includes("checkpointalr")) {
    return "ADVENTURE_BIKEPACKING";
  }

  if (normalized.includes("checkpointsl")) {
    return "ALL_ROAD_FAST";
  }

  // RACE_GRAVEL profiles
  const racePatterns = ["checkmate", "superx", "kaius"];
  for (const pattern of racePatterns) {
    if (normalized.includes(pattern)) {
      return "RACE_GRAVEL";
    }
  }

  // ALL_ROAD_FAST profiles
  if (normalized.includes("addictgravel")) {
    return "ALL_ROAD_FAST";
  }

  // ADVENTURE_BIKEPACKING profiles
  if (normalized.includes("topstone") || normalized.includes("speedstergravel")) {
    return "ADVENTURE_BIKEPACKING";
  }

  return "OTHER";
}

/**
 * Determine suitability tier for ROAD bikes based on profile and user answers
 */
function getRoadSuitabilityTier(profile: RoadBikeProfile, answers: Answers): number {
  const normalizedUsage = normalize(answers.usage);

  if (normalizedUsage === "gara") {
    // User wants to race
    if (profile === "RACE") return 3; // Ideal for racing
    if (profile === "OTHER") return 2; // Unknown profile, could be ok
    if (profile === "ENDURANCE") return 1; // Not ideal for racing
  }

  if (normalizedUsage === "allenamento") {
    // User wants to train
    if (profile === "ENDURANCE") return 3; // Ideal for training
    if (profile === "RACE") return 2; // Can train on race bike
    if (profile === "OTHER") return 1; // Unknown
  }

  // Default tiers if usage doesn't match expected patterns
  if (profile === "RACE") return 2;
  if (profile === "ENDURANCE") return 2;
  return 1;
}

/**
 * Determine suitability tier for MTB bikes based on profile and user answers
 */
function getMTBSuitabilityTier(profile: MTBProfile, answers: Answers): number {
  const normalizedUsage = normalize(answers.usage);

  // XC / Gara / Allenamento usage
  if (normalizedUsage === "xc" || normalizedUsage === "gara" || normalizedUsage === "allenamento") {
    if (profile === "XC_RACE") return 3;
    if (profile === "TRAIL") return 2;
    if (profile === "ENDURO") return 1;
  }

  // Trail usage
  if (normalizedUsage === "trail") {
    if (profile === "TRAIL") return 3;
    if (profile === "XC_RACE") return 2;
    if (profile === "ENDURO") return 2;
  }

  // Enduro-aligned usages based on current questionnaire values
  if (
    normalizedUsage === "enduro" ||
    normalizedUsage === "weekend" ||
    normalizedUsage === "bikepacking"
  ) {
    if (profile === "ENDURO") return 3;
    if (profile === "TRAIL") return 2;
    if (profile === "XC_RACE") return 1;
  }

  // City usage: keep recommendation predictable and versatile
  if (normalizedUsage === "citta") {
    if (profile === "TRAIL") return 3;
    if (profile === "XC_RACE") return 2;
    if (profile === "ENDURO") return 1;
  }

  // Fallback: balanced tier assignment
  if (profile === "TRAIL") return 3;
  if (profile === "XC_RACE") return 2;
  if (profile === "ENDURO") return 2;
  return 1;
}

/**
 * Determine suitability tier for GRAVEL bikes based on profile and user answers
 */
function getGravelSuitabilityTier(profile: GravelProfile, answers: Answers): number {
  const normalizedUsage = normalize(answers.usage);

  // Race / performance / speed-oriented usage
  if (normalizedUsage === "gara" || normalizedUsage === "allenamento") {
    if (profile === "RACE_GRAVEL") return 3;
    if (profile === "ALL_ROAD_FAST") return 2;
    if (profile === "ADVENTURE_BIKEPACKING") return 1;
  }

  // Mixed / weekend / versatile usage
  if (normalizedUsage === "trail" || normalizedUsage === "weekend" || normalizedUsage === "citta") {
    if (profile === "ALL_ROAD_FAST") return 3;
    if (profile === "ADVENTURE_BIKEPACKING") return 2;
    if (profile === "RACE_GRAVEL") return 2;
  }

  // Adventure / long-distance / bikepacking usage
  if (normalizedUsage === "bikepacking") {
    if (profile === "ADVENTURE_BIKEPACKING") return 3;
    if (profile === "ALL_ROAD_FAST") return 2;
    if (profile === "RACE_GRAVEL") return 1;
  }

  // Fallback for unknown usage values
  if (profile === "ALL_ROAD_FAST") return 3;
  if (profile === "ADVENTURE_BIKEPACKING") return 2;
  if (profile === "RACE_GRAVEL") return 2;
  return 1;
}

/**
 * GRAVEL-only level suitability score (priority #3 in Gravel sorting)
 */
function getGravelLevelSuitabilityScore(price: number, budget: number, level: string): number {
  const normalizedLevel = normalize(level);
  const priceRatio = price / budget;

  if (normalizedLevel === "esperto") {
    if (priceRatio >= 0.8) return 3;
    if (priceRatio >= 0.65) return 2;
    return 1;
  }

  if (normalizedLevel === "principiante") {
    if (priceRatio >= 0.45 && priceRatio <= 0.75) return 3;
    if ((priceRatio > 0.75 && priceRatio <= 0.9) || (priceRatio >= 0.35 && priceRatio < 0.45)) {
      return 2;
    }
    return 1;
  }

  if (normalizedLevel === "intermedio") {
    if (priceRatio >= 0.6 && priceRatio <= 0.85) return 3;
    if ((priceRatio >= 0.45 && priceRatio < 0.6) || (priceRatio > 0.85 && priceRatio <= 1.0)) {
      return 2;
    }
    return 1;
  }

  return 1;
}

/**
 * GRAVEL-only price preference (priority #4 in Gravel sorting)
 */
function getGravelLevelPricePreference(price: number, budget: number, level: string): number {
  const normalizedLevel = normalize(level);

  if (normalizedLevel === "esperto") {
    return price;
  }

  if (normalizedLevel === "principiante") {
    const targetPrice = budget * 0.6;
    const distanceFromTarget = Math.abs(price - targetPrice);
    return -distanceFromTarget;
  }

  if (normalizedLevel === "intermedio") {
    const targetPrice = budget * 0.75;
    const distanceFromTarget = Math.abs(price - targetPrice);
    return -distanceFromTarget;
  }

  return price;
}

/**
 * MTB-only level suitability score (priority #3 in MTB sorting)
 */
function getMTBLevelSuitabilityScore(price: number, budget: number, level: string): number {
  const normalizedLevel = normalize(level);
  const priceRatio = price / budget;

  if (normalizedLevel === "esperto") {
    if (priceRatio >= 0.8) return 3;
    if (priceRatio >= 0.65) return 2;
    return 1;
  }

  if (normalizedLevel === "principiante") {
    if (priceRatio >= 0.45 && priceRatio <= 0.75) return 3;
    if ((priceRatio > 0.75 && priceRatio <= 0.9) || (priceRatio >= 0.35 && priceRatio < 0.45)) {
      return 2;
    }
    return 1;
  }

  if (normalizedLevel === "intermedio") {
    if (priceRatio >= 0.6 && priceRatio <= 0.85) return 3;
    if ((priceRatio >= 0.45 && priceRatio < 0.6) || (priceRatio > 0.85 && priceRatio <= 1.0)) {
      return 2;
    }
    return 1;
  }

  return 1;
}

/**
 * MTB-only price preference (priority #4 in MTB sorting)
 */
function getMTBLevelPricePreference(price: number, budget: number, level: string): number {
  const normalizedLevel = normalize(level);

  if (normalizedLevel === "esperto") {
    // Within same suitability, experts prefer higher-spec bikes closer to budget ceiling.
    return price;
  }

  if (normalizedLevel === "principiante") {
    // Within same suitability, beginners should not be pushed to the most expensive option.
    const targetPrice = budget * 0.6;
    const distanceFromTarget = Math.abs(price - targetPrice);
    return -distanceFromTarget;
  }

  if (normalizedLevel === "intermedio") {
    // Balanced pick around mid-high budget utilization.
    const targetPrice = budget * 0.75;
    const distanceFromTarget = Math.abs(price - targetPrice);
    return -distanceFromTarget;
  }

  return price;
}

function getEMTBRiderIntent(usage: string): EMTBRiderIntent {
  const normalizedUsage = normalize(usage);

  if (normalizedUsage === "bikepacking") {
    return "LONG_DISTANCE";
  }

  if (normalizedUsage === "allenamento") {
    return "STEEP_CLIMBS";
  }

  if (normalizedUsage === "trail") {
    return "TRAIL_BALANCED";
  }

  if (normalizedUsage === "gara") {
    return "DESCENT_FOCUSED";
  }

  return "AGILE_NATURAL";
}

function getEMTBProfilePreference(intent: EMTBRiderIntent, profile?: string): number {
  if (!profile) {
    return 0;
  }

  const normalizedProfile = profile.toUpperCase();

  if (intent === "LONG_DISTANCE") {
    if (normalizedProfile === "TRAIL") return 5;
    if (normalizedProfile === "XC_TRAIL") return 4;
    if (normalizedProfile === "ALL_MOUNTAIN") return 2;
    if (normalizedProfile === "ENDURO") return 0;
    return 0;
  }

  if (intent === "DESCENT_FOCUSED") {
    if (normalizedProfile === "ENDURO") return 4;
    if (normalizedProfile === "ALL_MOUNTAIN") return 3;
    if (normalizedProfile === "TRAIL") return 2;
    if (normalizedProfile === "XC_TRAIL") return 1;
    return 0;
  }

  if (intent === "TRAIL_BALANCED") {
    if (normalizedProfile === "TRAIL") return 4;
    if (normalizedProfile === "ALL_MOUNTAIN") return 3;
    if (normalizedProfile === "XC_TRAIL") return 2;
    if (normalizedProfile === "ENDURO") return 1;
    return 0;
  }

  if (intent === "AGILE_NATURAL") {
    if (normalizedProfile === "XC_TRAIL") return 4;
    if (normalizedProfile === "TRAIL") return 3;
    if (normalizedProfile === "ALL_MOUNTAIN") return 2;
    if (normalizedProfile === "ENDURO") return 1;
    return 0;
  }

  if (intent === "STEEP_CLIMBS") {
    if (normalizedProfile === "ALL_MOUNTAIN") return 4;
    if (normalizedProfile === "TRAIL") return 3;
    if (normalizedProfile === "ENDURO") return 2;
    if (normalizedProfile === "XC_TRAIL") return 1;
    return 0;
  }

  if (normalizedProfile === "XC_TRAIL") return 3;
  if (normalizedProfile === "TRAIL") return 3;
  if (normalizedProfile === "ALL_MOUNTAIN") return 2;
  if (normalizedProfile === "ENDURO") return 1;
  return 0;
}

function getEMTBPowerTypePreference(intent: EMTBRiderIntent, powerType?: string): number {
  if (!powerType) {
    return 0;
  }

  const normalizedPowerType = powerType.toUpperCase();

  if (intent === "LONG_DISTANCE") {
    if (normalizedPowerType === "FULL_POWER") return 2;
    if (normalizedPowerType === "LIGHT") return 1;
    return 0;
  }

  if (normalizedPowerType === "LIGHT") {
    if (intent === "AGILE_NATURAL") return 3;
    if (intent === "TRAIL_BALANCED") return 2;
    return 0;
  }

  if (normalizedPowerType === "FULL_POWER") {
    if (intent === "STEEP_CLIMBS") return 3;
    if (intent === "DESCENT_FOCUSED") return 2;
    if (intent === "TRAIL_BALANCED") return 2;
    return 0;
  }

  return 0;
}

function getKnownTravelMm(bike: ShopifyBike) {
  const knownTravelValues = [bike.travelFrontMm, bike.travelRearMm].filter(
    (value): value is number => value !== undefined,
  );

  if (knownTravelValues.length === 0) {
    return undefined;
  }

  return knownTravelValues.reduce((sum, value) => sum + value, 0) / knownTravelValues.length;
}

function getEMTBSuspensionPreference(intent: EMTBRiderIntent, travelMm?: number): number {
  if (travelMm === undefined) {
    return 0;
  }

  if (intent === "LONG_DISTANCE") {
    if (travelMm >= 120 && travelMm <= 150) return 2;
    if (travelMm > 150 && travelMm <= 160) return 1;
    return 0;
  }

  if (intent === "DESCENT_FOCUSED") {
    if (travelMm >= 170) return 4;
    if (travelMm >= 160) return 3;
    if (travelMm >= 140) return 2;
    if (travelMm >= 120) return 1;
    return 0;
  }

  if (intent === "TRAIL_BALANCED") {
    if (travelMm >= 140 && travelMm <= 155) return 4;
    if (travelMm >= 120 && travelMm < 140) return 3;
    if (travelMm >= 160 && travelMm < 170) return 2;
    if (travelMm >= 170) return 1;
    return 0;
  }

  if (intent === "AGILE_NATURAL") {
    if (travelMm >= 120 && travelMm <= 135) return 4;
    if (travelMm > 135 && travelMm <= 145) return 3;
    if (travelMm > 145 && travelMm <= 155) return 2;
    if (travelMm >= 160) return 1;
    return 0;
  }

  if (intent === "STEEP_CLIMBS") {
    if (travelMm >= 140 && travelMm <= 155) return 4;
    if (travelMm >= 160 && travelMm < 170) return 3;
    if (travelMm >= 120 && travelMm < 140) return 2;
    if (travelMm >= 170) return 1;
    return 0;
  }

  if (travelMm >= 120 && travelMm <= 150) return 2;
  if (travelMm > 150 && travelMm <= 170) return 1;
  return 0;
}

function getEMTBBatteryPreference(intent: EMTBRiderIntent, batteryWh?: number): number {
  if (batteryWh === undefined) {
    return 0;
  }

  if (intent === "LONG_DISTANCE") {
    if (batteryWh >= 800) return 5;
    if (batteryWh >= 700) return 4;
    if (batteryWh >= 600) return 3;
    if (batteryWh >= 500) return 2;
    return 0;
  }

  if (intent === "STEEP_CLIMBS") {
    if (batteryWh >= 750) return 3;
    if (batteryWh >= 650) return 2;
    if (batteryWh >= 500) return 1;
    return 0;
  }

  if (intent === "TRAIL_BALANCED") {
    if (batteryWh >= 650) return 2;
    if (batteryWh >= 500) return 1;
    return 0;
  }

  if (intent === "DESCENT_FOCUSED") {
    if (batteryWh >= 700) return 1;
    return 0;
  }

  if (batteryWh <= 450) return 2;
  if (batteryWh <= 600) return 1;
  return 0;
}

function getEMTBTorquePreference(intent: EMTBRiderIntent, torqueNm?: number): number {
  if (torqueNm === undefined) {
    return 0;
  }

  if (intent === "LONG_DISTANCE") {
    if (torqueNm >= 90) return 2;
    if (torqueNm >= 75) return 1;
    return 0;
  }

  if (intent === "STEEP_CLIMBS") {
    if (torqueNm >= 100) return 4;
    if (torqueNm >= 85) return 3;
    if (torqueNm >= 70) return 2;
    return 1;
  }

  if (intent === "TRAIL_BALANCED") {
    if (torqueNm >= 85) return 2;
    if (torqueNm >= 70) return 1;
    return 0;
  }

  if (intent === "DESCENT_FOCUSED") {
    if (torqueNm >= 85) return 1;
    return 0;
  }

  return 0;
}

function getEMBTLevelAdjustment(intent: EMTBRiderIntent, profile?: string, level?: string): number {
  if (!profile || !level) {
    return 0;
  }

  const normalizedLevel = normalize(level);
  const normalizedProfile = profile.toUpperCase();

  if (normalizedLevel === "principiante") {
    if (intent === "AGILE_NATURAL" || intent === "TRAIL_BALANCED") {
      if (normalizedProfile === "XC_TRAIL" || normalizedProfile === "TRAIL") {
        return 2;
      }
      if (normalizedProfile === "ALL_MOUNTAIN") {
        return 1;
      }
    }

    if (intent === "STEEP_CLIMBS" && (normalizedProfile === "TRAIL" || normalizedProfile === "ALL_MOUNTAIN")) {
      return 1;
    }

    return 0;
  }

  if (normalizedLevel === "intermedio") {
    if (normalizedProfile === "TRAIL" || normalizedProfile === "ALL_MOUNTAIN") {
      return 1;
    }
    return 0;
  }

  if (normalizedLevel === "esperto") {
    if (intent === "LONG_DISTANCE") {
      return 0;
    }

    if (intent === "DESCENT_FOCUSED" || intent === "STEEP_CLIMBS") {
      if (normalizedProfile === "ENDURO" || normalizedProfile === "ALL_MOUNTAIN") {
        return 2;
      }
      if (normalizedProfile === "TRAIL") {
        return 1;
      }
    }

    return normalizedProfile === "ENDURO" || normalizedProfile === "ALL_MOUNTAIN" ? 1 : 0;
  }

  return 0;
}

function getEMTBProfileReasonCode(intent: EMTBRiderIntent, profile?: string): string | undefined {
  if (!profile) {
    return undefined;
  }

  const normalizedProfile = profile.toUpperCase();

  if (intent === "LONG_DISTANCE") {
    if (normalizedProfile === "TRAIL" || normalizedProfile === "XC_TRAIL") return "LONG_DISTANCE_BALANCED_PROFILE";
    if (normalizedProfile === "ALL_MOUNTAIN") return "LONG_DISTANCE_STABLE_PLATFORM";
    if (normalizedProfile === "ENDURO") return "LONG_DISTANCE_AGGRESSIVE_PLATFORM";
  }

  if (intent === "DESCENT_FOCUSED") {
    if (normalizedProfile === "ENDURO") return "ENDURO_DESCENT";
    if (normalizedProfile === "ALL_MOUNTAIN") return "PROFILE_MATCH";
    if (normalizedProfile === "TRAIL") return "BALANCED_TRAIL";
    if (normalizedProfile === "XC_TRAIL") return "LIGHT_HANDLING";
  }

  if (intent === "TRAIL_BALANCED") {
    if (normalizedProfile === "TRAIL") return "BALANCED_TRAIL";
    if (normalizedProfile === "ALL_MOUNTAIN") return "PROFILE_MATCH";
    if (normalizedProfile === "XC_TRAIL") return "LIGHT_HANDLING";
    if (normalizedProfile === "ENDURO") return "ENDURO_DESCENT";
  }

  if (intent === "AGILE_NATURAL") {
    if (normalizedProfile === "XC_TRAIL") return "LIGHT_HANDLING";
    if (normalizedProfile === "TRAIL") return "BALANCED_TRAIL";
    if (normalizedProfile === "ALL_MOUNTAIN") return "PROFILE_MATCH";
    if (normalizedProfile === "ENDURO") return "ENDURO_DESCENT";
  }

  if (intent === "STEEP_CLIMBS") {
    if (normalizedProfile === "ALL_MOUNTAIN") return "PROFILE_MATCH";
    if (normalizedProfile === "TRAIL") return "BALANCED_TRAIL";
    if (normalizedProfile === "ENDURO") return "FULL_POWER_CLIMBING";
    if (normalizedProfile === "XC_TRAIL") return "LIGHT_HANDLING";
  }

  if (normalizedProfile === "XC_TRAIL" || normalizedProfile === "TRAIL") {
    return "BALANCED_TRAIL";
  }

  if (normalizedProfile === "ALL_MOUNTAIN") {
    return "PROFILE_MATCH";
  }

  if (normalizedProfile === "ENDURO") {
    return "ENDURO_DESCENT";
  }

  return undefined;
}

function getEMTBTechnicalReasonCodes(intent: EMTBRiderIntent, bike: ShopifyBike): string[] {
  const reasonCodes: string[] = [];

  if (bike.emtbProfile !== undefined) {
    const profileReason = getEMTBProfileReasonCode(intent, bike.emtbProfile);
    if (profileReason) {
      reasonCodes.push(profileReason);
    }
  }

  if (bike.emtbPowerType !== undefined) {
    if (intent === "LONG_DISTANCE" && bike.emtbPowerType === "FULL_POWER") {
      reasonCodes.push("LONG_DISTANCE_POWER_SUPPORT");
    }

    if (intent === "LONG_DISTANCE" && bike.emtbPowerType === "LIGHT") {
      reasonCodes.push("LONG_DISTANCE_EFFICIENT_POWERTRAIN");
    }

    if (bike.emtbPowerType === "LIGHT" && (intent === "AGILE_NATURAL" || intent === "TRAIL_BALANCED")) {
      reasonCodes.push("LIGHT_HANDLING");
    }

    if (bike.emtbPowerType === "FULL_POWER" && (intent === "STEEP_CLIMBS" || intent === "LONG_DISTANCE")) {
      reasonCodes.push("FULL_POWER_CLIMBING");
    }
  }

  if (bike.batteryWh !== undefined) {
    if (intent === "LONG_DISTANCE" && bike.batteryWh >= 750) {
      reasonCodes.push("LARGE_BATTERY");
    }

    if (intent === "STEEP_CLIMBS" && bike.batteryWh >= 650) {
      reasonCodes.push("LARGE_BATTERY");
    }
  }

  if (intent === "LONG_DISTANCE" && bike.weightKg !== undefined && bike.weightKg <= 23) {
    reasonCodes.push("LONG_DISTANCE_LIGHTWEIGHT");
  }

  const effectiveTravel = getKnownTravelMm(bike);
  if (effectiveTravel !== undefined) {
    if (intent === "DESCENT_FOCUSED" && effectiveTravel >= 170) {
      reasonCodes.push("LONG_TRAVEL");
    }

    if (intent === "TRAIL_BALANCED" && effectiveTravel >= 140 && effectiveTravel <= 155) {
      reasonCodes.push("BALANCED_TRAIL");
    }

    if (intent === "AGILE_NATURAL" && effectiveTravel >= 120 && effectiveTravel <= 135) {
      reasonCodes.push("LIGHT_HANDLING");
    }

    if (intent === "STEEP_CLIMBS" && effectiveTravel >= 140 && effectiveTravel <= 155) {
      reasonCodes.push("BALANCED_TRAIL");
    }
  }

  if (bike.torqueNm !== undefined) {
    if (intent === "STEEP_CLIMBS" && bike.torqueNm >= 85) {
      reasonCodes.push("HIGH_VERIFIED_TORQUE");
    }

    if (intent === "LONG_DISTANCE" && bike.torqueNm >= 75) {
      reasonCodes.push("HIGH_VERIFIED_TORQUE");
    }
  }

  return reasonCodes.slice(0, 3);
}

function getEMTBSuitabilityTierFromScore(technicalScore: number): EMTBSuitabilityTier {
  if (technicalScore >= 38) {
    return "PERFECT";
  }

  if (technicalScore >= 29) {
    return "EXCELLENT";
  }

  if (technicalScore >= 21) {
    return "GOOD";
  }

  if (technicalScore >= 13) {
    return "ACCEPTABLE";
  }

  return "POOR";
}

function getEMTBTierFromRank(rank: number): EMTBSuitabilityTier {
  if (rank >= 5) return "PERFECT";
  if (rank >= 4) return "EXCELLENT";
  if (rank >= 3) return "GOOD";
  if (rank >= 2) return "ACCEPTABLE";
  return "POOR";
}

function getEMTBLongDistanceTierCap(profile?: string, batteryWh?: number): EMTBSuitabilityTier {
  if (!profile) {
    return "EXCELLENT";
  }

  const normalizedProfile = profile.toUpperCase();

  if (normalizedProfile === "TRAIL") {
    return "PERFECT";
  }

  if (normalizedProfile === "XC_TRAIL") {
    if (batteryWh !== undefined && batteryWh < 500) {
      return "EXCELLENT";
    }
    return "PERFECT";
  }

  if (normalizedProfile === "ALL_MOUNTAIN") {
    return "EXCELLENT";
  }

  if (normalizedProfile === "ENDURO") {
    return "GOOD";
  }

  return "EXCELLENT";
}

function getCityPriorityPreference(cityPriority?: string): CityPriorityPreference {
  const normalizedPriority = normalize(cityPriority || "");

  if (normalizedPriority === "autonomia") return "AUTONOMY";
  if (normalizedPriority === "comfort") return "COMFORT";
  if (normalizedPriority === "bassamanutenzione") return "LOW_MAINTENANCE";
  if (
    normalizedPriority === "facilitanelsalireescenderedallabici" ||
    normalizedPriority === "facilitnelsalireescenderedallabici"
  ) {
    return "EASY_MOUNTING";
  }

  return "PRACTICAL_DAILY";
}

function getCityPriorityLabel(priority: CityPriorityPreference) {
  switch (priority) {
    case "AUTONOMY":
      return "autonomia";
    case "COMFORT":
      return "comfort";
    case "LOW_MAINTENANCE":
      return "bassa manutenzione";
    case "EASY_MOUNTING":
      return "facilità nel salire e scendere dalla bici";
    case "PRACTICAL_DAILY":
    default:
      return "praticità quotidiana";
  }
}

function getCityFamilyKey(title: string) {
  const normalizedTitle = normalize(title);

  if (normalizedTitle.includes("subcrosseride")) return "SCOTT_SUB_CROSS_ERIDE";
  if (normalizedTitle.includes("passage")) return "SCOTT_PASSAGE";
  if (normalizedTitle.includes("axis")) return "SCOTT_AXIS";
  if (normalizedTitle.includes("tesoroneox")) return "CANNONDALE_TESORO_NEO_X";
  if (normalizedTitle.includes("sub")) return "SCOTT_SUB";

  return normalizedTitle;
}

function getCityContextualFitScore(priority: CityPriorityPreference, category?: string) {
  if (!category) {
    return 0;
  }

  if (priority === "PRACTICAL_DAILY") {
    if (category === "E_URBAN") return 2;
    if (category === "E_TREKKING") return 1;
    return 0;
  }

  if (priority === "AUTONOMY") {
    if (category === "E_TREKKING") return 2;
    if (category === "E_URBAN") return 1;
    return 0;
  }

  if (priority === "COMFORT") {
    if (category === "E_TREKKING") return 1;
    if (category === "E_URBAN") return 0.5;
    return 0;
  }

  if (priority === "LOW_MAINTENANCE") {
    if (category === "E_URBAN") return 1;
    if (category === "E_TREKKING") return 0.5;
    return 0;
  }

  if (priority === "EASY_MOUNTING") {
    if (category === "E_URBAN") return 1;
    if (category === "E_TREKKING") return 0.5;
    return 0;
  }

  return 0;
}

function getCityUtilityCoverageCount(bike: ResolvedCityBike) {
  return [bike.lights, bike.rearRack, bike.fenders, bike.kickstand, bike.integratedLock].reduce<number>(
    (count, value) => count + (value === true ? 1 : 0),
    0,
  );
}

function getCityUtilitySetScore(count: number) {
  if (count >= 4) return 4;
  if (count === 3) return 3;
  if (count === 2) return 2;
  if (count === 1) return 1;
  return 0;
}

function getCityMotorSupportScore(bike: ResolvedCityBike) {
  let score = 0;

  if (bike.motorModel !== undefined) {
    score += 1;
  } else if (bike.motorBrand !== undefined) {
    score += 0.5;
  }

  if (bike.maximumTorqueNm !== undefined) {
    if (bike.maximumTorqueNm >= 85) return score + 1;
    if (bike.maximumTorqueNm >= 55) return score + 0.5;
  }

  return score;
}

function getCityComfortScore(bike: ResolvedCityBike) {
  let score = 0;

  if (bike.suspensionFork === true) {
    score += 2;
  }

  if (bike.forkTravelMm !== undefined) {
    if (bike.forkTravelMm >= 60) score += 2;
    else if (bike.forkTravelMm >= 40) score += 1;
  }

  if (bike.weightKg !== undefined) {
    if (bike.weightKg <= 22) score += 1;
    else if (bike.weightKg <= 26) score += 0.5;
  }

  if (bike.display !== undefined) {
    score += 0.25;
  }

  return score;
}

function getCityBudgetGuidanceScore(price: number, budget: number) {
  const priceRatio = price / budget;

  if (priceRatio >= 0.55 && priceRatio <= 1.0) return 2;
  if (priceRatio < 0.55) return 1;
  if (priceRatio <= 1.15) return 0.5;
  return 0;
}

function getCityLevelAdjustment(level: string, price: number, budget: number) {
  const normalizedLevel = normalize(level);
  const priceRatio = price / budget;

  if (normalizedLevel === "principiante") {
    return priceRatio <= 0.75 ? 0.5 : 0;
  }

  if (normalizedLevel === "intermedio") {
    return priceRatio >= 0.55 && priceRatio <= 0.9 ? 0.25 : 0;
  }

  if (normalizedLevel === "esperto") {
    return priceRatio >= 0.65 && priceRatio <= 1.0 ? 0.5 : 0;
  }

  return 0;
}

function getCityTierFromScore(score: number): CitySuitabilityTier {
  if (score >= 8) return "PERFECT";
  if (score >= 6.5) return "EXCELLENT";
  if (score >= 5) return "GOOD";
  if (score >= 3.5) return "ACCEPTABLE";
  return "POOR";
}

function getCityTierRank(tier: CitySuitabilityTier) {
  return getEMTBSuitabilityTierRank(tier);
}

function getVerifiedUtilityLabels(bike: ResolvedCityBike) {
  const labels: string[] = [];

  if (bike.lights === true) labels.push("luci");
  if (bike.rearRack === true) labels.push("portapacchi");
  if (bike.fenders === true) labels.push("parafanghi");
  if (bike.kickstand === true) labels.push("cavalletto");
  if (bike.integratedLock === true) labels.push("blocco integrato");

  return labels;
}

function getVerifiedFrameLabel(frameType?: CityFrameType) {
  if (frameType === "WAVE") return "telaio WAVE verificato";
  if (frameType === "SLOPE") return "telaio SLOPE verificato";
  if (frameType === "LOW_STEP") return "telaio LOW STEP verificato";
  if (frameType === "STEP_OVER") return "telaio STEP OVER verificato";
  return undefined;
}

function buildCityMatchReasons(
  bike: ResolvedCityBike,
  priority: CityPriorityPreference,
  budgetContribution: number,
): string[] {
  const reasons: string[] = [];
  const utilityLabels = getVerifiedUtilityLabels(bike);

  const pushReason = (reason?: string) => {
    if (!reason || reasons.includes(reason) || reasons.length >= 4) {
      return;
    }
    reasons.push(reason);
  };

  if (priority === "PRACTICAL_DAILY") {
    if (utilityLabels.length > 0) {
      pushReason(`Dotazione utility verificata: ${utilityLabels.slice(0, 3).join(", ")}${utilityLabels.length > 3 ? " e altro" : ""}`);
    }
    if (bike.electricBikeCategory === "E_URBAN") {
      pushReason("Impostazione urbana coerente con l'uso in città");
    }
    if (bike.display !== undefined) {
      pushReason(`Display verificato: ${bike.display}`);
    }
  }

  if (priority === "AUTONOMY") {
    if (bike.batteryWh !== undefined) {
      pushReason(`Batteria verificata da ${bike.batteryWh} Wh`);
    }
    if (bike.rangeExtenderCompatible === true) {
      pushReason("Compatibile con range extender verificato");
    }
    if (bike.motorModel !== undefined) {
      pushReason(`Motore verificato: ${bike.motorModel}`);
    } else if (bike.motorBrand !== undefined) {
      pushReason(`Motore verificato: ${bike.motorBrand}`);
    }
  }

  if (priority === "COMFORT") {
    if (bike.suspensionFork === true) {
      pushReason(
        bike.forkTravelMm !== undefined
          ? `Forcella ammortizzata verificata da ${bike.forkTravelMm} mm`
          : "Forcella ammortizzata verificata"
      );
    }
    if (bike.weightKg !== undefined) {
      pushReason(`Peso verificato: ${bike.weightKg} kg`);
    }
    if (bike.display !== undefined) {
      pushReason(`Display verificato: ${bike.display}`);
    }
  }

  if (priority === "LOW_MAINTENANCE") {
    if (bike.driveType === "BELT") {
      pushReason("Trasmissione a cinghia verificata");
    }
    if (utilityLabels.length > 0) {
      pushReason(`Dotazione quotidiana verificata: ${utilityLabels.slice(0, 2).join(", ")}`);
    }
  }

  if (priority === "EASY_MOUNTING") {
    pushReason(getVerifiedFrameLabel(bike.frameType));
    if (bike.weightKg !== undefined) {
      pushReason(`Peso verificato: ${bike.weightKg} kg`);
    }
    if (bike.electricBikeCategory === "E_URBAN") {
      pushReason("Impostazione urbana coerente con gli spostamenti in città");
    }
  }

  if (budgetContribution > 0) {
    pushReason("Budget coerente con la tua fascia di spesa");
  }

  if (bike.availability === "in_stock") {
    pushReason("Disponibile subito");
  }

  if (reasons.length < 2) {
    if (bike.electricBikeCategory === "E_TREKKING") {
      pushReason("Impostazione trekking coerente con l'uso quotidiano misto");
    } else if (bike.electricBikeCategory === "E_URBAN") {
      pushReason("Impostazione urbana coerente con l'uso quotidiano");
    }
  }

  return reasons.slice(0, 4);
}

function getCityRankingDetails(bike: ShopifyBike, answers: Answers): CityRankingDetails {
  const cityPriority = getCityPriorityPreference(answers.cityPriority);
  const cityTechnicalSpecs = getCityTechnicalSpecs(bike.title, bike.productHandle);
  const resolvedBike: ResolvedCityBike = {
    ...bike,
    ...cityTechnicalSpecs,
  };
  const utilityCoverageCount = getCityUtilityCoverageCount(resolvedBike);
  const utilitySetScore = getCityUtilitySetScore(utilityCoverageCount);
  const contextualContribution = getCityContextualFitScore(cityPriority, resolvedBike.electricBikeCategory);
  const budgetContribution = getCityBudgetGuidanceScore(resolvedBike.price, answers.budget);
  const levelAdjustment = getCityLevelAdjustment(answers.level, resolvedBike.price, answers.budget);

  let primaryContribution = 0;

  if (cityPriority === "PRACTICAL_DAILY") {
    primaryContribution = utilitySetScore + (resolvedBike.display !== undefined ? 0.5 : 0);
  }

  if (cityPriority === "AUTONOMY") {
    if (resolvedBike.batteryWh !== undefined) {
      if (resolvedBike.batteryWh >= 700) primaryContribution += 4;
      else if (resolvedBike.batteryWh >= 600) primaryContribution += 3;
      else if (resolvedBike.batteryWh >= 500) primaryContribution += 2;
      else if (resolvedBike.batteryWh >= 400) primaryContribution += 1;
    }

    if (resolvedBike.rangeExtenderCompatible === true) {
      primaryContribution += 1;
    }

    primaryContribution += getCityMotorSupportScore(resolvedBike);
  }

  if (cityPriority === "COMFORT") {
    primaryContribution = getCityComfortScore(resolvedBike);
  }

  if (cityPriority === "LOW_MAINTENANCE") {
    primaryContribution = (resolvedBike.driveType === "BELT" ? 4 : 0) + Math.min(utilitySetScore * 0.5, 1);
  }

  if (cityPriority === "EASY_MOUNTING") {
    primaryContribution =
      ((resolvedBike.frameType === "WAVE" || resolvedBike.frameType === "SLOPE") ? 4 : 0) +
      (resolvedBike.weightKg !== undefined
        ? resolvedBike.weightKg <= 22
          ? 1
          : resolvedBike.weightKg <= 26
            ? 0.5
            : 0
        : 0);
  }

  const technicalScore = primaryContribution + contextualContribution + budgetContribution + levelAdjustment;

  return {
    cityPriority,
    suitabilityTier: getCityTierFromScore(technicalScore),
    technicalScore,
    primaryContribution,
    contextualContribution,
    budgetContribution,
    levelAdjustment,
    utilityCoverageCount,
    familyKey: getCityFamilyKey(resolvedBike.title),
    matchReasons: buildCityMatchReasons(resolvedBike, cityPriority, budgetContribution),
  };
}

function getEMTBRankingDetails(bike: ShopifyBike, answers: Answers): EMTBRankingDetails {
  const riderIntent = getEMTBRiderIntent(answers.usage);
  const profileScore = getEMTBProfilePreference(riderIntent, bike.emtbProfile);
  const powerScore = getEMTBPowerTypePreference(riderIntent, bike.emtbPowerType);
  const travelScore = getEMTBSuspensionPreference(riderIntent, getKnownTravelMm(bike));
  const batteryScore = getEMTBBatteryPreference(riderIntent, bike.batteryWh);
  const torqueScore = getEMTBTorquePreference(riderIntent, bike.torqueNm);
  const weightScore = riderIntent === "LONG_DISTANCE" && bike.weightKg !== undefined
    ? bike.weightKg <= 20
      ? 4
      : bike.weightKg <= 22.5
        ? 3
        : bike.weightKg <= 25
          ? 2
          : bike.weightKg <= 27.5
            ? 1
            : 0
    : 0;
  const levelAdjustment = getEMBTLevelAdjustment(riderIntent, bike.emtbProfile, answers.level);
  const profileContribution = riderIntent === "LONG_DISTANCE" ? profileScore * 5 : profileScore * 4;
  const powerContribution = riderIntent === "LONG_DISTANCE" ? powerScore * 2 : powerScore * 3;
  const travelContribution = riderIntent === "LONG_DISTANCE" ? travelScore * 1 : travelScore * 3;
  const batteryContribution = riderIntent === "LONG_DISTANCE" ? batteryScore * 3 : batteryScore * 3;
  const torqueContribution = riderIntent === "LONG_DISTANCE" ? torqueScore * 1 : torqueScore * 2;
  const weightContribution = riderIntent === "LONG_DISTANCE" ? weightScore * 2 : 0;

  const technicalScore =
    profileContribution +
    powerContribution +
    travelContribution +
    batteryContribution +
    torqueContribution +
    weightContribution +
    levelAdjustment;

  const scoreBeforeTierCap = technicalScore;
  const uncappedSuitabilityTier = getEMTBSuitabilityTierFromScore(scoreBeforeTierCap);
  const profileTierCap =
    riderIntent === "LONG_DISTANCE"
      ? getEMTBLongDistanceTierCap(bike.emtbProfile, bike.batteryWh)
      : "PERFECT";

  const suitabilityTier =
    riderIntent === "LONG_DISTANCE"
      ? getEMTBTierFromRank(
          Math.min(
            getEMTBSuitabilityTierRank(uncappedSuitabilityTier),
            getEMTBSuitabilityTierRank(profileTierCap),
          ),
        )
      : uncappedSuitabilityTier;

  const brandAdjustment = 0;
  const finalRankingValue = technicalScore + brandAdjustment;
  const reasonCodes = getEMTBTechnicalReasonCodes(riderIntent, bike);
  const technicalFacts: Record<string, string | number> = {};

  if (bike.motorBrand !== undefined) technicalFacts.motorBrand = bike.motorBrand;
  if (bike.motorModel !== undefined) technicalFacts.motorModel = bike.motorModel;
  if (bike.torqueNm !== undefined) technicalFacts.torqueNm = bike.torqueNm;
  if (bike.boostTorqueNm !== undefined) technicalFacts.boostTorqueNm = bike.boostTorqueNm;
  if (bike.batteryWh !== undefined) technicalFacts.batteryWh = bike.batteryWh;
  if (bike.travelFrontMm !== undefined) technicalFacts.travelFrontMm = bike.travelFrontMm;
  if (bike.travelRearMm !== undefined) technicalFacts.travelRearMm = bike.travelRearMm;
  if (bike.weightKg !== undefined) technicalFacts.weightKg = bike.weightKg;
  if (bike.emtbPowerType !== undefined) technicalFacts.emtbPowerType = bike.emtbPowerType;
  if (bike.emtbProfile !== undefined) technicalFacts.emtbProfile = bike.emtbProfile;

  return {
    riderIntent,
    suitabilityTier,
    uncappedSuitabilityTier,
    profileTierCap,
    technicalScore,
    scoreBeforeTierCap,
    profileContribution,
    batteryContribution,
    powerContribution,
    levelAdjustment,
    brandAdjustment,
    finalRankingValue,
    reasonCodes,
    technicalFacts,
  };
}

function getEMTBSuitabilityTierRank(tier: EMTBSuitabilityTier): number {
  switch (tier) {
    case "PERFECT":
      return 5;
    case "EXCELLENT":
      return 4;
    case "GOOD":
      return 3;
    case "ACCEPTABLE":
      return 2;
    case "POOR":
    default:
      return 1;
  }
}

/**
 * Calculate level-based price preference within the same tier
 * Returns a price multiplier/preference score
 */
function getLevelPricePreference(
  price: number,
  budget: number,
  level: string,
): number {
  const normalizedLevel = normalize(level);
  const distanceFromBudget = budget - price;
  const priceRatio = price / budget;

  // Esperto: prioritize higher-spec / higher-priced bikes
  if (normalizedLevel === "esperto") {
    // Higher price within budget = higher preference (within same tier)
    return price;
  }

  // Principiante: prefer more accessible price range
  if (normalizedLevel === "principiante") {
    // Target around 60% of budget for accessibility
    // Bikes closer to 60% of budget get higher score
    const targetPrice = budget * 0.6;
    const distanceFromTarget = Math.abs(price - targetPrice);
    // Return negative distance so closer to target scores higher
    return -distanceFromTarget;
  }

  // Intermedio: balance between price and suitability
  if (normalizedLevel === "intermedio") {
    // Target around 75% of budget for balance
    const targetPrice = budget * 0.75;
    const distanceFromTarget = Math.abs(price - targetPrice);
    return -distanceFromTarget;
  }

  // Default: use price as preference
  return price;
}

type PresentationPolicyReason =
  | "ORIGINAL_WINNER"
  | "AVAILABILITY_NEAR_EQUIVALENT"
  | "BRAND_DIVERSITY_NEAR_EQUIVALENT"
  | "ORIGINAL_RANK_PRESERVED";

interface RankedBikeCandidate {
  bike: ShopifyBike;
  profile: string;
  tier: number;
  isAboveBudget: boolean;
  emtbTechnicalScore: number;
  emtbSuitabilityTier?: EMTBSuitabilityTier;
  cityTechnicalScore?: number;
  citySuitabilityTier?: CitySuitabilityTier;
  cityFamilyKey?: string;
  matchReasons?: string[];
}

type CityPresentationPolicyReason =
  | "CITY_ORIGINAL_WINNER"
  | "CITY_DIVERSE_NEAR_EQUIVALENT"
  | "CITY_ORIGINAL_RANK_PRESERVED";

function applyCityPresentationPolicy(
  rankedCandidates: RankedBikeCandidate[],
  isBudgetFallback: boolean,
): RankedBikeCandidate[] {
  if (isBudgetFallback || rankedCandidates.length <= 1) {
    return rankedCandidates;
  }

  const visibleEligibleCandidates = rankedCandidates.filter(
    (candidate) => candidate.bike.availability === "in_stock",
  );

  if (visibleEligibleCandidates.length === 0) {
    return rankedCandidates;
  }

  const selected: RankedBikeCandidate[] = [visibleEligibleCandidates[0]];
  const selectedIds = new Set(selected.map((candidate) => candidate.bike.id));
  const reasons = new Map<string, CityPresentationPolicyReason>([
    [selected[0].bike.id, "CITY_ORIGINAL_WINNER"],
  ]);

  while (selected.length < 3 && selected.length < visibleEligibleCandidates.length) {
    const remaining = visibleEligibleCandidates.filter((candidate) => !selectedIds.has(candidate.bike.id));

    if (remaining.length === 0) {
      break;
    }

    const defaultCandidate = remaining[0];
    let chosenCandidate = defaultCandidate;
    let chosenReason: CityPresentationPolicyReason = "CITY_ORIGINAL_RANK_PRESERVED";
    const selectedFamilies = new Set(selected.map((candidate) => candidate.cityFamilyKey));

    if (defaultCandidate.cityFamilyKey && selectedFamilies.has(defaultCandidate.cityFamilyKey)) {
      const alternative = remaining.slice(1).find((candidate) => {
        if (!candidate.cityFamilyKey || selectedFamilies.has(candidate.cityFamilyKey)) {
          return false;
        }

        const tierGap = defaultCandidate.tier - candidate.tier;
        const scoreGap = (defaultCandidate.cityTechnicalScore ?? 0) - (candidate.cityTechnicalScore ?? 0);
        return (candidate.tier === defaultCandidate.tier || tierGap <= 1) && scoreGap <= 1.5;
      });

      if (alternative) {
        chosenCandidate = alternative;
        chosenReason = "CITY_DIVERSE_NEAR_EQUIVALENT";
      }
    }

    selected.push(chosenCandidate);
    selectedIds.add(chosenCandidate.bike.id);
    reasons.set(chosenCandidate.bike.id, chosenReason);
  }

  const remainingInOriginalRankOrder = rankedCandidates.filter(
    (candidate) => !selectedIds.has(candidate.bike.id),
  );
  const reorderedCandidates = [...selected, ...remainingInOriginalRankOrder];

  console.log("[CITY PRESENTATION POLICY OUTPUT]");
  reorderedCandidates.slice(0, 3).forEach((candidate, index) => {
    console.log(
      `  [${index + 1}] visiblePosition: ${index + 1} | title: ${candidate.bike.title} | family: ${candidate.cityFamilyKey ?? "UNKNOWN"} | availability: ${candidate.bike.availability} | suitabilityTier: ${candidate.citySuitabilityTier ?? "POOR"} | technicalScore: ${candidate.cityTechnicalScore ?? 0} | reason: ${reasons.get(candidate.bike.id) ?? "CITY_ORIGINAL_RANK_PRESERVED"}`,
    );
  });

  return reorderedCandidates;
}

function applyResultPresentationPolicy(
  rankedCandidates: RankedBikeCandidate[],
  answers: Answers,
  isEMTB: boolean,
  isBudgetFallback: boolean,
): RankedBikeCandidate[] {
  if (!isEMTB || isBudgetFallback || rankedCandidates.length <= 1) {
    return rankedCandidates;
  }

  const normalizedBrandPreference = normalize(answers.brand || "");
  const shouldDiversifyBrands = normalizedBrandPreference === "nessuna";
  const AVAILABILITY_SCORE_GAP_VERY_SMALL = 1;
  const DIVERSITY_SCORE_GAP_SMALL = 2;
  const visibleEligibleCandidates = rankedCandidates.filter(
    (candidate) => candidate.bike.availability === "in_stock",
  );

  if (visibleEligibleCandidates.length === 0) {
    return rankedCandidates;
  }

  const originalRankById = new Map<string, number>();
  rankedCandidates.forEach((candidate, index) => {
    originalRankById.set(candidate.bike.id, index + 1);
  });

  console.log("[PRESENTATION POLICY INPUT]");
  rankedCandidates.forEach((candidate, index) => {
    console.log(
      `  [${index + 1}] originalRank: ${index + 1} | title: ${candidate.bike.title} | brand: ${candidate.bike.brand} | availability: ${candidate.bike.availability} | suitabilityTier: ${candidate.emtbSuitabilityTier ?? "POOR"} | technicalScore: ${candidate.emtbTechnicalScore}`,
    );
  });

  const selected: RankedBikeCandidate[] = [];
  const reasonById = new Map<string, PresentationPolicyReason>();

  // Preserve technical winner by default. Replace only if unavailable and a near-equivalent available option exists.
  const winner = visibleEligibleCandidates[0];
  let selectedWinner = winner;

  if (winner.bike.availability !== "in_stock") {
    const winnerReplacementCandidates = rankedCandidates
      .slice(1)
      .filter((candidate) => candidate.bike.availability === "in_stock")
      .map((candidate) => {
        const tierGap = winner.tier - candidate.tier;
        const scoreGap = winner.emtbTechnicalScore - candidate.emtbTechnicalScore;
        const isNearEquivalent =
          candidate.tier === winner.tier ||
          (tierGap <= 1 && scoreGap <= AVAILABILITY_SCORE_GAP_VERY_SMALL);

        return {
          candidate,
          tierGap,
          scoreGap,
          isNearEquivalent,
          originalRank: originalRankById.get(candidate.bike.id) ?? Number.MAX_SAFE_INTEGER,
        };
      })
      .filter((entry) => entry.isNearEquivalent)
      .sort((a, b) => {
        if (a.tierGap !== b.tierGap) return a.tierGap - b.tierGap;
        if (a.scoreGap !== b.scoreGap) return a.scoreGap - b.scoreGap;
        return a.originalRank - b.originalRank;
      });

    if (winnerReplacementCandidates.length > 0) {
      selectedWinner = winnerReplacementCandidates[0].candidate;
      reasonById.set(selectedWinner.bike.id, "AVAILABILITY_NEAR_EQUIVALENT");
    }
  }

  if (!reasonById.has(selectedWinner.bike.id)) {
    reasonById.set(selectedWinner.bike.id, "ORIGINAL_WINNER");
  }
  selected.push(selectedWinner);

  while (selected.length < 3 && selected.length < visibleEligibleCandidates.length) {
    const visibleIndex = selected.length;
    const remaining = visibleEligibleCandidates.filter(
      (candidate) => !selected.some((picked) => picked.bike.id === candidate.bike.id),
    );

    if (remaining.length === 0) {
      break;
    }

    const defaultCandidate = remaining[0];
    let chosenCandidate = defaultCandidate;
    let chosenReason: PresentationPolicyReason = "ORIGINAL_RANK_PRESERVED";

    // Availability preference among near-equivalent alternatives.
    if (defaultCandidate.bike.availability !== "in_stock") {
      const availabilityAlternatives = remaining
        .slice(1)
        .filter((candidate) => candidate.bike.availability === "in_stock")
        .map((candidate) => {
          const tierGap = defaultCandidate.tier - candidate.tier;
          const scoreGap = defaultCandidate.emtbTechnicalScore - candidate.emtbTechnicalScore;
          const isNearEquivalent =
            candidate.tier === defaultCandidate.tier ||
            (tierGap <= 1 && scoreGap <= AVAILABILITY_SCORE_GAP_VERY_SMALL);

          return {
            candidate,
            tierGap,
            scoreGap,
            isNearEquivalent,
            originalRank: originalRankById.get(candidate.bike.id) ?? Number.MAX_SAFE_INTEGER,
          };
        })
        .filter((entry) => entry.isNearEquivalent)
        .sort((a, b) => {
          if (a.tierGap !== b.tierGap) return a.tierGap - b.tierGap;
          if (a.scoreGap !== b.scoreGap) return a.scoreGap - b.scoreGap;
          return a.originalRank - b.originalRank;
        });

      if (availabilityAlternatives.length > 0) {
        chosenCandidate = availabilityAlternatives[0].candidate;
        chosenReason = "AVAILABILITY_NEAR_EQUIVALENT";
      }
    }

    // Brand diversification only for explicit "Nessuna" preference.
    if (shouldDiversifyBrands) {
      const usedBrands = new Set(
        selected.map((candidate) => normalize(candidate.bike.brand || "")),
      );
      const chosenBrand = normalize(chosenCandidate.bike.brand || "");

      if (usedBrands.has(chosenBrand)) {
        const diversityAlternatives = remaining
          .filter((candidate) => !usedBrands.has(normalize(candidate.bike.brand || "")))
          .filter((candidate) => {
            if (chosenCandidate.bike.availability === "in_stock") {
              return candidate.bike.availability === "in_stock";
            }
            return true;
          })
          .map((candidate) => {
            const tierGap = chosenCandidate.tier - candidate.tier;
            const scoreGap = chosenCandidate.emtbTechnicalScore - candidate.emtbTechnicalScore;
            const isSameTier = candidate.tier === chosenCandidate.tier;
            const isExactlyOneTierLower = tierGap === 1;
            const isOneTierLowerAndClose =
              isExactlyOneTierLower && scoreGap <= DIVERSITY_SCORE_GAP_SMALL;
            const isMoreThanOneTierLower = tierGap > 1;

            return {
              candidate,
              tierGap,
              scoreGap,
              isCredible: !isMoreThanOneTierLower && (isSameTier || isOneTierLowerAndClose),
              originalRank: originalRankById.get(candidate.bike.id) ?? Number.MAX_SAFE_INTEGER,
            };
          })
          .filter((entry) => entry.isCredible)
          .sort((a, b) => {
            if (a.tierGap !== b.tierGap) return a.tierGap - b.tierGap;
            if (a.scoreGap !== b.scoreGap) return a.scoreGap - b.scoreGap;

            if (chosenCandidate.bike.availability !== "in_stock") {
              const aAvailable = a.candidate.bike.availability === "in_stock" ? 1 : 0;
              const bAvailable = b.candidate.bike.availability === "in_stock" ? 1 : 0;
              if (aAvailable !== bAvailable) return bAvailable - aAvailable;
            }

            return a.originalRank - b.originalRank;
          });

        if (diversityAlternatives.length > 0) {
          chosenCandidate = diversityAlternatives[0].candidate;
          chosenReason = "BRAND_DIVERSITY_NEAR_EQUIVALENT";
        }
      }
    }

    selected.push(chosenCandidate);
    reasonById.set(chosenCandidate.bike.id, chosenReason);
  }

  const selectedIds = new Set(selected.map((candidate) => candidate.bike.id));
  const remainingInOriginalRankOrder = rankedCandidates.filter(
    (candidate) => !selectedIds.has(candidate.bike.id),
  );

  const reorderedCandidates = [...selected, ...remainingInOriginalRankOrder];

  console.log("[PRESENTATION POLICY OUTPUT]");
  reorderedCandidates.slice(0, 3).forEach((candidate, index) => {
    const originalRank = originalRankById.get(candidate.bike.id) ?? -1;
    console.log(
      `  [${index + 1}] visiblePosition: ${index + 1} | originalRank: ${originalRank} | title: ${candidate.bike.title} | brand: ${candidate.bike.brand} | availability: ${candidate.bike.availability} | suitabilityTier: ${candidate.emtbSuitabilityTier ?? "POOR"} | technicalScore: ${candidate.emtbTechnicalScore} | reason: ${reasonById.get(candidate.bike.id) ?? "ORIGINAL_RANK_PRESERVED"}`,
    );
  });

  return reorderedCandidates;
}

export function bikeMatcher(answers: Answers, bikes: ShopifyBike[]): MatchedBikeResult[] {
  // DEBUG 1: Log exact answers received
  console.log("[ACTUAL ANSWERS]", answers);

  // DEBUG 2: Log total bikes received
  console.log("[BIKES RECEIVED]", bikes.length);

  const preferredBrand = answers.brand ? normalize(answers.brand) : "";
  const hasPreferredBrand = Boolean(preferredBrand && preferredBrand !== "nessuna");
  console.log("[PREFERRED BRAND]", { preferredBrand, hasPreferredBrand });

  const isRoadBike = normalize(answers.category) === "corsa";
  const isMTB = normalize(answers.category) === "mtb";
  const isEMTB = normalize(answers.category) === "emtb";
  const isGravel = normalize(answers.category) === "gravel";
  const normalizedUsage = normalize(answers.usage);
  const isCityUsage = normalizedUsage === "citta" || normalizedUsage === "citt";
  const isCityFlow = isEMTB && isCityUsage;

  // STEP 1: Filter by category
  const categoryMatches = bikes.filter((bike) => {
    if (normalize(bike.category) !== normalize(answers.category)) {
      return false;
    }

    if (isEMTB) {
      if (isCityUsage) {
        return bike.electricBikeCategory === "E_URBAN" || bike.electricBikeCategory === "E_TREKKING";
      }

      if (bike.electricBikeCategory !== undefined && bike.electricBikeCategory !== "E_MTB") {
        return false;
      }
    }

    return true;
  });

  // STEP 2: Normal filter by budget
  const withinBudgetMatches = categoryMatches.filter((bike) => {

    if (bike.price > answers.budget) {
      return false;
    }

    return true;
  });

  // STEP 3: Fallback only if nothing is available within budget
  const isBudgetFallback = withinBudgetMatches.length === 0 && categoryMatches.length > 0;
  const fallbackUpTo30 = categoryMatches.filter((bike) => bike.price <= answers.budget * 1.3);
  const fallbackUpTo50 = categoryMatches.filter((bike) => bike.price <= answers.budget * 1.5);

  let fallbackRangeLabel = "none";
  let fallbackCandidates = categoryMatches;

  if (fallbackUpTo30.length >= 3) {
    fallbackRangeLabel = "30%";
    fallbackCandidates = fallbackUpTo30;
  } else if (fallbackUpTo50.length >= 3) {
    fallbackRangeLabel = "50%";
    fallbackCandidates = fallbackUpTo50;
  } else {
    fallbackRangeLabel = "cheapest_3";
    fallbackCandidates = [...categoryMatches].sort((a, b) => a.price - b.price).slice(0, 3);
  }

  const matches = isBudgetFallback ? fallbackCandidates : withinBudgetMatches;
  const deduplicationResult = deduplicateBikesByVisibleModel(matches);
  const deduplicatedMatches = deduplicationResult.bikes;

  console.log("[DEDUPLICATED BIKES]");
  deduplicationResult.removedDiagnostics.forEach((row) => {
    console.log(
      `  - ${row.title} | kept: ${row.kept.id} / ${row.kept.productHandle || "n/a"} | removed: ${row.removed.id} / ${row.removed.productHandle || "n/a"} | reason: ${row.reason}`,
    );
  });
  console.log(
    `[DEDUPLICATED BIKES SUMMARY] before: ${matches.length} | after: ${deduplicatedMatches.length} | duplicate titles removed: ${deduplicationResult.duplicateTitlesRemoved.length}`,
  );

  // DEBUG 3: Log all bikes after category and budget filtering
  console.log("[FILTERED BIKES - CATEGORY & BUDGET]", deduplicatedMatches.length);
  if (isBudgetFallback) {
    console.log("[BUDGET FALLBACK ACTIVE]", {
      category: answers.category,
      budget: answers.budget,
      candidates: deduplicatedMatches.length,
      range: fallbackRangeLabel,
      candidatesUpTo30: fallbackUpTo30.length,
      candidatesUpTo50: fallbackUpTo50.length,
    });
  }

  // STEP 2-3: Classify bikes and determine suitability tier
  const bikeRanks = deduplicatedMatches.map((bike) => {
    let profile: string;
    let tier: number;
    let mtbLevelSuitabilityScore = 0;
    let mtbLevelPriceScore = 0;
    let gravelLevelSuitabilityScore = 0;
    let gravelLevelPriceScore = 0;
    let emtbDetails: EMTBRankingDetails | undefined;
    let cityDetails: CityRankingDetails | undefined;
    const overBudgetBy = Math.max(0, bike.price - answers.budget);
    const isAboveBudget = bike.price > answers.budget;

    if (isRoadBike) {
      const roadProfile = getRoadBikeProfile(bike.title);
      profile = roadProfile;
      tier = getRoadSuitabilityTier(roadProfile, answers);
    } else if (isMTB) {
      const mtbProfile = getMTBProfile(bike.title, bike.productHandle || "");
      profile = mtbProfile;
      tier = getMTBSuitabilityTier(mtbProfile, answers);
      mtbLevelSuitabilityScore = getMTBLevelSuitabilityScore(bike.price, answers.budget, answers.level);
      mtbLevelPriceScore = getMTBLevelPricePreference(bike.price, answers.budget, answers.level);
    } else if (isGravel) {
      const gravelProfile = getGravelProfile(bike.title, bike.productHandle || "");
      profile = gravelProfile;
      tier = getGravelSuitabilityTier(gravelProfile, answers);
      gravelLevelSuitabilityScore = getGravelLevelSuitabilityScore(bike.price, answers.budget, answers.level);
      gravelLevelPriceScore = getGravelLevelPricePreference(bike.price, answers.budget, answers.level);
    } else if (isCityFlow) {
      cityDetails = getCityRankingDetails(bike, answers);
      profile = bike.electricBikeCategory || "UNKNOWN";
      tier = getCityTierRank(cityDetails.suitabilityTier);
    } else if (isEMTB) {
      emtbDetails = getEMTBRankingDetails(bike, answers);
      profile = bike.emtbProfile || "UNKNOWN";
      tier = getEMTBSuitabilityTierRank(emtbDetails.suitabilityTier);
    } else {
      profile = "UNKNOWN";
      tier = 1;
    }

    const isBrandMatch = hasPreferredBrand && normalize(bike.brand || "") === preferredBrand;
    const emtbTechnicalScore = emtbDetails?.technicalScore ?? 0;
    const emtbSuitabilityTier = emtbDetails?.suitabilityTier;
    const emtbRiderIntent = emtbDetails?.riderIntent;
    const emtbReasonCodes = emtbDetails?.reasonCodes ?? [];
    const emtbTechnicalFacts = emtbDetails?.technicalFacts ?? {};
    const emtbBrandAdjustment = isEMTB && isBrandMatch ? 1 : 0;
    const emtbFinalRankingValue = emtbTechnicalScore + emtbBrandAdjustment;
    const levelPriceScore = getLevelPricePreference(bike.price, answers.budget, answers.level);
    const cityTechnicalScore = cityDetails?.technicalScore ?? 0;
    const citySuitabilityTier = cityDetails?.suitabilityTier;
    const cityFamilyKey = cityDetails?.familyKey;
    const matchReasons = cityDetails?.matchReasons ?? [];

    return {
      bike,
      profile,
      tier,
      isBrandMatch,
      mtbLevelSuitabilityScore,
      mtbLevelPriceScore,
      gravelLevelSuitabilityScore,
      gravelLevelPriceScore,
      emtbDetails,
      emtbTechnicalScore,
      emtbSuitabilityTier,
      emtbRiderIntent,
      emtbReasonCodes,
      emtbTechnicalFacts,
      emtbBrandAdjustment,
      emtbFinalRankingValue,
      cityTechnicalScore,
      citySuitabilityTier,
      cityFamilyKey,
      matchReasons,
      overBudgetBy,
      isAboveBudget,
      levelPriceScore,
    };
  });

  if (isCityFlow) {
    console.log("[CITY ACTUAL ANSWERS]");
    console.log(`- category: ${answers.category}`);
    console.log(`- budget: ${answers.budget}`);
    console.log(`- level: ${answers.level}`);
    console.log(`- usage: ${answers.usage}`);
    console.log(`- cityPriority: ${answers.cityPriority || ""}`);
    console.log(`- city priority focus: ${getCityPriorityLabel(getCityPriorityPreference(answers.cityPriority))}`);

    console.log("[CITY CANDIDATE SCORING]");
    bikeRanks.forEach((item, index) => {
      console.log(
        `  [${index + 1}] title: ${item.bike.title} | price: €${item.bike.price} | electricBikeCategory: ${item.bike.electricBikeCategory ?? "undefined"} | technicalScore: ${item.cityTechnicalScore ?? 0} | finalTier: ${item.citySuitabilityTier ?? "POOR"} | matchReasons: ${item.matchReasons?.join(" | ") || "none"}`,
      );
    });
  } else if (isEMTB) {
    const riderIntent = bikeRanks[0]?.emtbRiderIntent ?? getEMTBRiderIntent(answers.usage);
    console.log("[EMTB ACTUAL ANSWERS]");
    console.log(`- category: ${answers.category}`);
    console.log(`- budget: ${answers.budget}`);
    console.log(`- level: ${answers.level}`);
    console.log(`- usage: ${answers.usage}`);
    console.log(`- brand: ${answers.brand || ""}`);
    console.log(`- mapped rider intent: ${riderIntent}`);

    console.log("[EMTB CANDIDATE SCORING]");
    bikeRanks.forEach((item, index) => {
      console.log(
        `  [${index + 1}] title: ${item.bike.title} | price: €${item.bike.price} | emtbProfile: ${item.bike.emtbProfile ?? "undefined"} | emtbPowerType: ${item.bike.emtbPowerType ?? "undefined"} | motorBrand: ${item.bike.motorBrand ?? "undefined"} | motorModel: ${item.bike.motorModel ?? "undefined"} | torqueNm: ${item.bike.torqueNm ?? "undefined"} | batteryWh: ${item.bike.batteryWh ?? "undefined"} | travelFrontMm: ${item.bike.travelFrontMm ?? "undefined"} | travelRearMm: ${item.bike.travelRearMm ?? "undefined"} | profileContribution: ${item.emtbDetails?.profileContribution ?? 0} | batteryContribution: ${item.emtbDetails?.batteryContribution ?? 0} | powerContribution: ${item.emtbDetails?.powerContribution ?? 0} | levelAdjustment: ${item.emtbDetails?.levelAdjustment ?? 0} | scoreBeforeTierCap: ${item.emtbDetails?.scoreBeforeTierCap ?? item.emtbTechnicalScore} | uncappedTier: ${item.emtbDetails?.uncappedSuitabilityTier ?? item.emtbSuitabilityTier ?? "POOR"} | profileTierCap: ${item.emtbDetails?.profileTierCap ?? "PERFECT"} | finalTier: ${item.emtbSuitabilityTier ?? "POOR"} | technicalScore: ${item.emtbTechnicalScore} | brand adjustment: ${item.emtbBrandAdjustment} | final ranking values: { tier: ${item.tier}, technicalScore: ${item.emtbTechnicalScore}, brandAdjustment: ${item.emtbBrandAdjustment}, finalRankingValue: ${item.emtbFinalRankingValue} } | reason codes: ${item.emtbReasonCodes.join(", ") || "none"}`,
      );
    });
  }

  // STEP 4: Sort strictly:
  // 1. suitability tier DESCENDING (highest tier first)
  // 2. E-MTB technical suitability / brand / price handling is handled separately
  bikeRanks.sort((a, b) => {
    // Sort by tier first (descending)
    if (a.tier !== b.tier) {
      return b.tier - a.tier;
    }

    if (isCityFlow) {
      if (a.cityTechnicalScore !== b.cityTechnicalScore) {
        return (b.cityTechnicalScore ?? 0) - (a.cityTechnicalScore ?? 0);
      }

      if (a.isBrandMatch !== b.isBrandMatch) {
        return a.isBrandMatch ? -1 : 1;
      }

      if (isBudgetFallback && a.overBudgetBy !== b.overBudgetBy) {
        return a.overBudgetBy - b.overBudgetBy;
      }

      return b.levelPriceScore - a.levelPriceScore;
    }

    if (isEMTB) {
      if (a.emtbTechnicalScore !== b.emtbTechnicalScore) {
        return b.emtbTechnicalScore - a.emtbTechnicalScore;
      }

      if (a.isBrandMatch !== b.isBrandMatch) {
        return a.isBrandMatch ? -1 : 1;
      }

      if (isBudgetFallback && a.overBudgetBy !== b.overBudgetBy) {
        return a.overBudgetBy - b.overBudgetBy;
      }

      return b.levelPriceScore - a.levelPriceScore;
    }

    // Within same tier, sort by brand match (descending)
    if (a.isBrandMatch !== b.isBrandMatch) {
      return a.isBrandMatch ? -1 : 1;
    }

    // MTB-specific strict priority:
    // 3. level suitability
    // 4. level-based price preference
    if (isMTB && !isBudgetFallback) {
      if (a.mtbLevelSuitabilityScore !== b.mtbLevelSuitabilityScore) {
        return b.mtbLevelSuitabilityScore - a.mtbLevelSuitabilityScore;
      }

      if (a.mtbLevelPriceScore !== b.mtbLevelPriceScore) {
        return b.mtbLevelPriceScore - a.mtbLevelPriceScore;
      }
    }

    // Gravel-specific strict priority:
    // 3. level suitability
    // 4. level-based price preference
    if (isGravel && !isBudgetFallback) {
      if (a.gravelLevelSuitabilityScore !== b.gravelLevelSuitabilityScore) {
        return b.gravelLevelSuitabilityScore - a.gravelLevelSuitabilityScore;
      }

      if (a.gravelLevelPriceScore !== b.gravelLevelPriceScore) {
        return b.gravelLevelPriceScore - a.gravelLevelPriceScore;
      }
    }

    if (isBudgetFallback && a.overBudgetBy !== b.overBudgetBy) {
      return a.overBudgetBy - b.overBudgetBy;
    }

    // Within same tier and brand match, sort by level-based price preference
    return b.levelPriceScore - a.levelPriceScore;
  });

  // DEBUG 4: Log final sorted top 10
  console.log("[FINAL SORTED RESULTS - TOP 10]");
  console.log(
    `[QUESTION ANSWERS] Category: ${answers.category} | Usage: ${answers.usage} | Level: ${answers.level} | Budget: ${answers.budget} | Preferred Brand: ${preferredBrand || "none"}`,
  );
  bikeRanks.slice(0, 10).forEach((item, index) => {
    if (isCityFlow) {
      console.log(
        `[CITY TOP ${index + 1}] Position: ${index + 1} | Title: ${item.bike.title} | Price: €${item.bike.price} | Tier: ${item.citySuitabilityTier ?? "POOR"} | TechnicalScore: ${item.cityTechnicalScore ?? 0} | Reason codes: ${item.matchReasons?.join(", ") || "none"}`,
      );
    } else if (isEMTB) {
      console.log(
        `[EMTB TOP ${index + 1}] Position: ${index + 1} | Title: ${item.bike.title} | Price: €${item.bike.price} | Tier: ${item.emtbSuitabilityTier ?? "POOR"} | TechnicalScore: ${item.emtbTechnicalScore} | Reason codes: ${item.emtbReasonCodes.join(", ") || "none"}`,
      );
    } else if (isMTB) {
      console.log(
        `[MTB TOP ${index + 1}] Position: ${index + 1} | Title: ${item.bike.title} | Price: €${item.bike.price} | MTB Profile: ${item.profile} | Suitability Tier: ${item.tier} | Selected Usage: ${answers.usage} | Selected Level: ${answers.level}`,
      );
    } else if (isGravel) {
      console.log(
        `[GRAVEL TOP ${index + 1}] Position: ${index + 1} | Title: ${item.bike.title} | Price: €${item.bike.price} | Gravel Profile: ${item.profile} | Suitability Tier: ${item.tier} | Selected Usage: ${answers.usage} | Selected Level: ${answers.level}`,
      );
    } else {
      console.log(
        `[RANK ${index + 1}] ${item.bike.title} | €${item.bike.price} | Brand: ${item.bike.brand} | Profile: ${item.profile} | Tier: ${item.tier} | BrandMatch: ${item.isBrandMatch}`,
      );
    }
  });

  const presentationPolicyRanks = isCityFlow
    ? applyCityPresentationPolicy(bikeRanks, isBudgetFallback)
    : applyResultPresentationPolicy(
        bikeRanks,
        answers,
        isEMTB,
        isBudgetFallback,
      );

  const finalRanks = isBudgetFallback ? presentationPolicyRanks.slice(0, 3) : presentationPolicyRanks;

  if (isBudgetFallback) {
    console.log("[FALLBACK RESULTS - TOP 10]");
    finalRanks.slice(0, 10).forEach((item, index) => {
      const amountOverBudget = Math.max(0, item.bike.price - answers.budget);
      const percentageOverBudget = answers.budget > 0
        ? ((amountOverBudget / answers.budget) * 100).toFixed(1)
        : "0.0";

      console.log(
        `[FALLBACK ${index + 1}] Title: ${item.bike.title} | Price: €${item.bike.price} | Amount Over Budget: €${amountOverBudget} | Percentage Over Budget: ${percentageOverBudget}% | Profile: ${item.profile} | Suitability Tier: ${item.tier}`,
      );
    });
  }

  return finalRanks.map(({ bike, isAboveBudget, matchReasons }) => ({
    id: bike.id,
    brand: bike.brand,
    model: bike.title,
    category: bike.category,
    price: bike.price,
    availability: bike.availability,
    productHandle: bike.productHandle,
    level: answers.level,
    usage: answers.usage,
    image: bike.images[0] ?? "",
    isFallbackAboveBudget: isBudgetFallback && isAboveBudget ? true : undefined,
    matchReasons,
  }));
}