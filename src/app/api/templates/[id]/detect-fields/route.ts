import { NextRequest } from "next/server";
import fs from "fs";
import path from "path";
import { templatesStore, getTemplatesDir } from "@/lib/store";
import { detectFieldsFromPdf } from "@/lib/detect-fields";
import { getAuthFromRequest, unauthorized, badRequest, ok, notFound } from "@/lib/api-helpers";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = getAuthFromRequest(req);
  if (!auth) return unauthorized();
  const { id } = await params;
  const template = await templatesStore.getById(id);
  if (!template?.fileName) return notFound("No PDF uploaded for this template");
  const filePath = path.join(getTemplatesDir(), template.fileName);
  if (!fs.existsSync(filePath)) return notFound("Template file not found on disk");
  const buffer = fs.readFileSync(filePath);
  const { formFields, signatureFields } = await detectFieldsFromPdf(buffer);
  return ok({ formFields, signatureFields });
}
