import { NextRequest } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { candidatesStore, onboardingsStore, docRulesStore, templatesStore, offersStore } from "@/lib/store";
import { generateAccessToken } from "@/lib/auth";
import { logAuditEvent } from "@/lib/audit";
import { getAuthFromRequest, unauthorized, badRequest, ok, notFound } from "@/lib/api-helpers";
import type { Onboarding, OnboardingDocument } from "@/lib/types";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = getAuthFromRequest(req);
  if (!auth || !["super_admin", "admin", "hr"].includes(auth.role)) return unauthorized();
  const { id: candidateId } = await params;

  const candidate = await candidatesStore.getById(candidateId);
  if (!candidate) return notFound("Candidate not found");

  // Pull offer letter details if available
  const offers = await offersStore.find((o) => o.candidateId === candidateId);
  const offer = offers[0];

  // Find doc rules for full-time (default) to build document list
  const rules = await docRulesStore.find((r) => r.companyId === candidate.companyId && r.employmentType === "full-time");
  const templateIds = rules[0]?.requiredDocuments ?? [];
  const documents: OnboardingDocument[] = await Promise.all(
    templateIds.map(async (templateId) => {
      const template = await templatesStore.getById(templateId);
      const action = template?.documentAction || "sign_and_return";
      return {
        id: uuidv4(),
        templateId,
        name: template?.name || "Document",
        required: action !== "read_only",
        uploadRequired: template?.uploadRequired ?? false,
        documentAction: action,
        status: action === "read_only" ? "signed" as const : "pending" as const,
      };
    })
  );

  const { token, expiresAt } = generateAccessToken();
  const now = new Date().toISOString();
  const onboarding: Onboarding = {
    id: uuidv4(),
    companyId: candidate.companyId,
    candidate: { firstName: candidate.name.split(" ")[0], lastName: candidate.name.split(" ").slice(1).join(" ") || "-", name: candidate.name, email: candidate.email, phone: candidate.phone },
    employmentType: "full-time",
    department: offer?.department ?? "",
    designation: offer?.designation ?? "",
    joiningDate: offer?.joiningDate ?? "",
    status: "initiated",
    accessToken: token,
    tokenExpiresAt: expiresAt,
    documents,
    createdBy: auth.userId,
    createdAt: now,
    updatedAt: now,
  };

  await onboardingsStore.create(onboarding);
  await candidatesStore.update(candidateId, { status: "offered", updatedAt: now });
  await logAuditEvent({ onboardingId: onboarding.id, event: "created", performedBy: { type: "hr", id: auth.userId } });

  return ok({ onboardingId: onboarding.id });
}

