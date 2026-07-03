import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { templatesStore, getTemplatesDir } from "@/lib/store";
import { getAuthFromRequest, unauthorized, badRequest, ok, notFound } from "@/lib/api-helpers";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = getAuthFromRequest(req);
  if (!auth || !["super_admin", "admin", "hr"].includes(auth.role)) return unauthorized();
  const { id } = await params;
  const template = await templatesStore.getById(id);
  if (!template) return notFound("Template not found");

  const fd = await req.formData();
  const file = fd.get("pdf") as File | null;
  if (!file) return badRequest("PDF file required");

  const dir = getTemplatesDir();
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const fileName = `${id}.pdf`;
  const buffer = Buffer.from(await file.arrayBuffer());
  fs.writeFileSync(path.join(dir, fileName), buffer);

  const updated = await templatesStore.update(id, { fileName, updatedAt: new Date().toISOString() });
  return ok(updated);
}
