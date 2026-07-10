import type {
  ElectricBikeCategory,
  EMTBPowerType,
  EMTBProfile,
  ShopifyBike,
} from "@/types/shopify";

export interface EMTBTechnicalSpecs {
  electricBikeCategory?: ElectricBikeCategory;
  motorBrand?: string;
  motorModel?: string;
  torqueNm?: number;
  boostTorqueNm?: number;
  batteryWh?: number;
  travelFrontMm?: number;
  travelRearMm?: number;
  weightKg?: number;
  emtbPowerType?: EMTBPowerType;
  emtbProfile?: EMTBProfile;
}

interface EMTBSpecsDatabase {
  exactModels: Record<string, EMTBTechnicalSpecs>;
  modelFamilies: Record<string, EMTBTechnicalSpecs>;
}

interface ElectricBikeFamilyRule {
  pattern: string;
  category: ElectricBikeCategory;
  emtbPowerType?: EMTBPowerType;
  emtbProfile?: EMTBProfile;
}

function normalizeSpecKey(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

const scottPatronSt910VerifiedSpecs: EMTBTechnicalSpecs = {
  motorBrand: "Shimano",
  batteryWh: 800,
  travelFrontMm: 170,
  travelRearMm: 170,
  emtbPowerType: "FULL_POWER",
  emtbProfile: "ENDURO",
};

const emtbSpecsDatabase: EMTBSpecsDatabase = {
  // Keyed by normalized "title + handle" for model-level precision.
  exactModels: {
    // Batch 2A: VERIFIED models from Shopify product descriptions only.

    // Patron previous generation (ALL_MOUNTAIN)
    scottpatron910biciclettascottpatron910: {
      motorBrand: "Shimano",
      batteryWh: 800,
      travelFrontMm: 150,
      travelRearMm: 150,
      emtbPowerType: "FULL_POWER",
      emtbProfile: "ALL_MOUNTAIN",
    },
    scottpatron920biciclettascottpatron920: {
      motorBrand: "Shimano",
      batteryWh: 800,
      travelFrontMm: 150,
      travelRearMm: 150,
      emtbPowerType: "FULL_POWER",
      emtbProfile: "ALL_MOUNTAIN",
    },

    // Patron New 2026 (ALL_MOUNTAIN)
    scottpatron900new2026scottpatron900new2026: {
      motorBrand: "Bosch",
      batteryWh: 800,
      travelFrontMm: 150,
      travelRearMm: 150,
      emtbPowerType: "FULL_POWER",
      emtbProfile: "ALL_MOUNTAIN",
    },
    scottpatron900ultimatenew2026scottpatron900ultimatenew2026: {
      motorBrand: "Bosch",
      batteryWh: 800,
      travelFrontMm: 150,
      travelRearMm: 150,
      emtbPowerType: "FULL_POWER",
      emtbProfile: "ALL_MOUNTAIN",
    },
    scottpatron910new2026scottpatron910new2026: {
      motorBrand: "Bosch",
      batteryWh: 800,
      travelFrontMm: 150,
      travelRearMm: 150,
      emtbPowerType: "FULL_POWER",
      emtbProfile: "ALL_MOUNTAIN",
    },
    scottpatron920new2026scottpatron920new2026: {
      motorBrand: "Bosch",
      batteryWh: 800,
      travelFrontMm: 150,
      travelRearMm: 150,
      emtbPowerType: "FULL_POWER",
      emtbProfile: "ALL_MOUNTAIN",
    },
    scottpatron930new2026scottpatron930new2026: {
      motorBrand: "Bosch",
      batteryWh: 800,
      travelFrontMm: 150,
      travelRearMm: 150,
      emtbPowerType: "FULL_POWER",
      emtbProfile: "ALL_MOUNTAIN",
    },

    // Patron ST previous generation (ENDURO)
    scottpatronst910biciclettascottpatronst910: scottPatronSt910VerifiedSpecs,
    scottpatronst910scottpatronst910: scottPatronSt910VerifiedSpecs,

    // Patron ST New 2026 (ENDURO)
    scottpatronst900new2026scottpatronst900new2026: {
      motorBrand: "Bosch",
      batteryWh: 800,
      travelFrontMm: 170,
      travelRearMm: 150,
      emtbPowerType: "FULL_POWER",
      emtbProfile: "ENDURO",
    },
    scottpatronst900tunednew2026scottpatronst900tuned1: {
      motorBrand: "Bosch",
      batteryWh: 800,
      travelFrontMm: 170,
      travelRearMm: 170,
      emtbPowerType: "FULL_POWER",
      emtbProfile: "ENDURO",
    },
    scottpatronst910new2026scottpatronst910new2026: {
      motorBrand: "Bosch",
      batteryWh: 800,
      travelFrontMm: 170,
      travelRearMm: 150,
      emtbPowerType: "FULL_POWER",
      emtbProfile: "ENDURO",
    },

    // Strike eRIDE (ALL_MOUNTAIN)
    scottstrikeeride930blackbiciclettascottstrikeeride930black: {
      motorBrand: "Bosch",
      batteryWh: 625,
      travelFrontMm: 150,
      travelRearMm: 150,
      emtbPowerType: "FULL_POWER",
      emtbProfile: "ALL_MOUNTAIN",
    },
    scottstrikeeride930greybiciclettascottstrikeeride930grey: {
      motorBrand: "Bosch",
      batteryWh: 625,
      travelFrontMm: 150,
      travelRearMm: 150,
      emtbPowerType: "FULL_POWER",
      emtbProfile: "ALL_MOUNTAIN",
    },
    scottcontessastrikeeride920purplebiciclettascottcontessastrikeeride920purple: {
      motorBrand: "Bosch",
      batteryWh: 625,
      travelFrontMm: 150,
      travelRearMm: 150,
      emtbPowerType: "FULL_POWER",
      emtbProfile: "ALL_MOUNTAIN",
    },
    scottcontessastrikeeride920whitebiciclettascottcontessastrikeeride920white: {
      motorBrand: "Bosch",
      batteryWh: 625,
      travelFrontMm: 150,
      travelRearMm: 150,
      emtbPowerType: "FULL_POWER",
      emtbProfile: "ALL_MOUNTAIN",
    },
  },

  // Keyed by normalized model-family keywords.
  // Use "&" to require multiple key parts (e.g., "rail&gen5").
  modelFamilies: {
    // AMFLOW PL Carbon family
    amflowpl: {
      motorBrand: "DJI",
      motorModel: "Avinox M1",
      torqueNm: 105,
      boostTorqueNm: 120,
      batteryWh: 800,
      travelFrontMm: 160,
      travelRearMm: 150,
      emtbPowerType: "FULL_POWER",
      emtbProfile: "ALL_MOUNTAIN",
    },

    // Cannondale Moterra SL family
    moterrasl: {
      motorBrand: "Shimano",
      motorModel: "EP801",
      torqueNm: 85,
      batteryWh: 601,
      travelFrontMm: 160,
      travelRearMm: 150,
      emtbPowerType: "LIGHT",
      emtbProfile: "ALL_MOUNTAIN",
    },

    // SCOTT Voltage eRIDE family (including Contessa variants)
    voltageeride: {
      motorBrand: "TQ",
      motorModel: "HPR50",
      torqueNm: 50,
      batteryWh: 360,
      travelFrontMm: 160,
      travelRearMm: 155,
      emtbPowerType: "LIGHT",
      emtbProfile: "TRAIL",
    },

    // SCOTT electric Lumen family
    lumen: {
      motorBrand: "TQ",
      motorModel: "HPR50",
      torqueNm: 50,
      batteryWh: 360,
      travelFrontMm: 130,
      travelRearMm: 130,
      emtbPowerType: "LIGHT",
      emtbProfile: "XC_TRAIL",
    },

    // Trek Slash+ family
    slash: {
      motorBrand: "TQ",
      motorModel: "HPR50",
      torqueNm: 50,
      batteryWh: 580,
      travelFrontMm: 170,
      travelRearMm: 170,
      emtbPowerType: "LIGHT",
      emtbProfile: "ENDURO",
    },

    // Trek Rail+ Gen 5 family only
    "rail&gen5": {
      motorBrand: "Bosch",
      motorModel: "Performance Line CX",
      batteryWh: 800,
      travelFrontMm: 160,
      travelRearMm: 160,
      emtbPowerType: "FULL_POWER",
      emtbProfile: "ALL_MOUNTAIN",
    },
  },
};

// Ordered rules: specific patterns must appear before generic ones.
const electricBikeFamilyRules: ElectricBikeFamilyRule[] = [
  // E-ROAD
  { pattern: "domane", category: "E_ROAD" },

  // E-MTB FULL POWER (specific first)
  { pattern: "powerflyfs", category: "E_MTB", emtbPowerType: "FULL_POWER", emtbProfile: "TRAIL" },
  { pattern: "patronst", category: "E_MTB", emtbPowerType: "FULL_POWER", emtbProfile: "ENDURO" },
  { pattern: "rail", category: "E_MTB", emtbPowerType: "FULL_POWER", emtbProfile: "ENDURO" },
  { pattern: "patron", category: "E_MTB", emtbPowerType: "FULL_POWER", emtbProfile: "ALL_MOUNTAIN" },
  { pattern: "powerfly", category: "E_MTB", emtbPowerType: "FULL_POWER", emtbProfile: "TRAIL" },
  { pattern: "amflowpl", category: "E_MTB", emtbPowerType: "FULL_POWER", emtbProfile: "ENDURO" },
  { pattern: "amflowpx", category: "E_MTB", emtbPowerType: "FULL_POWER", emtbProfile: "ALL_MOUNTAIN" },

  // E-MTB LIGHT
  { pattern: "moterrasl", category: "E_MTB", emtbPowerType: "LIGHT", emtbProfile: "ALL_MOUNTAIN" },
  { pattern: "slash", category: "E_MTB", emtbPowerType: "LIGHT", emtbProfile: "ENDURO" },
  { pattern: "lumen", category: "E_MTB", emtbPowerType: "LIGHT", emtbProfile: "XC_TRAIL" },
  { pattern: "voltageeride", category: "E_MTB", emtbPowerType: "LIGHT", emtbProfile: "TRAIL" },

  // Remaining E-MTB FULL POWER families (specific before generic)
  { pattern: "contessastrikeeride", category: "E_MTB", emtbPowerType: "FULL_POWER", emtbProfile: "ALL_MOUNTAIN" },
  { pattern: "strikeeride", category: "E_MTB", emtbPowerType: "FULL_POWER", emtbProfile: "ALL_MOUNTAIN" },
  { pattern: "aspecteride", category: "E_MTB", emtbPowerType: "FULL_POWER", emtbProfile: "XC_TRAIL" },

  // E-TREKKING / E-URBAN (specific first)
  { pattern: "subcross", category: "E_TREKKING" },
  { pattern: "tesoroneo", category: "E_TREKKING" },
  { pattern: "axis", category: "E_TREKKING" },
  { pattern: "passage", category: "E_URBAN" },
  { pattern: "sub", category: "E_URBAN" },
];

function pickKnownTechnicalFields(specs?: EMTBTechnicalSpecs): EMTBTechnicalSpecs {
  if (!specs) {
    return {};
  }

  const filtered: EMTBTechnicalSpecs = {};

  if (specs.electricBikeCategory !== undefined) filtered.electricBikeCategory = specs.electricBikeCategory;
  if (specs.motorBrand !== undefined) filtered.motorBrand = specs.motorBrand;
  if (specs.motorModel !== undefined) filtered.motorModel = specs.motorModel;
  if (specs.torqueNm !== undefined) filtered.torqueNm = specs.torqueNm;
  if (specs.boostTorqueNm !== undefined) filtered.boostTorqueNm = specs.boostTorqueNm;
  if (specs.batteryWh !== undefined) filtered.batteryWh = specs.batteryWh;
  if (specs.travelFrontMm !== undefined) filtered.travelFrontMm = specs.travelFrontMm;
  if (specs.travelRearMm !== undefined) filtered.travelRearMm = specs.travelRearMm;
  if (specs.weightKg !== undefined) filtered.weightKg = specs.weightKg;
  if (specs.emtbPowerType !== undefined) filtered.emtbPowerType = specs.emtbPowerType;
  if (specs.emtbProfile !== undefined) filtered.emtbProfile = specs.emtbProfile;

  return filtered;
}

function getFamilySpecsByMatch(normalizedBikeKey: string): EMTBTechnicalSpecs {
  const familyMatches = Object.entries(emtbSpecsDatabase.modelFamilies)
    .filter(([familyKey]) => {
      const keyParts = familyKey.split("&").filter(Boolean);
      return keyParts.every((part) => normalizedBikeKey.includes(part));
    })
    .sort(([a], [b]) => {
      const aParts = a.split("&").filter(Boolean);
      const bParts = b.split("&").filter(Boolean);
      if (aParts.length !== bParts.length) {
        return bParts.length - aParts.length;
      }
      return b.length - a.length;
    });

  if (familyMatches.length === 0) {
    return {};
  }

  const [, specs] = familyMatches[0];
  return pickKnownTechnicalFields(specs);
}

function getExactSpecsByMatch(normalizedBikeKey: string): EMTBTechnicalSpecs {
  return pickKnownTechnicalFields(emtbSpecsDatabase.exactModels[normalizedBikeKey]);
}

export function getEMTBTechnicalSpecs(title: string, productHandle: string): EMTBTechnicalSpecs {
  const normalizedBikeKey = normalizeSpecKey(`${title} ${productHandle}`);
  const familySpecs = getFamilySpecsByMatch(normalizedBikeKey);
  const exactSpecs = getExactSpecsByMatch(normalizedBikeKey);

  // Exact model fields override family fields when both are available.
  return {
    ...familySpecs,
    ...exactSpecs,
  };
}

function classifyElectricBikeByFamily(title: string, productHandle: string): EMTBTechnicalSpecs {
  const normalizedBikeKey = normalizeSpecKey(`${title} ${productHandle}`);

  for (const rule of electricBikeFamilyRules) {
    if (!normalizedBikeKey.includes(rule.pattern)) {
      continue;
    }

    return {
      electricBikeCategory: rule.category,
      emtbPowerType: rule.category === "E_MTB" ? rule.emtbPowerType : undefined,
      emtbProfile: rule.category === "E_MTB" ? rule.emtbProfile : undefined,
    };
  }

  return {};
}

export function mergeEMTBTechnicalSpecs(bike: ShopifyBike): ShopifyBike {
  if (bike.category !== "E-MTB") {
    return bike;
  }

  const electricClassification = classifyElectricBikeByFamily(bike.title, bike.productHandle);
  const technicalSpecs = electricClassification.electricBikeCategory === "E_MTB"
    ? getEMTBTechnicalSpecs(bike.title, bike.productHandle)
    : {};

  // Only known fields are merged; unknown data remains undefined.
  // Preserve verified technical metadata over generic electric-family classification
  // for overlapping technical fields while still carrying classification-only fields.
  return {
    ...bike,
    ...electricClassification,
    ...technicalSpecs,
  };
}

export function getNormalizedEMTBSpecKey(value: string) {
  return normalizeSpecKey(value);
}
