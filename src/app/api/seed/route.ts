import { NextRequest, NextResponse } from "next/server";
import { seedData } from "@/lib/seed";

export async function POST(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const reset = searchParams.get("reset") === "true";
    const result = await seedData(reset);
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
