import { NextResponse } from "next/server";
import { seedData } from "@/lib/seed";

export async function POST() {
  try {
    const result = await seedData();
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
