import { NextRequest } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { interviewsStore, candidatesStore } from "@/lib/store";
import { sendEmail } from "@/lib/email";
import { getAuthFromRequest, unauthorized, badRequest, ok, created, notFound } from "@/lib/api-helpers";
import type { InterviewRound } from "@/lib/types";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = getAuthFromRequest(req);
  if (!auth) return unauthorized();
  const { id: candidateId } = await params;
  const rounds = await interviewsStore.find((r) => r.candidateId === candidateId);
  rounds.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  return ok(rounds);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = getAuthFromRequest(req);
  if (!auth || !["super_admin", "admin", "hr"].includes(auth.role)) return unauthorized();
  const { id: candidateId } = await params;

  const candidate = await candidatesStore.getById(candidateId);
  if (!candidate) return notFound("Candidate not found");

  const body = await req.json();
  const { roundName, interviewerName, scheduledAt, meetingType, meetingLink } = body;
  if (!roundName?.trim()) return badRequest("Round name is required");
  if (!interviewerName?.trim()) return badRequest("Interviewer name is required");

  const now = new Date().toISOString();
  const round: InterviewRound = {
    id: uuidv4(),
    candidateId,
    jobId: candidate.jobId,
    companyId: candidate.companyId,
    roundName: roundName.trim(),
    interviewerName: interviewerName.trim(),
    scheduledAt: scheduledAt || undefined,
    meetingType: meetingType || undefined,
    meetingLink: meetingLink || undefined,
    status: "scheduled",
    createdAt: now,
    updatedAt: now,
  };

  await interviewsStore.create(round);

  // Attempt to send interview invitation if scheduled
  let emailSent = false;
  if (round.scheduledAt && candidate.email) {
    const dateStr = new Date(round.scheduledAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
    const meetingInfo = round.meetingLink ? `<p>Meeting Link: <a href="${round.meetingLink}">${round.meetingLink}</a></p>` : "";
    emailSent = await sendEmail({
      to: candidate.email,
      toName: candidate.name,
      subject: `Interview Scheduled: ${round.roundName}`,
      html: `<p>Dear ${candidate.name},</p>
<p>Your <strong>${round.roundName}</strong> interview has been scheduled.</p>
<p><strong>Date &amp; Time:</strong> ${dateStr}</p>
<p><strong>Interviewer:</strong> ${round.interviewerName}</p>
${meetingInfo}
<p>Best of luck!</p>`,
    });
    if (emailSent) {
      await interviewsStore.update(round.id, { emailSent: true, updatedAt: now });
      round.emailSent = true;
    }
  }

  return created(round);
}

