import { NextRequest } from "next/server";
import { companiesStore } from "@/lib/store";
import { getAuthFromRequest, unauthorized, forbidden, ok, notFound, isSuperAdmin } from "@/lib/api-helpers";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = getAuthFromRequest(req);
  if (!auth) return unauthorized();
  if (!isSuperAdmin(auth)) return forbidden();
  const { id } = await params;
  const company = await companiesStore.getById(id);
  if (!company) return notFound("Company not found");
  return ok(company);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = getAuthFromRequest(req);
  if (!auth) return unauthorized();
  if (!isSuperAdmin(auth)) return forbidden();
  const { id } = await params;
  const body = await req.json();
  const updated = await companiesStore.update(id, { ...body, updatedAt: new Date().toISOString() });
  if (!updated) return notFound("Company not found");
  return ok(updated);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = getAuthFromRequest(req);
  if (!auth) return unauthorized();
  if (!isSuperAdmin(auth)) return forbidden();
  const { id } = await params;
  const deleted = await companiesStore.delete(id);
  if (!deleted) return notFound("Company not found");
  return ok({ deleted: true });
}
