import { NextRequest, NextResponse } from "next/server";
import { onboardingsStore } from "@/lib/store";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const onboarding = await onboardingsStore.getById(id);
  if (!onboarding) {
    return NextResponse.redirect(new URL("/", req.url));
  }
  const base = process.env.NEXT_PUBLIC_BASE_URL ?? new URL(req.url).origin;
  return NextResponse.redirect(new URL(`/onboard/${onboarding.accessToken}`, base));
}


export async function POST(req: NextRequest) {
  const auth = getAuthFromRequest(req);
  if (!auth || !["super_admin", "admin", "hr"].includes(auth.role)) return unauthorized();

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
      documentAction: parsed.data.documentAction || "sign_and_return",
      uploadRequired: parsed.data.uploadRequired,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    };

    await templatesStore.create(template);
    return created(template);
  } catch (error) {
    return badRequest((error as Error).message);
  }
}
