import { NextRequest } from "next/server";
import { onboardingsStore, companiesStore } from "@/lib/store";
import { logAuditEvent } from "@/lib/audit";
import { sendEmail, buildCorrectionEmail } from "@/lib/email";
import { correctionRequestSchema } from "@/lib/validations";
import { getAuthFromRequest, unauthorized, ok, notFound, badRequest } from "@/lib/api-helpers";
import type { OnboardingDocument } from "@/lib/types";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = getAuthFromRequest(req);
  if (!auth || !["admin", "hr"].includes(auth.role)) return unauthorized();

  const { id } = await params;
  const onboarding = onboardingsStore.getById(id);
  if (!onboarding) return notFound("Onboarding not found");

  try {
    const body = await req.json();
    const parsed = correctionRequestSchema.safeParse(body);
    if (!parsed.success) {
      return badRequest(parsed.error.issues[0].message);
    }

    const { documentIds, note } = parsed.data;

    const updatedDocs = onboarding.documents.map((doc: OnboardingDocument) =>
      documentIds.includes(doc.id)
        ? { ...doc, status: "correction_requested" as const, correctionNote: note }
        : doc
    );

    onboardingsStore.update(id, {
      documents: updatedDocs,
      status: "in_progress",
      updatedAt: new Date().toISOString(),
    });

    const documentNames = onboarding.documents
      .filter((d: OnboardingDocument) => documentIds.includes(d.id))
      .map((d: OnboardingDocument) => d.name);

    logAuditEvent({
      onboardingId: id,
      event: "correction_requested",
      performedBy: { type: "hr", id: auth.userId },
      metadata: { documentIds, documentNames, note },
    });

    // Send correction email to candidate
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const onboardingLink = `${appUrl}/onboard/${onboarding.accessToken}`;
    const company = companiesStore.getById(onboarding.companyId);
    const companyName = company?.name || "the company";

    const { subject, html } = buildCorrectionEmail(
      onboarding.candidate.name,
      documentNames,
      note,
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
      console.error("SMTP send failed for correction email:", err);
    }

    return ok({
      message: "Correction requested",
      emailSent,
      compose: emailSent ? undefined : {
        to: onboarding.candidate.email,
        subject,
        candidateName: onboarding.candidate.name,
        documentNames,
        note,
        link: `${appUrl}/r/${id}`,
        companyName,
      },
    });
  } catch (error) {
    return badRequest((error as Error).message);
  }
}
