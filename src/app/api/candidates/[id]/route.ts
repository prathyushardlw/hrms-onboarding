import { NextRequest } from "next/server";
import { candidatesStore } from "@/lib/store";
import { getAuthFromRequest, unauthorized, ok, notFound } from "@/lib/api-helpers";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = getAuthFromRequest(req);
  if (!auth) return unauthorized();
  const { id } = await params;
  const candidate = await candidatesStore.getById(id);
  if (!candidate) return notFound("Candidate not found");
  return ok(candidate);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = getAuthFromRequest(req);
  if (!auth || !["super_admin", "admin", "hr"].includes(auth.role)) return unauthorized();
  const { id } = await params;
  const body = await req.json();
  const updated = await candidatesStore.update(id, { ...body, updatedAt: new Date().toISOString() });
  if (!updated) return notFound("Candidate not found");
  return ok(updated);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = getAuthFromRequest(req);
  if (!auth || !["super_admin", "admin", "hr"].includes(auth.role)) return unauthorized();
  const { id } = await params;
  const deleted = await candidatesStore.delete(id);
  if (!deleted) return notFound("Candidate not found");
  return ok({ deleted: true });
}

