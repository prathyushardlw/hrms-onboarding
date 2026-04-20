import { NextRequest } from "next/server";
import { onboardingsStore } from "@/lib/store";
import { logAuditEvent } from "@/lib/audit";
import { ok, notFound, badRequest } from "@/lib/api-helpers";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const results = onboardingsStore.find((o) => o.accessToken === token);
  if (results.length === 0) return notFound("Invalid or expired onboarding link");

  const onboarding = results[0];
  if (new Date(onboarding.tokenExpiresAt) < new Date()) {
    return notFound("Onboarding link has expired");
  }

  // Check all required documents are completed
  const pendingRequired = onboarding.documents.filter(
    (doc) =>
      doc.required &&
      !["signed", "uploaded", "filled", "verified"].includes(doc.status)
  );

  if (pendingRequired.length > 0) {
    return badRequest(
      `${pendingRequired.length} required document(s) still pending: ${pendingRequired
        .map((d) => d.name)
        .join(", ")}`
    );
  }

  onboardingsStore.update(onboarding.id, {
    status: "submitted",
    updatedAt: new Date().toISOString(),
  });

  logAuditEvent({
    onboardingId: onboarding.id,
    event: "submitted",
    performedBy: { type: "candidate" },
    ipAddress: req.headers.get("x-forwarded-for") || undefined,
    userAgent: req.headers.get("user-agent") || undefined,
  });

  return ok({ message: "Onboarding documents submitted successfully" });
}
