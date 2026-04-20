import { NextRequest } from "next/server";
import { onboardingsStore } from "@/lib/store";
import { logAuditEvent } from "@/lib/audit";
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

    const { documentId, note } = parsed.data;

    const updatedDocs = onboarding.documents.map((doc: OnboardingDocument) =>
      doc.id === documentId
        ? { ...doc, status: "correction_requested" as const, correctionNote: note }
        : doc
    );

    onboardingsStore.update(id, {
      documents: updatedDocs,
      status: "in_progress",
      updatedAt: new Date().toISOString(),
    });

    logAuditEvent({
      onboardingId: id,
      event: "correction_requested",
      performedBy: { type: "hr", id: auth.userId },
      metadata: { documentId, note },
    });

    return ok({ message: "Correction requested" });
  } catch (error) {
    return badRequest((error as Error).message);
  }
}
