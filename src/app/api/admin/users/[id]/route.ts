import { NextRequest } from "next/server";
import { usersStore } from "@/lib/store";
import { getAuthFromRequest, unauthorized, forbidden, ok, notFound, isSuperAdmin } from "@/lib/api-helpers";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = getAuthFromRequest(req);
  if (!auth) return unauthorized();
  if (!isSuperAdmin(auth)) return forbidden();
  const { id } = await params;
  const user = await usersStore.getById(id);
  if (!user) return notFound("User not found");
  const { passwordHash: _, ...safe } = user;
  return ok(safe);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = getAuthFromRequest(req);
  if (!auth) return unauthorized();
  if (!isSuperAdmin(auth)) return forbidden();
  const { id } = await params;
  const body = await req.json();
  const { password, ...rest } = body;
  const updates: Record<string, unknown> = { ...rest, updatedAt: new Date().toISOString() };
  if (password) {
    const { hashPassword } = await import("@/lib/auth");
    updates.passwordHash = await hashPassword(password);
  }
  const updated = await usersStore.update(id, updates);
  if (!updated) return notFound("User not found");
  const { passwordHash: _, ...safe } = updated;
  return ok(safe);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = getAuthFromRequest(req);
  if (!auth) return unauthorized();
  if (!isSuperAdmin(auth)) return forbidden();
  const { id } = await params;
  const deleted = await usersStore.delete(id);
  if (!deleted) return notFound("User not found");
  return ok({ deleted: true });
}
