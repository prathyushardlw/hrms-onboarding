import { NextRequest } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { candidatesStore, interviewsStore, jobsStore, companiesStore } from "@/lib/store";
import {
  getAuthFromRequest, unauthorized, forbidden, badRequest, notFound, ok, created,
} from "@/lib/api-helpers";
import { sendEmail, buildInterviewInvitationEmail } from "@/lib/email";
import type { InterviewRound } from "@/lib/types";

type Params = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  const auth = getAuthFromRequest(req);
  if (!auth) return unauthorized();
  const { id: candidateId } = await params;
  const candidate = candidatesStore.getById(candidateId);
  if (!candidate) return notFound("Candidate not found");
  if (auth.role !== "super_admin" && !auth.companyIds.includes(candidate.companyId)) return forbidden();

  const rounds = interviewsStore.find((i) => i.candidateId === candidateId);
  rounds.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  return ok(rounds);
}

export async function POST(req: NextRequest, { params }: Params) {
  const auth = getAuthFromRequest(req);
  if (!auth || !["super_admin", "admin", "hr"].includes(auth.role)) return unauthorized();
  const { id: candidateId } = await params;
  const candidate = candidatesStore.getById(candidateId);
  if (!candidate) return notFound("Candidate not found");
  if (auth.role !== "super_admin" && !auth.companyIds.includes(candidate.companyId)) return forbidden();

  const body = await req.json();
  if (!body.roundName?.trim()) return badRequest("Round name is required");
  if (!body.interviewerName?.trim()) return badRequest("Interviewer name is required");

  const VIRTUAL_TYPES = ["google_meet", "zoom", "teams"];
  if (body.meetingType && VIRTUAL_TYPES.includes(body.meetingType) && !body.meetingLink?.trim()) {
    return badRequest("Meeting link is required for virtual meetings");
  }

  const now = new Date().toISOString();
  const round: InterviewRound = {
    id: uuidv4(),
    candidateId,
    jobId: candidate.jobId,
    companyId: candidate.companyId,
    roundName: body.roundName.trim(),
    interviewerName: body.interviewerName.trim(),
    scheduledAt: body.scheduledAt ?? undefined,
    meetingType: body.meetingType ?? undefined,
    meetingLink: body.meetingLink?.trim() ?? undefined,
    status: "scheduled",
    createdAt: now,
    updatedAt: now,
  };

  interviewsStore.create(round);

  // Send invitation email if a scheduled time is provided
  let emailSent = false;
  if (round.scheduledAt) {
    const job = jobsStore.getById(candidate.jobId);
    const company = companiesStore.getById(candidate.companyId);
    const { subject, html } = buildInterviewInvitationEmail({
      candidateName: candidate.name,
      jobTitle: job?.title ?? "the position",
      roundName: round.roundName,
      interviewerName: round.interviewerName,
      scheduledAt: round.scheduledAt,
      meetingType: round.meetingType,
      meetingLink: round.meetingLink,
      companyName: company?.name ?? "the company",
    });
    emailSent = await sendEmail({ to: candidate.email, toName: candidate.name, subject, html }).catch((err) => {
      console.error("Interview invitation email failed:", err);
      return false;
    });
    console.log(`Interview invitation email to ${candidate.email}: ${emailSent ? "sent" : "failed"}`);
  }

  return created({ ...round, emailSent });
}
