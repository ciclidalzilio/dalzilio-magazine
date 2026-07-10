export type ShopifyAvailability = "in_stock" | "out_of_stock" | "preorder";
export type EMTBPowerType = "LIGHT" | "FULL_POWER";
export type EMTBProfile = "XC_TRAIL" | "TRAIL" | "ALL_MOUNTAIN" | "ENDURO";
export type ElectricBikeCategory = "E_ROAD" | "E_GRAVEL" | "E_TREKKING" | "E_URBAN" | "E_MTB";

export interface ShopifyBike {
  id: string;
  title: string;
  brand: string;
  category: string;
  price: number;
  images: string[];
  productHandle: string;
  availability: ShopifyAvailability;
  level?: string;
  usage?: string;
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
