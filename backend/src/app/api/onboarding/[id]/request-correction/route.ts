import { NextRequest } from "next/server";
import { onboardingsStore, companiesStore } from "@/lib/store";
import { logAuditEvent } from "@/lib/audit";
import { sendEmail } from "@/lib/email";
import { getAuthFromRequest, unauthorized, badRequest, ok, notFound } from "@/lib/api-helpers";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = getAuthFromRequest(req);
  if (!auth || !["super_admin", "admin", "hr"].includes(auth.role)) return unauthorized();
  const { id } = await params;
  const onboarding = await onboardingsStore.getById(id);
  if (!onboarding) return notFound("Onboarding not found");

  const body = await req.json();
  const { documentIds, note } = body;
  if (!Array.isArray(documentIds) || documentIds.length === 0) return badRequest("documentIds required");
  if (!note?.trim()) return badRequest("note is required");

  const now = new Date().toISOString();
  const updatedDocs = (onboarding.documents ?? []).map((d) =>
    documentIds.includes(d.id)
      ? { ...d, status: "correction_requested" as const, correctionNote: note.trim() }
      : d
  );

  await onboardingsStore.update(id, { documents: updatedDocs, status: "correction_requested", updatedAt: now });
  await logAuditEvent({ onboardingId: id, event: "correction_requested", performedBy: { type: "hr", id: auth.userId }, details: { documentIds, note } });

  const link = `${process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000"}/onboard/${onboarding.accessToken}`;
  const company = await companiesStore.getById(onboarding.companyId);
  const docNames = updatedDocs.filter((d) => documentIds.includes(d.id)).map((d) => d.name);

  let emailSent = false;
  emailSent = await sendEmail({
    to: onboarding.candidate.email,
    toName: onboarding.candidate.name,
    subject: "Action Required: Document Correction Requested",
    html: `<p>Dear ${onboarding.candidate.name},</p><p>Please correct the following document(s): ${docNames.join(", ")}.</p><p>Note: ${note}</p><p><a href="${link}">Review and resubmit</a></p>`,
  });

  return ok({
    emailSent,
    compose: {
      to: onboarding.candidate.email,
      candidateName: onboarding.candidate.name,
      companyName: company?.name ?? "",
      subject: "Action Required: Document Correction Requested",
      documentNames: docNames,
      note: note.trim(),
      link,
    },
  });
}
