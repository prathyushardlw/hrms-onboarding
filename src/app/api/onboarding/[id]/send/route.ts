import { NextRequest } from "next/server";
import { onboardingsStore, companiesStore } from "@/lib/store";
import { logAuditEvent } from "@/lib/audit";
import { sendEmail, buildOnboardingEmail } from "@/lib/email";
import { getAuthFromRequest, unauthorized, ok, notFound } from "@/lib/api-helpers";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = getAuthFromRequest(req);
  if (!auth || !["super_admin", "admin", "hr"].includes(auth.role)) return unauthorized();
  const { id } = await params;
  const onboarding = await onboardingsStore.getById(id);
  if (!onboarding) return notFound("Onboarding not found");

  const base = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
  const link = `${base}/onboard/${onboarding.accessToken}`;
  const shortLink = `${base}/r/${onboarding.id}`;

  const company = await companiesStore.getById(onboarding.companyId);
  const companyName = company?.name ?? "Company";
  const { subject, html } = buildOnboardingEmail(onboarding.candidate.name, link, companyName);

  const emailSent = await sendEmail({
    to: onboarding.candidate.email,
    toName: onboarding.candidate.name,
    subject,
    html,
  });

  const now = new Date().toISOString();
  if (onboarding.status === "initiated") {
    await onboardingsStore.update(id, { status: "sent", updatedAt: now });
  }

  await logAuditEvent({ onboardingId: id, event: "sent", performedBy: { type: "hr", id: auth.userId } });

  return ok({
    link,
    shortLink,
    emailSent,
    compose: emailSent ? null : {
      to: onboarding.candidate.email,
      candidateName: onboarding.candidate.name,
      subject,
    },
  });
}
