import { NextRequest } from "next/server";
import { usersStore } from "@/lib/store";
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
  const user = usersStore.getById(id);
  if (!user) return notFound("User not found");

  const body = await req.json();
  const updates: Record<string, unknown> = { updatedAt: new Date().toISOString() };

  if (body.name !== undefined) updates.name = body.name.trim();
  if (body.companyIds !== undefined) {
    if (!Array.isArray(body.companyIds)) return badRequest("companyIds must be an array");
    updates.companyIds = body.companyIds;
  }
  if (body.role !== undefined) {
    const validRoles = ["admin", "hr", "viewer"];
    if (!validRoles.includes(body.role)) return badRequest("Invalid role");
    updates.role = body.role;
  }

  const updated = usersStore.update(id, updates);
  const { passwordHash: _, ...safe } = updated!;
  return ok(safe);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = getAuthFromRequest(req);
  if (!auth) return unauthorized();
  if (!isSuperAdmin(auth)) return forbidden();

  const { id } = await params;
  if (!usersStore.getById(id)) return notFound("User not found");

  usersStore.delete(id);
  return ok({ deleted: true });
}
