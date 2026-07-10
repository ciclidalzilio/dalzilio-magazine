import type { ElectricBikeCategory } from "@/types/shopify";

export type CityFrameType = "STEP_OVER" | "WAVE" | "SLOPE" | "LOW_STEP";
export type CityDriveType = "BELT" | "CHAIN";

export interface CityTechnicalSpecs {
  electricBikeCategory?: ElectricBikeCategory;
  batteryWh?: number;
  motorBrand?: string;
  motorModel?: string;
  maximumTorqueNm?: number;
  weightKg?: number;
  frameType?: CityFrameType;
  driveType?: CityDriveType;
  lights?: boolean;
  rearRack?: boolean;
  fenders?: boolean;
  kickstand?: boolean;
  integratedLock?: boolean;
  display?: string;
  rangeExtenderCompatible?: boolean;
  suspensionFork?: boolean;
  forkTravelMm?: number;
}

function normalizeCitySpecKey(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

const cityTechnicalSpecsByExactModel: Record<string, CityTechnicalSpecs> = {
  scottsub10beltbiciclettascottsub10belt: {
    electricBikeCategory: "E_URBAN",
    batteryWh: 800,
    motorBrand: "Bosch",
    motorModel: "Performance CX",
    maximumTorqueNm: 85,
    weightKg: 29.4,
    driveType: "BELT",
    lights: true,
    rearRack: true,
    fenders: true,
    kickstand: true,
    display: "Bosch System Controller / Kiox 300 / Mini remote",
    rangeExtenderCompatible: true,
  },
  scottsub10beltwavebiciclettascottsub10beltwave: {
    electricBikeCategory: "E_URBAN",
    batteryWh: 800,
    motorBrand: "Bosch",
    motorModel: "Performance CX",
    maximumTorqueNm: 85,
    weightKg: 31.2,
    frameType: "WAVE",
    driveType: "BELT",
    lights: true,
    rearRack: true,
    fenders: true,
    kickstand: true,
    display: "Bosch LED Remote & Kiox 300",
    rangeExtenderCompatible: true,
  },
  scottsub30biciclettascottsub30: {
    electricBikeCategory: "E_URBAN",
    batteryWh: 600,
    motorBrand: "Bosch",
    motorModel: "Performance CX",
    maximumTorqueNm: 85,
    weightKg: 29.2,
    rearRack: true,
    fenders: true,
    kickstand: true,
    display: "Bosch Purion 200",
    rangeExtenderCompatible: true,
  },
  scottsub30wavebiciclettascottsub30wave: {
    electricBikeCategory: "E_URBAN",
    batteryWh: 600,
    motorBrand: "Bosch",
    motorModel: "Performance CX",
    maximumTorqueNm: 85,
    weightKg: 30,
    frameType: "WAVE",
    rearRack: true,
    fenders: true,
    kickstand: true,
    display: "Bosch Purion 200",
    rangeExtenderCompatible: true,
  },
  scottpassage10beltbiciclettascottpassage10belt: {
    electricBikeCategory: "E_URBAN",
    batteryWh: 400,
    motorBrand: "Bosch",
    maximumTorqueNm: 55,
    weightKg: 21.7,
    driveType: "BELT",
    lights: true,
    rearRack: true,
    fenders: true,
    kickstand: true,
    display: "Bosch Purion 200",
    rangeExtenderCompatible: true,
  },
  scottpassage10beltslopebiciclettascottpassage10beltslope: {
    electricBikeCategory: "E_URBAN",
    batteryWh: 400,
    motorBrand: "Bosch",
    maximumTorqueNm: 55,
    weightKg: 21.9,
    frameType: "SLOPE",
    driveType: "BELT",
    lights: true,
    rearRack: true,
    fenders: true,
    kickstand: true,
    display: "Bosch Purion 200",
    rangeExtenderCompatible: true,
  },
  scottpassage20biciclettascottpassage20: {
    electricBikeCategory: "E_URBAN",
    batteryWh: 400,
    motorBrand: "Bosch",
    motorModel: "Performance SX",
    maximumTorqueNm: 55,
    weightKg: 20.5,
    kickstand: true,
    display: "Bosch Purion 200",
    rangeExtenderCompatible: true,
  },
  scottpassage20slopebiciclettascottpassage20slope: {
    electricBikeCategory: "E_URBAN",
    batteryWh: 400,
    motorBrand: "Bosch",
    motorModel: "Performance SX",
    maximumTorqueNm: 55,
    weightKg: 20.5,
    frameType: "SLOPE",
    kickstand: true,
    display: "Bosch Purion 200",
    rangeExtenderCompatible: true,
  },
  scottpassage30biciclettascottpassage30: {
    electricBikeCategory: "E_URBAN",
    batteryWh: 400,
    motorBrand: "Bosch",
    motorModel: "Performance SX",
    maximumTorqueNm: 55,
    weightKg: 21.8,
    lights: true,
    fenders: true,
    kickstand: true,
    display: "Bosch Purion 200",
    rangeExtenderCompatible: true,
  },
  scottpassage30slopebiciclettascottpassage30slope: {
    electricBikeCategory: "E_URBAN",
    batteryWh: 400,
    motorBrand: "Bosch",
    motorModel: "Performance SX",
    maximumTorqueNm: 55,
    weightKg: 21.8,
    frameType: "SLOPE",
    lights: true,
    fenders: true,
    kickstand: true,
    display: "Bosch Purion 200",
    rangeExtenderCompatible: true,
  },
  scottaxis20biciclettascottaxis20: {
    electricBikeCategory: "E_TREKKING",
    batteryWh: 600,
    motorBrand: "Bosch",
    motorModel: "Performance Line CX",
    maximumTorqueNm: 85,
    weightKg: 28.3,
    lights: true,
    rearRack: true,
    display: "Bosch System Controller / Intuvia 100 / Mini remote",
    rangeExtenderCompatible: true,
  },
  scottaxis30biciclettascottaxis30: {
    electricBikeCategory: "E_TREKKING",
    batteryWh: 600,
    motorBrand: "Bosch",
    motorModel: "Performance CX",
    maximumTorqueNm: 85,
    weightKg: 27,
    lights: true,
    rearRack: true,
    kickstand: true,
    display: "Bosch Purion 200",
    rangeExtenderCompatible: true,
  },
  scottaxis30wavebiciclettascottaxis30wave: {
    electricBikeCategory: "E_TREKKING",
    batteryWh: 600,
    motorBrand: "Bosch",
    motorModel: "Performance CX",
    maximumTorqueNm: 85,
    weightKg: 28.2,
    frameType: "WAVE",
    lights: true,
    rearRack: true,
    kickstand: true,
    display: "Bosch Purion 200",
    rangeExtenderCompatible: true,
  },
  scottaxis40biciclettascottaxis40: {
    electricBikeCategory: "E_TREKKING",
    batteryWh: 625,
    motorBrand: "Bosch",
    weightKg: 27.5,
    fenders: true,
    kickstand: true,
    display: "Bosch Purion 200",
  },
  cannondaletesoroneox3cannondaletesoroneox3: {
    electricBikeCategory: "E_TREKKING",
    batteryWh: 500,
    motorModel: "Active Line Plus",
    suspensionFork: true,
    forkTravelMm: 63,
    lights: true,
    rearRack: true,
    fenders: true,
    integratedLock: true,
  },
};

export function getCityTechnicalSpecs(title: string, productHandle: string): CityTechnicalSpecs {
  const key = normalizeCitySpecKey(`${title} ${productHandle}`);
  return cityTechnicalSpecsByExactModel[key] ?? {};
}