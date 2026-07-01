import { NextRequest } from "next/server";
import { onboardingsStore, companiesStore } from "@/lib/store";
import { sendEmail, buildReminderEmail } from "@/lib/email";
import { getAuthFromRequest, unauthorized, ok, notFound, badRequest } from "@/lib/api-helpers";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = getAuthFromRequest(req);
  if (!auth || !["super_admin", "admin", "hr"].includes(auth.role)) return unauthorized();

  const { id } = await params;
  const onboarding = onboardingsStore.getById(id);
  if (!onboarding) return notFound("Onboarding not found");

  const REMINDABLE = ["sent", "in_progress", "submitted"];
  if (!REMINDABLE.includes(onboarding.status)) {
    return badRequest(`Cannot send reminder for onboarding in '${onboarding.status}' status`);
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const onboardingLink = `${appUrl}/onboard/${onboarding.accessToken}`;

  const company = companiesStore.getById(onboarding.companyId);
  const companyName = company?.name || "the company";

  const { subject, html } = buildReminderEmail(
    onboarding.candidate.name,
    onboardingLink,
    companyName
  );

  const emailSent = await sendEmail({
    to: onboarding.candidate.email,
    toName: onboarding.candidate.name,
    subject,
    html,
  }).catch(() => false);

  onboardingsStore.update(id, {
    lastReminderSent: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  return ok({ emailSent, message: emailSent ? "Reminder sent" : "Email unavailable — check SMTP config" });
}
