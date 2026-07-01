import { NextRequest } from "next/server";
import { interviewsStore, candidatesStore } from "@/lib/store";
import {
  getAuthFromRequest, unauthorized, forbidden, badRequest, notFound, ok,
} from "@/lib/api-helpers";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  const auth = getAuthFromRequest(req);
  if (!auth || !["super_admin", "admin", "hr"].includes(auth.role)) return unauthorized();

  const { id } = await params;
  const round = interviewsStore.getById(id);
  if (!round) return notFound("Interview round not found");

  const candidate = candidatesStore.getById(round.candidateId);
  if (!candidate) return notFound("Candidate not found");
  if (auth.role !== "super_admin" && !auth.companyIds.includes(round.companyId)) return forbidden();

  const body = await req.json();
  const updates: Record<string, unknown> = { updatedAt: new Date().toISOString() };

  if (body.roundName !== undefined) updates.roundName = body.roundName.trim();
  if (body.interviewerName !== undefined) updates.interviewerName = body.interviewerName.trim();
  if (body.scheduledAt !== undefined) updates.scheduledAt = body.scheduledAt;
  if (body.meetingType !== undefined) {
    const valid = ["google_meet", "zoom", "teams", "in_person", null, ""];
    if (!valid.includes(body.meetingType)) return badRequest("Invalid meeting type");
    updates.meetingType = body.meetingType || undefined;
  }
  if (body.meetingLink !== undefined) updates.meetingLink = body.meetingLink?.trim() || undefined;
  if (body.status !== undefined) {
    if (!["scheduled", "completed", "cancelled"].includes(body.status)) return badRequest("Invalid status");
    updates.status = body.status;
  }
  if (body.rating !== undefined) {
    const r = Number(body.rating);
    if (r < 1 || r > 5) return badRequest("Rating must be 1–5");
    updates.rating = r;
  }
  if (body.recommendation !== undefined) {
    if (!["proceed", "hold", "reject"].includes(body.recommendation)) return badRequest("Invalid recommendation");
    updates.recommendation = body.recommendation;
  }
  if (body.feedback !== undefined) updates.feedback = body.feedback;

  return ok(interviewsStore.update(id, updates));
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const auth = getAuthFromRequest(req);
  if (!auth || !["super_admin", "admin", "hr"].includes(auth.role)) return unauthorized();

  const { id } = await params;
  const round = interviewsStore.getById(id);
  if (!round) return notFound("Interview round not found");
  if (auth.role !== "super_admin" && !auth.companyIds.includes(round.companyId)) return forbidden();

  interviewsStore.delete(id);
  return ok({ deleted: true });
}
