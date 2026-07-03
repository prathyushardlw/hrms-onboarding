import { NextRequest } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { jobsStore } from "@/lib/store";
import { getAuthFromRequest, unauthorized, badRequest, ok, created, resolveCompanyId } from "@/lib/api-helpers";
import type { Job } from "@/lib/types";

export async function GET(req: NextRequest) {
  const auth = getAuthFromRequest(req);
  if (!auth) return unauthorized();

  const { searchParams } = new URL(req.url);
  const companyId = resolveCompanyId(auth, searchParams.get("companyId"));
  const status = searchParams.get("status");

  let jobs = await jobsStore.getAll();
  if (companyId) jobs = jobs.filter((j) => j.companyId === companyId);
  if (status) jobs = jobs.filter((j) => j.status === status);

  jobs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return ok(jobs);
}

export async function POST(req: NextRequest) {
  const auth = getAuthFromRequest(req);
  if (!auth || !["super_admin", "admin", "hr"].includes(auth.role)) return unauthorized();

  const body = await req.json();
  const { title, department, employmentType, location, description, requiredSkills, companyId } = body;

  if (!title?.trim()) return badRequest("Job title is required");
  if (!department?.trim()) return badRequest("Department is required");
  if (!location?.trim()) return badRequest("Location is required");

  const resolvedCompanyId = companyId ?? auth.activeCompanyId;
  if (!resolvedCompanyId) return badRequest("Company is required");

  const now = new Date().toISOString();
  const job: Job = {
    id: uuidv4(),
    companyId: resolvedCompanyId,
    title: title.trim(),
    department: department.trim(),
    employmentType: employmentType ?? "full-time",
    location: location.trim(),
    description: description?.trim() ?? "",
    requiredSkills: Array.isArray(requiredSkills) ? requiredSkills.filter(Boolean) : [],
    status: "open",
    createdBy: auth.userId,
    createdAt: now,
    updatedAt: now,
  };

  await jobsStore.create(job);
  return created(job);
}
