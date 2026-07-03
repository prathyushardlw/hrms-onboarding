import { NextRequest } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { offersStore, candidatesStore } from "@/lib/store";
import { getAuthFromRequest, unauthorized, badRequest, ok, created, notFound } from "@/lib/api-helpers";
import type { OfferLetter } from "@/lib/types";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = getAuthFromRequest(req);
  if (!auth) return unauthorized();
  const { id: candidateId } = await params;
  const offers = await offersStore.find((o) => o.candidateId === candidateId);
  return ok(offers[0] ?? null);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = getAuthFromRequest(req);
  if (!auth || !["super_admin", "admin", "hr"].includes(auth.role)) return unauthorized();
  const { id: candidateId } = await params;

  const candidate = await candidatesStore.getById(candidateId);
  if (!candidate) return notFound("Candidate not found");

  const body = await req.json();
  const { designation, department, ctc, joiningDate, additionalTerms } = body;
  if (!designation?.trim()) return badRequest("Designation is required");
  if (!ctc?.trim()) return badRequest("CTC is required");
  if (!joiningDate) return badRequest("Joining date is required");

  const now = new Date().toISOString();
  const offer: OfferLetter = {
    id: uuidv4(),
    candidateId,
    jobId: candidate.jobId,
    companyId: candidate.companyId,
    designation: designation.trim(),
    department: department?.trim() ?? "",
    ctc: ctc.trim(),
    joiningDate,
    additionalTerms: additionalTerms?.trim() || undefined,
    status: "draft",
    createdAt: now,
    updatedAt: now,
  };

  await offersStore.create(offer);
  await candidatesStore.update(candidateId, { status: "offered", updatedAt: now });
  return created(offer);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = getAuthFromRequest(req);
  if (!auth || !["super_admin", "admin", "hr"].includes(auth.role)) return unauthorized();
  const { id: candidateId } = await params;
  const body = await req.json();
  const offers = await offersStore.find((o) => o.candidateId === candidateId);
  if (!offers[0]) return notFound("Offer not found");
  const updated = await offersStore.update(offers[0].id, { ...body, updatedAt: new Date().toISOString() });
  return ok(updated);
}

