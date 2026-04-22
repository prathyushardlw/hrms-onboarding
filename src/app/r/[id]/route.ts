import { NextRequest, NextResponse } from "next/server";
import { onboardingsStore } from "@/lib/store";

// Short redirect: /r/{onboardingId} → /onboard/{token}
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const onboarding = onboardingsStore.getById(id);

  if (!onboarding) {
    return NextResponse.redirect(new URL("/", _req.url));
  }

  return NextResponse.redirect(
    new URL(`/onboard/${onboarding.accessToken}`, _req.url)
  );
}
