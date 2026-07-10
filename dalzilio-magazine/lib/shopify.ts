import type { ShopifyBike } from "@/types/shopify";
import { mergeEMTBTechnicalSpecs } from "@/lib/ebike-specs";

let cachedBikes: ShopifyBike[] | null = null;

function getShopifyConfig() {
  const storeDomain = process.env.SHOPIFY_STORE_DOMAIN;
  const storefrontToken = process.env.SHOPIFY_STOREFRONT_TOKEN;

  if (!storeDomain || !storefrontToken) {
    throw new Error("Missing Shopify environment variables");
  }

  return {
    storeDomain,
    storefrontToken,
  };
}

function normalizeCollectionTitle(value: string) {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function getBikeCategoryFromCollections(product: any) {
  const collectionTitles = (product.collections?.nodes ?? [])
    .map((collection: any) => normalizeCollectionTitle(collection?.title || ""))
    .filter((title: string) => Boolean(title));

  if (collectionTitles.some((title: string) => title === "BICIDACORSA")) {
    return "Corsa";
  }

  if (collectionTitles.some((title: string) => title === "MOUNTAINBIKE")) {
    return "MTB";
  }

  if (collectionTitles.some((title: string) => title === "GRAVEL")) {
    return "Gravel";
  }

  if (collectionTitles.some((title: string) => title === "EBIKE")) {
    return "E-MTB";
  }

  return null;
}

function mapShopifyProduct(product: any): ShopifyBike {
  const firstVariant = product.variants?.nodes?.[0];
  const category = getBikeCategoryFromCollections(product) ?? "Bici";

  const bike: ShopifyBike = {
    id: product.id,
    title: product.title,
    brand: product.vendor || "Unknown",
    category,
    price: Number(firstVariant?.price?.amount ?? 0),

    images: (product.images?.nodes ?? [])
      .map((img: any) => img.url)
      .filter(Boolean),

    productHandle: product.handle,

    availability: firstVariant?.availableForSale
      ? "in_stock"
      : "out_of_stock",
  };

  const mappedBike = mergeEMTBTechnicalSpecs(bike);

  console.log(
    "[Mapped Bike]",
    mappedBike.title,
    "| category:",
    mappedBike.category,
    "| price:",
    mappedBike.price
  );

  return mappedBike;
}

export async function getBikes(): Promise<ShopifyBike[]> {
  if (cachedBikes) {
    return cachedBikes;
  }

  const { storeDomain, storefrontToken } = getShopifyConfig();

  // Fetch all products with pagination
  let allProducts: any[] = [];
  let hasNextPage = true;
  let endCursor: string | null = null;
  let pageCount = 0;

  while (hasNextPage) {
    pageCount++;
    console.log(`[Shopify] Fetching page ${pageCount}...`);

    const query = `
      query GetBikes($after: String) {
        products(first: 100, after: $after) {
          nodes {
            id
            title
            handle
            vendor

            collections(first: 10) {
              nodes {
                title
                handle
              }
            }

            images(first: 5) {
              nodes {
                url
              }
            }

            variants(first: 1) {
              nodes {
                availableForSale
                price {
                  amount
                }
              }
            }
          }
          pageInfo {
            hasNextPage
            endCursor
          }
        }
      }
    `;

    const response: Response = await fetch(
      `https://${storeDomain}/api/2025-01/graphql.json`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Storefront-Access-Token": storefrontToken,
        },
        body: JSON.stringify({ 
          query,
          variables: { after: endCursor }
        }),
        cache: "no-store",
      }
    );

    if (!response.ok) {
      throw new Error(`Shopify request failed (${response.status})`);
    }

    const json = await response.json();

    if (json.errors) {
      console.error(json.errors);
      throw new Error("Shopify GraphQL error");
    }

    const pageProducts = json.data.products.nodes ?? [];
    const pageInfo = json.data.products.pageInfo ?? {};

    allProducts = allProducts.concat(pageProducts);
    
    console.log(
      `[Shopify] Page ${pageCount}: ${pageProducts.length} products fetched (total so far: ${allProducts.length})`
    );

    hasNextPage = pageInfo.hasNextPage ?? false;
    endCursor = pageInfo.endCursor ?? null;
  }

  console.log("[Shopify] Total products fetched:", allProducts.length);

  // Apply existing filtering and mapping logic
  cachedBikes = allProducts
    .filter((product: any) => getBikeCategoryFromCollections(product))
    .map(mapShopifyProduct);

  const mappedBikes = cachedBikes ?? [];

  console.log("[Shopify] Total bikes mapped:", mappedBikes.length);

  // Log all Corsa bikes with title and price
  const corsaBikes = mappedBikes.filter((bike) => bike.category === "Corsa");
  console.log(`[Shopify] Corsa bikes found: ${corsaBikes.length}`);
  corsaBikes.forEach((bike) => {
    console.log(`  - ${bike.title} | €${bike.price}`);
  });

  // TEMP DEBUG: Grouped electric-bike classification diagnostics
  const emtbBikes = mappedBikes.filter((bike) => bike.category === "E-MTB");
  console.log(`[Shopify] E-MTB bikes found: ${emtbBikes.length}`);

  const diagnosticGroups = [
    { label: "E_ROAD", filter: (bike: ShopifyBike) => bike.electricBikeCategory === "E_ROAD" },
    { label: "E_GRAVEL", filter: (bike: ShopifyBike) => bike.electricBikeCategory === "E_GRAVEL" },
    { label: "E_TREKKING", filter: (bike: ShopifyBike) => bike.electricBikeCategory === "E_TREKKING" },
    { label: "E_URBAN", filter: (bike: ShopifyBike) => bike.electricBikeCategory === "E_URBAN" },
    {
      label: "E_MTB LIGHT",
      filter: (bike: ShopifyBike) =>
        bike.electricBikeCategory === "E_MTB" && bike.emtbPowerType === "LIGHT",
    },
    {
      label: "E_MTB FULL_POWER",
      filter: (bike: ShopifyBike) =>
        bike.electricBikeCategory === "E_MTB" && bike.emtbPowerType === "FULL_POWER",
    },
    {
      label: "UNKNOWN ELECTRIC",
      filter: (bike: ShopifyBike) => !bike.electricBikeCategory,
    },
  ];

  diagnosticGroups.forEach((group) => {
    const rows = emtbBikes.filter(group.filter);
    console.log(`[ELECTRIC GROUP] ${group.label}: ${rows.length}`);
    rows.forEach((bike) => {
      console.log(
        `  - ${bike.title} | electricBikeCategory: ${bike.electricBikeCategory ?? "undefined"} | emtbPowerType: ${bike.emtbPowerType ?? "undefined"} | emtbProfile: ${bike.emtbProfile ?? "undefined"}`,
      );
    });
  });

  // TEMP DEBUG: Verified E-MTB technical data batch 1
  const emtbOnlyBikes = emtbBikes.filter((bike) => bike.electricBikeCategory === "E_MTB");
  const batch1Enriched = emtbOnlyBikes.filter(
    (bike) =>
      bike.motorBrand !== undefined ||
      bike.motorModel !== undefined ||
      bike.torqueNm !== undefined ||
      bike.boostTorqueNm !== undefined ||
      bike.batteryWh !== undefined ||
      bike.travelFrontMm !== undefined ||
      bike.travelRearMm !== undefined,
  );

  console.log("[EMTB TECHNICAL DATA - BATCH 1]");
  batch1Enriched.forEach((bike) => {
    console.log(
      `  - ${bike.title} | motorBrand: ${bike.motorBrand ?? "undefined"} | motorModel: ${bike.motorModel ?? "undefined"} | torqueNm: ${bike.torqueNm ?? "undefined"} | boostTorqueNm: ${bike.boostTorqueNm ?? "undefined"} | batteryWh: ${bike.batteryWh ?? "undefined"} | travelFrontMm: ${bike.travelFrontMm ?? "undefined"} | travelRearMm: ${bike.travelRearMm ?? "undefined"} | emtbPowerType: ${bike.emtbPowerType ?? "undefined"} | emtbProfile: ${bike.emtbProfile ?? "undefined"}`,
    );
  });

  const stillIncomplete = emtbOnlyBikes.filter(
    (bike) =>
      bike.motorBrand === undefined ||
      bike.motorModel === undefined ||
      bike.batteryWh === undefined ||
      bike.travelFrontMm === undefined ||
      bike.travelRearMm === undefined,
  );

  console.log("[EMTB TECHNICAL DATA - STILL INCOMPLETE]");
  stillIncomplete.forEach((bike) => {
    const missingFields: string[] = [];
    if (bike.motorBrand === undefined) missingFields.push("motorBrand");
    if (bike.motorModel === undefined) missingFields.push("motorModel");
    if (bike.batteryWh === undefined) missingFields.push("batteryWh");
    if (bike.travelFrontMm === undefined) missingFields.push("travelFrontMm");
    if (bike.travelRearMm === undefined) missingFields.push("travelRearMm");

    console.log(`  - ${bike.title} | missing: ${missingFields.join(", ")}`);
  });

  return mappedBikes;
}