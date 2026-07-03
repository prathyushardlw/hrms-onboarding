import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ status: "ok", service: "hrms-onboarding-api", version: "1.0.0" });
}
