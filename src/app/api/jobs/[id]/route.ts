import { NextRequest } from "next/server";
import { jobsStore, candidatesStore } from "@/lib/store";
import { getAuthFromRequest, unauthorized, forbidden, badRequest, notFound, ok } from "@/lib/api-helpers";

type Params = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  const auth = getAuthFromRequest(req);
  if (!auth) return unauthorized();

  const { id } = await params;
  const job = jobsStore.getById(id);
  if (!job) return notFound("Job not found");

  // scope check
  if (auth.role !== "super_admin" && !auth.companyIds.includes(job.companyId)) return forbidden();

  return ok(job);
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const auth = getAuthFromRequest(req);
  if (!auth || !["super_admin", "admin", "hr"].includes(auth.role)) return unauthorized();

  const { id } = await params;
  const job = jobsStore.getById(id);
  if (!job) return notFound("Job not found");
  if (auth.role !== "super_admin" && !auth.companyIds.includes(job.companyId)) return forbidden();

  const body = await req.json();
  const allowed = ["title", "department", "employmentType", "location", "description", "requiredSkills", "status"];
  const updates: Record<string, unknown> = { updatedAt: new Date().toISOString() };
  for (const key of allowed) {
    if (body[key] !== undefined) updates[key] = body[key];
  }

  if (updates.status && !["draft", "open", "closed"].includes(updates.status as string)) {
    return badRequest("Invalid status");
  }

  return ok(jobsStore.update(id, updates));
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const auth = getAuthFromRequest(req);
  if (!auth || !["super_admin", "admin"].includes(auth.role)) return unauthorized();

  const { id } = await params;
  const job = jobsStore.getById(id);
  if (!job) return notFound("Job not found");
  if (auth.role !== "super_admin" && !auth.companyIds.includes(job.companyId)) return forbidden();

  // remove all candidates for this job too
  candidatesStore.find((c) => c.jobId === id).forEach((c) => candidatesStore.delete(c.id));
  jobsStore.delete(id);
  return ok({ deleted: true });
}
