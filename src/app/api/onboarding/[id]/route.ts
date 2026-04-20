import { NextRequest } from "next/server";
import { onboardingsStore } from "@/lib/store";
import { getAuditLogs } from "@/lib/audit";
import { getAuthFromRequest, unauthorized, ok, notFound } from "@/lib/api-helpers";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = getAuthFromRequest(req);
  if (!auth) return unauthorized();

  const { id } = await params;
  const onboarding = onboardingsStore.getById(id);
  if (!onboarding) return notFound("Onboarding not found");

  return ok(onboarding);
}
