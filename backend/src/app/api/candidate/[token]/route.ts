import { NextRequest } from "next/server";
import { onboardingsStore } from "@/lib/store";
import { ok, badRequest, notFound } from "@/lib/api-helpers";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!token) return badRequest("Token required");

  const records = await onboardingsStore.find((o) => o.accessToken === token);
  const onboarding = records[0];
  if (!onboarding) return notFound("Invalid or expired link");

  // Check token expiry
  if (onboarding.tokenExpiresAt && new Date(onboarding.tokenExpiresAt) < new Date()) {
    return badRequest("This link has expired. Please contact HR for a new link.");
  }

  const candidate = onboarding.candidate;
  return ok({
    id: onboarding.id,
    candidateName: candidate?.name ?? `${candidate?.firstName ?? ""} ${candidate?.lastName ?? ""}`.trim(),
    companyId: onboarding.companyId,
    designation: onboarding.designation,
    department: onboarding.department,
    joiningDate: onboarding.joiningDate,
    status: onboarding.status,
    documents: (onboarding.documents ?? []).map((d) => ({
      id: d.id,
      name: d.name,
      required: d.required,
      documentAction: d.documentAction,
      status: d.status,
      correctionNote: d.correctionNote,
      fieldValues: d.fieldValues,
    })),
  });
}

