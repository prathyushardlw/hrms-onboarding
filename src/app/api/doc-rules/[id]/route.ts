import { NextRequest } from "next/server";
import { docRulesStore } from "@/lib/store";
import { getAuthFromRequest, unauthorized, forbidden, badRequest, notFound, ok } from "@/lib/api-helpers";

type Params = { params: Promise<{ id: string }> };

export async function PUT(req: NextRequest, { params }: Params) {
  const auth = getAuthFromRequest(req);
  if (!auth || !["super_admin", "admin"].includes(auth.role)) return unauthorized();

  const { id } = await params;
  const rule = docRulesStore.getById(id);
  if (!rule) return notFound("Doc rule not found");
  if (auth.role !== "super_admin" && !auth.companyIds.includes(rule.companyId)) return forbidden();

  const body = await req.json();
  if (!Array.isArray(body.requiredDocuments) || !Array.isArray(body.optionalDocuments)) {
    return badRequest("requiredDocuments and optionalDocuments must be arrays");
  }

  const updated = docRulesStore.update(id, {
    requiredDocuments: body.requiredDocuments,
    optionalDocuments: body.optionalDocuments,
    updatedAt: new Date().toISOString(),
  });

  return ok(updated);
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const auth = getAuthFromRequest(req);
  if (!auth || !["super_admin", "admin"].includes(auth.role)) return unauthorized();

  const { id } = await params;
  const rule = docRulesStore.getById(id);
  if (!rule) return notFound("Doc rule not found");
  if (auth.role !== "super_admin" && !auth.companyIds.includes(rule.companyId)) return forbidden();

  docRulesStore.delete(id);
  return ok({ id });
}
