import { NextRequest } from "next/server";
import { onboardingsStore } from "@/lib/store";
import { logAuditEvent } from "@/lib/audit";
import { getAuthFromRequest, unauthorized, ok, notFound, badRequest } from "@/lib/api-helpers";
import type { OnboardingStatus } from "@/lib/types";

export async function PATCH(
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
    const newStatus = body.status as OnboardingStatus;

    const validTransitions: Record<string, string[]> = {
      initiated: ["sent"],
      sent: ["in_progress"],
      in_progress: ["submitted"],
      submitted: ["verified", "correction_requested"],
      verified: ["completed"],
    };

    const allowed = validTransitions[onboarding.status] || [];
    if (!allowed.includes(newStatus)) {
      return badRequest(
        `Cannot transition from ${onboarding.status} to ${newStatus}`
      );
    }

    onboardingsStore.update(id, {
      status: newStatus as OnboardingStatus,
      updatedAt: new Date().toISOString(),
    });

    logAuditEvent({
      onboardingId: id,
      event: newStatus === "verified" ? "verified" : "completed",
      performedBy: { type: "hr", id: auth.userId },
    });

    return ok({ message: `Status updated to ${newStatus}` });
  } catch (error) {
    return badRequest((error as Error).message);
  }
}
