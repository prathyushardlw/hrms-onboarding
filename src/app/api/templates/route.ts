import { NextRequest } from "next/server";
import { templatesStore } from "@/lib/store";
import { createTemplateSchema } from "@/lib/validations";
import { getAuthFromRequest, unauthorized, badRequest, ok, created, notFound } from "@/lib/api-helpers";
import { v4 as uuidv4 } from "uuid";
import type { DocumentTemplate } from "@/lib/types";

export async function GET(req: NextRequest) {
  const auth = getAuthFromRequest(req);
  if (!auth) return unauthorized();

  const { searchParams } = new URL(req.url);
  const companyId = searchParams.get("companyId");

  let templates = templatesStore.getAll();
  if (companyId) {
    templates = templates.filter((t) => t.companyId === companyId);
  }

  return ok(templates.filter((t) => t.isActive));
}

export async function POST(req: NextRequest) {
  const auth = getAuthFromRequest(req);
  if (!auth || !["admin", "hr"].includes(auth.role)) return unauthorized();

  try {
    const body = await req.json();
    const parsed = createTemplateSchema.safeParse(body);
    if (!parsed.success) {
      return badRequest(parsed.error.issues[0].message);
    }

    const now = new Date().toISOString();
    const template: DocumentTemplate = {
      id: uuidv4(),
      companyId: parsed.data.companyId,
      name: parsed.data.name,
      category: parsed.data.category,
      fileName: "",
      templateType: parsed.data.templateType,
      placeholders: parsed.data.placeholders,
      signatureFields: parsed.data.signatureFields,
      uploadRequired: parsed.data.uploadRequired,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    };

    templatesStore.create(template);
    return created(template);
  } catch (error) {
    return badRequest((error as Error).message);
  }
}
