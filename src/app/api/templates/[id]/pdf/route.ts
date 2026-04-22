import { NextRequest, NextResponse } from "next/server";
import { templatesStore, getTemplatesDir } from "@/lib/store";
import { getAuthFromRequest, unauthorized, notFound } from "@/lib/api-helpers";
import path from "path";
import fs from "fs";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = getAuthFromRequest(req);
  if (!auth) return unauthorized();

  const { id } = await params;
  const template = templatesStore.getById(id);
  if (!template) return notFound("Template not found");
  if (!template.fileName) return notFound("No PDF file uploaded for this template");

  const filePath = path.join(getTemplatesDir(), template.fileName);
  if (!fs.existsSync(filePath)) return notFound("PDF file not found on disk");

  const buffer = fs.readFileSync(filePath);
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${template.fileName}"`,
    },
  });
}
