import { NextRequest } from "next/server";
import { templatesStore } from "@/lib/store";
import { getAuthFromRequest, unauthorized, ok, notFound, badRequest } from "@/lib/api-helpers";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = getAuthFromRequest(req);
  if (!auth) return unauthorized();

  const { id } = await params;
  const template = templatesStore.getById(id);
  if (!template) return notFound("Template not found");

  return ok(template);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = getAuthFromRequest(req);
  if (!auth || !["admin", "hr"].includes(auth.role)) return unauthorized();

  const { id } = await params;
  try {
    const body = await req.json();
    const updated = templatesStore.update(id, {
      ...body,
      updatedAt: new Date().toISOString(),
    });
    if (!updated) return notFound("Template not found");
    return ok(updated);
  } catch (error) {
    return badRequest((error as Error).message);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = getAuthFromRequest(req);
  if (!auth || auth.role !== "admin") return unauthorized();

  const { id } = await params;
  const updated = templatesStore.update(id, {
    isActive: false,
    updatedAt: new Date().toISOString(),
  } as Partial<import("@/lib/types").DocumentTemplate>);

  if (!updated) return notFound("Template not found");
  return ok({ message: "Template deleted" });
}
