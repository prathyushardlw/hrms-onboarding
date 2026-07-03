import { NextRequest } from "next/server";
import { templatesStore } from "@/lib/store";
import { getAuthFromRequest, unauthorized, ok, notFound } from "@/lib/api-helpers";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = getAuthFromRequest(req);
  if (!auth) return unauthorized();
  const { id } = await params;
  const template = await templatesStore.getById(id);
  if (!template) return notFound("Template not found");
  return ok(template);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = getAuthFromRequest(req);
  if (!auth || !["super_admin", "admin", "hr"].includes(auth.role)) return unauthorized();
  const { id } = await params;
  const body = await req.json();
  const updated = await templatesStore.update(id, { ...body, updatedAt: new Date().toISOString() });
  if (!updated) return notFound("Template not found");
  return ok(updated);
}

export { PATCH as PUT };

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = getAuthFromRequest(req);
  if (!auth || !["super_admin", "admin"].includes(auth.role)) return unauthorized();
  const { id } = await params;
  // Soft-delete by deactivating
  const updated = await templatesStore.update(id, { isActive: false, updatedAt: new Date().toISOString() });
  if (!updated) return notFound("Template not found");
  return ok({ deleted: true });
}
