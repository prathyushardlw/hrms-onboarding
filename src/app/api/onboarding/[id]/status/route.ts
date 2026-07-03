import { NextRequest } from "next/server";
import { onboardingsStore } from "@/lib/store";
import { logAuditEvent } from "@/lib/audit";
import { getAuthFromRequest, unauthorized, badRequest, ok, notFound } from "@/lib/api-helpers";

const VALID_STATUSES = ["initiated", "sent", "in_progress", "submitted", "verified", "completed", "correction_requested"];

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = getAuthFromRequest(req);
  if (!auth || !["super_admin", "admin", "hr"].includes(auth.role)) return unauthorized();
  const { id } = await params;
  const onboarding = await onboardingsStore.getById(id);
  if (!onboarding) return notFound("Onboarding not found");

  const body = await req.json();
  const { status } = body;
  if (!status || !VALID_STATUSES.includes(status)) return badRequest("Invalid status");

  const now = new Date().toISOString();
  await onboardingsStore.update(id, { status, updatedAt: now });
  await logAuditEvent({ onboardingId: id, event: status, performedBy: { type: "hr", id: auth.userId } });

  return ok({ status });
}
