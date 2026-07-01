import { NextRequest } from "next/server";
import { v4 as uuidv4 } from "uuid";
import {
  candidatesStore, offersStore, onboardingsStore, templatesStore, docRulesStore,
} from "@/lib/store";
import { generateAccessToken } from "@/lib/auth";
import { logAuditEvent } from "@/lib/audit";
import {
  getAuthFromRequest, unauthorized, forbidden, badRequest, notFound, ok,
} from "@/lib/api-helpers";
import type { Onboarding, OnboardingDocument } from "@/lib/types";

type Params = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  const auth = getAuthFromRequest(req);
  if (!auth || !["super_admin", "admin", "hr"].includes(auth.role)) return unauthorized();

  const { id: candidateId } = await params;
  const candidate = candidatesStore.getById(candidateId);
  if (!candidate) return notFound("Candidate not found");
  if (auth.role !== "super_admin" && !auth.companyIds.includes(candidate.companyId)) return forbidden();

  // Get the offer to use its designation + joining date
  const offerList = offersStore.find((o) => o.candidateId === candidateId);
  const offer = offerList[0];

  const body = await req.json();
  // HR must provide: employmentType, department, designation, joiningDate, documentTemplateIds
  // These can come from the offer or be supplied in the request body
  const designation = body.designation ?? offer?.designation ?? "";
  const department = body.department ?? offer?.department ?? "";
  const joiningDate = body.joiningDate ?? offer?.joiningDate ?? new Date().toISOString().split("T")[0];
  const employmentType = body.employmentType ?? "full-time";

  if (!designation) return badRequest("Designation is required");
  if (!joiningDate) return badRequest("Joining date is required");

  // Build document list — use doc rules if no templateIds provided
  let templateIds: string[] = body.documentTemplateIds ?? [];
  if (templateIds.length === 0) {
    const rules = docRulesStore.find(
      (r) => r.companyId === candidate.companyId && r.employmentType === employmentType
    );
    if (rules.length > 0) {
      templateIds = [...rules[0].requiredDocuments, ...rules[0].optionalDocuments];
    }
  }

  const documents: OnboardingDocument[] = templateIds.map((templateId) => {
    const template = templatesStore.getById(templateId);
    const action = template?.documentAction ?? "sign_and_return";
    return {
      id: uuidv4(),
      templateId,
      name: template?.name ?? "Unknown Document",
      required: action !== "read_only",
      uploadRequired: template?.uploadRequired ?? false,
      documentAction: action,
      status: action === "read_only" ? ("signed" as const) : ("pending" as const),
    };
  });

  const nameParts = candidate.name.trim().split(" ");
  const firstName = nameParts[0];
  const lastName = nameParts.slice(1).join(" ") || "-";

  const { token, expiresAt } = generateAccessToken();
  const now = new Date().toISOString();

  const onboarding: Onboarding = {
    id: uuidv4(),
    companyId: candidate.companyId,
    candidate: {
      firstName,
      lastName,
      name: candidate.name,
      email: candidate.email,
      phone: candidate.phone ?? "",
    },
    employmentType,
    department,
    designation,
    joiningDate,
    status: "initiated",
    accessToken: token,
    tokenExpiresAt: expiresAt,
    documents,
    createdBy: auth.userId,
    createdAt: now,
    updatedAt: now,
  };

  onboardingsStore.create(onboarding);

  // Mark candidate as hired
  candidatesStore.update(candidateId, { status: "offered", updatedAt: now });

  logAuditEvent({
    onboardingId: onboarding.id,
    event: "created",
    performedBy: { type: "hr", id: auth.userId },
    metadata: { source: "recruitment", candidateId },
  });

  return ok({ onboardingId: onboarding.id, onboarding });
}
