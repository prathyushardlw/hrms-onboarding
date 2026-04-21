import { NextRequest } from "next/server";
import { onboardingsStore } from "@/lib/store";
import { logAuditEvent } from "@/lib/audit";
import { ok, notFound, badRequest } from "@/lib/api-helpers";

function getOnboardingByToken(token: string) {
  const results = onboardingsStore.find((o) => o.accessToken === token);
  if (results.length === 0) return null;
  const onboarding = results[0];

  if (new Date(onboarding.tokenExpiresAt) < new Date()) return null;

  return onboarding;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const onboarding = getOnboardingByToken(token);
  if (!onboarding) return notFound("Invalid or expired onboarding link");

  logAuditEvent({
    onboardingId: onboarding.id,
    event: "link_opened",
    performedBy: { type: "candidate" },
    ipAddress: req.headers.get("x-forwarded-for") || undefined,
    userAgent: req.headers.get("user-agent") || undefined,
  });

  // Update status if still "sent"
  if (onboarding.status === "sent") {
    onboardingsStore.update(onboarding.id, {
      status: "in_progress",
      updatedAt: new Date().toISOString(),
    });
  }

  // Return sanitized data (no internal IDs, tokens, etc.)
  return ok({
    id: onboarding.id,
    candidateName: onboarding.candidate.name,
    companyId: onboarding.companyId,
    designation: onboarding.designation,
    department: onboarding.department,
    joiningDate: onboarding.joiningDate,
    status: onboarding.status === "sent" ? "in_progress" : onboarding.status,
    documents: onboarding.documents.map((doc) => ({
      id: doc.id,
      name: doc.name,
      required: doc.required,
      uploadRequired: doc.uploadRequired ?? false,
      status: doc.status,
      correctionNote: doc.correctionNote,
    })),
  });
}
