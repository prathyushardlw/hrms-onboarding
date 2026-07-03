import { NextRequest } from "next/server";
import { onboardingsStore } from "@/lib/store";
import { logAuditEvent } from "@/lib/audit";
import { ok, badRequest, notFound } from "@/lib/api-helpers";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const records = await onboardingsStore.find((o) => o.accessToken === token);
  const onboarding = records[0];
  if (!onboarding) return notFound("Invalid or expired link");

  if (onboarding.tokenExpiresAt && new Date(onboarding.tokenExpiresAt) < new Date()) {
    return badRequest("This link has expired.");
  }

  if (onboarding.status === "submitted" || onboarding.status === "completed") {
    return ok({ message: "Already submitted" });
  }

  // Verify required docs are done
  const pendingRequired = (onboarding.documents ?? []).filter(
    (d) => d.required && d.status === "pending"
  );
  if (pendingRequired.length > 0) {
    return badRequest(`${pendingRequired.length} required document(s) still pending.`);
  }

  const now = new Date().toISOString();
  await onboardingsStore.update(onboarding.id, { status: "submitted", updatedAt: now });
  await logAuditEvent({
    onboardingId: onboarding.id,
    event: "submitted",
    performedBy: { type: "candidate", id: onboarding.id },
  });

  return ok({ message: "Submitted successfully" });
}

