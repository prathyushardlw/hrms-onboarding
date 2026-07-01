import { NextRequest } from "next/server";
import { companiesStore } from "@/lib/store";
import {
  getAuthFromRequest,
  unauthorized,
  forbidden,
  badRequest,
  notFound,
  ok,
  isSuperAdmin,
} from "@/lib/api-helpers";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = getAuthFromRequest(req);
  if (!auth) return unauthorized();
  if (!isSuperAdmin(auth)) return forbidden();

  const { id } = await params;
  const company = companiesStore.getById(id);
  if (!company) return notFound("Company not found");

  const body = await req.json();
  const updates: Partial<typeof company> = { updatedAt: new Date().toISOString() };
  if (body.name !== undefined) updates.name = body.name.trim();
  if (body.logo !== undefined) updates.logo = body.logo;
  if (body.isActive !== undefined) updates.isActive = Boolean(body.isActive);

  if (!updates.name && body.name !== undefined) return badRequest("Name cannot be empty");

  const updated = companiesStore.update(id, updates);
  return ok(updated);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = getAuthFromRequest(req);
  if (!auth) return unauthorized();
  if (!isSuperAdmin(auth)) return forbidden();

  const { id } = await params;
  const company = companiesStore.getById(id);
  if (!company) return notFound("Company not found");

  // Soft delete — set inactive instead of removing
  const updated = companiesStore.update(id, {
    isActive: false,
    updatedAt: new Date().toISOString(),
  });
  return ok(updated);
}
