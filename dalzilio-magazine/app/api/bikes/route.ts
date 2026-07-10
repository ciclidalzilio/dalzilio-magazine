import { NextResponse } from "next/server";

import { getBikes } from "@/lib/shopify";

export async function GET() {
  try {
    const bikes = await getBikes();
    return NextResponse.json(bikes);
  } catch (error) {
    console.error("Failed to load bikes route", error);
    return NextResponse.json([], { status: 500 });
  }
}
