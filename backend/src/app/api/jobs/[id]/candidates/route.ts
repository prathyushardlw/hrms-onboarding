import { NextRequest } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { candidatesStore, jobsStore } from "@/lib/store";
import { getAuthFromRequest, unauthorized, badRequest, ok, created, notFound } from "@/lib/api-helpers";
import type { Candidate } from "@/lib/types";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = getAuthFromRequest(req);
  if (!auth) return unauthorized();
  const { id: jobId } = await params;
  const candidates = await candidatesStore.find((c) => c.jobId === jobId);
  candidates.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return ok(candidates);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = getAuthFromRequest(req);
  if (!auth || !["super_admin", "admin", "hr"].includes(auth.role)) return unauthorized();
  const { id: jobId } = await params;
  const job = await jobsStore.getById(jobId);
  if (!job) return notFound("Job not found");

  const ct = req.headers.get("content-type") ?? "";
  let name: string | undefined, email: string | undefined, phone: string | undefined,
      source: string | undefined, currentCompany: string | undefined, currentDesignation: string | undefined,
      expectedSalary: string | undefined, noticePeriod: string | undefined,
      linkedinUrl: string | undefined, portfolioUrl: string | undefined, notes: string | undefined;

  if (ct.includes("application/json")) {
    const body = await req.json();
    ({ name, email, phone, source, currentCompany, currentDesignation, expectedSalary, noticePeriod, linkedinUrl, portfolioUrl, notes } = body);
  } else {
    const fd = await req.formData();
    const g = (k: string) => fd.get(k)?.toString() || undefined;
    name = g("name"); email = g("email"); phone = g("phone"); source = g("source");
    currentCompany = g("currentCompany"); currentDesignation = g("currentDesignation");
    expectedSalary = g("expectedSalary"); noticePeriod = g("noticePeriod");
    linkedinUrl = g("linkedinUrl"); portfolioUrl = g("portfolioUrl"); notes = g("notes");
  }
  if (!name?.trim()) return badRequest("Candidate name is required");
  if (!email?.trim()) return badRequest("Email is required");

  const now = new Date().toISOString();
  const candidate: Candidate = {
    id: uuidv4(),
    jobId,
    companyId: job.companyId,
    name: name.trim(),
    email: email.trim(),
    phone: phone?.trim() || undefined,
    source: source || "other",
    currentCompany: currentCompany?.trim() || undefined,
    currentDesignation: currentDesignation?.trim() || undefined,
    expectedSalary: expectedSalary?.trim() || undefined,
    noticePeriod: noticePeriod?.trim() || undefined,
    linkedinUrl: linkedinUrl?.trim() || undefined,
    portfolioUrl: portfolioUrl?.trim() || undefined,
    notes: notes?.trim() || undefined,
    status: "new",
    createdAt: now,
    updatedAt: now,
  };

  await candidatesStore.create(candidate);
  return created(candidate);
}
