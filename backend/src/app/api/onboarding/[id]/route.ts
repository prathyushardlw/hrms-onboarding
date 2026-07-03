import { NextRequest } from "next/server";
import { onboardingsStore } from "@/lib/store";
import { logAuditEvent } from "@/lib/audit";
import {
  getAuthFromRequest,
  unauthorized,
  ok,
  notFound,
} from "@/lib/api-helpers";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = getAuthFromRequest(req);
  if (!auth) return unauthorized();
  const { id } = await params;
  const onboarding = await onboardingsStore.getById(id);
  if (!onboarding) return notFound("Onboarding not found");
  return ok(onboarding);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = getAuthFromRequest(req);
  if (!auth || !["super_admin", "admin", "hr"].includes(auth.role)) return unauthorized();
  const { id } = await params;
  const body = await req.json();
  const updated = await onboardingsStore.update(id, { ...body, updatedAt: new Date().toISOString() });
  if (!updated) return notFound("Onboarding not found");
  return ok(updated);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = getAuthFromRequest(req);
  if (!auth || !["super_admin", "admin"].includes(auth.role)) return unauthorized();
  const { id } = await params;
  const onboarding = await onboardingsStore.getById(id);
  if (!onboarding) return notFound("Onboarding not found");
  await logAuditEvent({ onboardingId: id, event: "deleted", performedBy: { type: "hr", id: auth.userId } });
  await onboardingsStore.delete(id);
  return ok({ deleted: true });
}

