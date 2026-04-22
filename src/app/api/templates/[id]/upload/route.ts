import { NextRequest } from "next/server";
import { templatesStore, getTemplatesDir } from "@/lib/store";
import { getAuthFromRequest, unauthorized, ok, notFound, badRequest } from "@/lib/api-helpers";
import path from "path";
import fs from "fs";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = getAuthFromRequest(req);
  if (!auth || !["admin", "hr"].includes(auth.role)) return unauthorized();

  const { id } = await params;
  const template = templatesStore.getById(id);
  if (!template) return notFound("Template not found");

  try {
    const formData = await req.formData();
    const file = formData.get("pdf") as File | null;
    if (!file) return badRequest("No PDF file provided");

    if (!file.name.toLowerCase().endsWith(".pdf")) {
      return badRequest("Only PDF files are accepted");
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const safeFileName = `${id}_${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const templatesDir = getTemplatesDir();
    const filePath = path.join(templatesDir, safeFileName);
    fs.writeFileSync(filePath, buffer);

    const updated = templatesStore.update(id, {
      fileName: safeFileName,
      updatedAt: new Date().toISOString(),
    });

    return ok(updated);
  } catch (error) {
    return badRequest((error as Error).message);
  }
}
