import { NextRequest } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { onboardingsStore, templatesStore, companiesStore } from "@/lib/store";
import { createOnboardingSchema } from "@/lib/validations";
import { generateAccessToken } from "@/lib/auth";
import { logAuditEvent } from "@/lib/audit";
import { sendEmail, buildOnboardingEmail } from "@/lib/email";
import {
  getAuthFromRequest,
  unauthorized,
  badRequest,
  ok,
  created,
} from "@/lib/api-helpers";
import type { Onboarding, OnboardingDocument } from "@/lib/types";

export async function GET(req: NextRequest) {
  const auth = getAuthFromRequest(req);
  if (!auth) return unauthorized();

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const companyId = searchParams.get("companyId");
  const search = searchParams.get("search")?.toLowerCase();

  let onboardings = onboardingsStore.getAll();

  if (companyId) onboardings = onboardings.filter((o) => o.companyId === companyId);
  if (status) onboardings = onboardings.filter((o) => o.status === status);
  if (search) {
    onboardings = onboardings.filter(
      (o) =>
        o.candidate.name.toLowerCase().includes(search) ||
        o.candidate.email.toLowerCase().includes(search) ||
        o.department.toLowerCase().includes(search)
    );
  }

  // Sort newest first
  onboardings.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return ok(onboardings);
}

export async function POST(req: NextRequest) {
  const auth = getAuthFromRequest(req);
  if (!auth || !["admin", "hr"].includes(auth.role)) return unauthorized();

  try {
    const body = await req.json();
    const parsed = createOnboardingSchema.safeParse(body);
    if (!parsed.success) {
      return badRequest(parsed.error.issues[0].message);
    }

    const { documentTemplateIds, ...data } = parsed.data;

    // Build document list from selected templates
    const documents: OnboardingDocument[] = documentTemplateIds.map(
      (templateId) => {
        const template = templatesStore.getById(templateId);
        return {
          id: uuidv4(),
          templateId,
          name: template?.name || "Unknown Document",
          required: true,
          uploadRequired: template?.uploadRequired ?? false,
          status: "pending" as const,
        };
      }
    );

    const { token, expiresAt } = generateAccessToken();
    const now = new Date().toISOString();

    const onboarding: Onboarding = {
      id: uuidv4(),
      companyId: data.companyId,
      candidate: data.candidate,
      employmentType: data.employmentType,
      department: data.department,
      designation: data.designation,
      joiningDate: data.joiningDate,
      status: "initiated",
      accessToken: token,
      tokenExpiresAt: expiresAt,
      documents,
      createdBy: auth.userId,
      createdAt: now,
      updatedAt: now,
    };

    onboardingsStore.create(onboarding);

    logAuditEvent({
      onboardingId: onboarding.id,
      event: "created",
      performedBy: { type: "hr", id: auth.userId },
    });

    return created(onboarding);
  } catch (error) {
    return badRequest((error as Error).message);
  }
}
