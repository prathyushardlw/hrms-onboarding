import { NextRequest } from "next/server";
import { interviewsStore } from "@/lib/store";
import { getAuthFromRequest, unauthorized, ok, notFound } from "@/lib/api-helpers";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = getAuthFromRequest(req);
  if (!auth) return unauthorized();
  const { id } = await params;
  const interview = await interviewsStore.getById(id);
  if (!interview) return notFound("Interview not found");
  return ok(interview);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = getAuthFromRequest(req);
  if (!auth || !["super_admin", "admin", "hr"].includes(auth.role)) return unauthorized();
  const { id } = await params;
  const body = await req.json();
  const updated = await interviewsStore.update(id, { ...body, updatedAt: new Date().toISOString() });
  if (!updated) return notFound("Interview not found");
  return ok(updated);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = getAuthFromRequest(req);
  if (!auth || !["super_admin", "admin", "hr"].includes(auth.role)) return unauthorized();
  const { id } = await params;
  const deleted = await interviewsStore.delete(id);
  if (!deleted) return notFound("Interview not found");
  return ok({ deleted: true });
}

