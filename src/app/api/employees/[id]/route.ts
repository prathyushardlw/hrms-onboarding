import { NextRequest } from "next/server";
import { employeesStore } from "@/lib/store";
import { getAuthFromRequest, unauthorized, ok, notFound } from "@/lib/api-helpers";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = getAuthFromRequest(req);
  if (!auth) return unauthorized();
  const { id } = await params;
  const employee = await employeesStore.getById(id);
  if (!employee) return notFound("Employee not found");
  return ok(employee);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = getAuthFromRequest(req);
  if (!auth || !["super_admin", "admin", "hr"].includes(auth.role)) return unauthorized();
  const { id } = await params;
  const body = await req.json();
  const updated = await employeesStore.update(id, { ...body, updatedAt: new Date().toISOString() });
  if (!updated) return notFound("Employee not found");
  return ok(updated);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = getAuthFromRequest(req);
  if (!auth || !["super_admin", "admin"].includes(auth.role)) return unauthorized();
  const { id } = await params;
  const deleted = await employeesStore.delete(id);
  if (!deleted) return notFound("Employee not found");
  return ok({ deleted: true });
}

