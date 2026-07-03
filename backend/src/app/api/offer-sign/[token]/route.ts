import { NextRequest } from "next/server";
import { offersStore, candidatesStore } from "@/lib/store";
import { ok, notFound, badRequest } from "@/lib/api-helpers";

async function getOfferByToken(signToken: string) {
  const offers = await offersStore.find((o) => o.signToken === signToken);
  return offers[0] ?? null;
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const offer = await getOfferByToken(token);
  if (!offer) return notFound("Invalid or expired offer link");

  const candidate = await candidatesStore.getById(offer.candidateId);
  return ok({
    offer: {
      designation: offer.designation,
      department: offer.department,
      ctc: offer.ctc,
      joiningDate: offer.joiningDate,
      additionalTerms: offer.additionalTerms,
      status: offer.status,
      signedAt: offer.signedAt,
    },
    candidate: {
      name: candidate?.name ?? "",
      email: candidate?.email ?? "",
    },
  });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const offer = await getOfferByToken(token);
  if (!offer) return notFound("Invalid or expired offer link");

  if (offer.signedAt) return badRequest("Offer already signed");

  const body = await req.json();
  const { signatureDataUrl } = body;
  if (!signatureDataUrl) return badRequest("Signature required");

  const now = new Date().toISOString();
  const ip = req.headers.get("x-forwarded-for") ?? req.headers.get("x-real-ip") ?? "";
  const ua = req.headers.get("user-agent") ?? "";

  await offersStore.update(offer.id, {
    status: "signed",
    signedAt: now,
    signerIp: ip,
    signerAgent: ua,
    updatedAt: now,
  });

  return ok({ signedAt: now });
}


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
