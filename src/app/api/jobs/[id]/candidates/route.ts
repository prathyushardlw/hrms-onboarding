import { NextRequest } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { jobsStore, candidatesStore, saveResumeFile } from "@/lib/store";
import { getAuthFromRequest, unauthorized, forbidden, badRequest, notFound, ok, created } from "@/lib/api-helpers";
import type { Candidate } from "@/lib/types";

type Params = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  const auth = getAuthFromRequest(req);
  if (!auth) return unauthorized();

  const { id: jobId } = await params;
  const job = jobsStore.getById(jobId);
  if (!job) return notFound("Job not found");
  if (auth.role !== "super_admin" && !auth.companyIds.includes(job.companyId)) return forbidden();

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");

  let candidates = candidatesStore.find((c) => c.jobId === jobId);
  if (status) candidates = candidates.filter((c) => c.status === status);
  candidates.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return ok(candidates);
}

export async function POST(req: NextRequest, { params }: Params) {
  const auth = getAuthFromRequest(req);
  if (!auth || !["super_admin", "admin", "hr"].includes(auth.role)) return unauthorized();

  const { id: jobId } = await params;
  const job = jobsStore.getById(jobId);
  if (!job) return notFound("Job not found");
  if (auth.role !== "super_admin" && !auth.companyIds.includes(job.companyId)) return forbidden();

  const formData = await req.formData();

  const name = (formData.get("name") as string)?.trim();
  const email = (formData.get("email") as string)?.trim();
  if (!name) return badRequest("Candidate name is required");
  if (!email) return badRequest("Candidate email is required");

  const now = new Date().toISOString();
  const candidateId = uuidv4();

  // Handle resume upload
  let resumeFileName: string | undefined;
  const resumeFile = formData.get("resume") as File | null;
  if (resumeFile && resumeFile.size > 0) {
    const ext = resumeFile.name.split(".").pop() ?? "pdf";
    resumeFileName = `resume_${Date.now()}.${ext}`;
    const buffer = Buffer.from(await resumeFile.arrayBuffer());
    saveResumeFile(candidateId, resumeFileName, buffer);
  }

  const candidate: Candidate = {
    id: candidateId,
    jobId,
    companyId: job.companyId,
    name,
    email,
    phone: (formData.get("phone") as string) || undefined,
    source: (formData.get("source") as Candidate["source"]) ?? "other",
    resumeFileName,
    currentCompany: (formData.get("currentCompany") as string) || undefined,
    currentDesignation: (formData.get("currentDesignation") as string) || undefined,
    expectedSalary: (formData.get("expectedSalary") as string) || undefined,
    noticePeriod: (formData.get("noticePeriod") as string) || undefined,
    linkedinUrl: (formData.get("linkedinUrl") as string) || undefined,
    portfolioUrl: (formData.get("portfolioUrl") as string) || undefined,
    status: "new",
    notes: (formData.get("notes") as string) || undefined,
    createdAt: now,
    updatedAt: now,
  };

  candidatesStore.create(candidate);
  return created(candidate);
}
