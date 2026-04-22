import { NextRequest } from "next/server";
import { onboardingsStore, companiesStore } from "@/lib/store";
import { logAuditEvent } from "@/lib/audit";
import { sendEmail, buildOnboardingEmail } from "@/lib/email";
import { getAuthFromRequest, unauthorized, ok, notFound, badRequest } from "@/lib/api-helpers";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = getAuthFromRequest(req);
  if (!auth || !["admin", "hr"].includes(auth.role)) return unauthorized();

  const { id } = await params;
  const onboarding = onboardingsStore.getById(id);
  if (!onboarding) return notFound("Onboarding not found");

  if (onboarding.status !== "initiated") {
    return badRequest("Onboarding package has already been sent");
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const onboardingLink = `${appUrl}/onboard/${onboarding.accessToken}`;

  const company = companiesStore.getById(onboarding.companyId);
  const companyName = company?.name || "the company";

  const { subject, html } = buildOnboardingEmail(
    onboarding.candidate.name,
    onboardingLink,
    companyName
  );

  let emailSent = false;
  try {
    emailSent = await sendEmail({
      to: onboarding.candidate.email,
      subject,
      html,
    });
  } catch (err) {
    console.error("SMTP send failed, falling back to web compose:", err);
  }

  onboardingsStore.update(id, {
    status: "sent",
    updatedAt: new Date().toISOString(),
  });

  logAuditEvent({
    onboardingId: id,
    event: "sent",
    performedBy: { type: "hr", id: auth.userId },
    metadata: { email: onboarding.candidate.email },
  });

  return ok({
    message: emailSent
      ? "Onboarding package sent via email"
      : "Email service unavailable — use the compose link to send manually",
    link: onboardingLink,
    shortLink: `${appUrl}/r/${id}`,
    emailSent,
    compose: {
      to: onboarding.candidate.email,
      subject,
      candidateName: onboarding.candidate.name,
      companyName,
    },
  });
}
