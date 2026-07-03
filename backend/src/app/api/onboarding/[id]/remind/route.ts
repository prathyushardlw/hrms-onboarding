import { NextRequest } from "next/server";
import { onboardingsStore } from "@/lib/store";
import { sendEmail } from "@/lib/email";
import { getAuthFromRequest, unauthorized, ok, notFound } from "@/lib/api-helpers";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = getAuthFromRequest(req);
  if (!auth || !["super_admin", "admin", "hr"].includes(auth.role)) return unauthorized();
  const { id } = await params;
  const onboarding = await onboardingsStore.getById(id);
  if (!onboarding) return notFound("Onboarding not found");

  const { candidate, accessToken } = onboarding;
  const link = `${process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000"}/onboard/${accessToken}`;

  const emailSent = await sendEmail({
    to: candidate.email,
    toName: candidate.name,
    subject: "Reminder: Complete Your Onboarding Documents",
    html: `<p>Dear ${candidate.name},</p><p>This is a friendly reminder to complete your onboarding documents.</p><p><a href="${link}">Click here to complete your onboarding</a></p>`,
  });

  return ok({ emailSent });
}
