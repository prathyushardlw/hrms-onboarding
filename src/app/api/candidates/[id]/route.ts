import { NextRequest } from "next/server";
import { candidatesStore, jobsStore } from "@/lib/store";
import { getAuthFromRequest, unauthorized, forbidden, notFound, badRequest, ok } from "@/lib/api-helpers";

type Params = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  const auth = getAuthFromRequest(req);
  if (!auth) return unauthorized();

  const { id } = await params;
  const candidate = candidatesStore.getById(id);
  if (!candidate) return notFound("Candidate not found");

  if (auth.role !== "super_admin" && !auth.companyIds.includes(candidate.companyId)) return forbidden();
  return ok(candidate);
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const auth = getAuthFromRequest(req);
  if (!auth || !["super_admin", "admin", "hr"].includes(auth.role)) return unauthorized();

  const { id } = await params;
  const candidate = candidatesStore.getById(id);
  if (!candidate) return notFound("Candidate not found");
  if (auth.role !== "super_admin" && !auth.companyIds.includes(candidate.companyId)) return forbidden();

  const body = await req.json();
  const validStatuses = ["new", "shortlisted", "interview", "offered", "rejected"];
  const updates: Record<string, unknown> = { updatedAt: new Date().toISOString() };

  if (body.status !== undefined) {
    if (!validStatuses.includes(body.status)) return badRequest("Invalid status");
    updates.status = body.status;
  }
  if (body.notes !== undefined) updates.notes = body.notes;
  if (body.expectedSalary !== undefined) updates.expectedSalary = body.expectedSalary;
  if (body.noticePeriod !== undefined) updates.noticePeriod = body.noticePeriod;

  return ok(candidatesStore.update(id, updates));
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const auth = getAuthFromRequest(req);
  if (!auth || !["super_admin", "admin", "hr"].includes(auth.role)) return unauthorized();

  const { id } = await params;
  const candidate = candidatesStore.getById(id);
  if (!candidate) return notFound("Candidate not found");
  if (auth.role !== "super_admin" && !auth.companyIds.includes(candidate.companyId)) return forbidden();

  candidatesStore.delete(id);
  return ok({ deleted: true });
}
