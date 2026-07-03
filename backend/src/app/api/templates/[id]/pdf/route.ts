import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { templatesStore, getTemplatesDir } from "@/lib/store";
import { getAuthFromRequest, unauthorized, notFound } from "@/lib/api-helpers";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = getAuthFromRequest(req);
  if (!auth) return unauthorized();
  const { id } = await params;
  const template = await templatesStore.getById(id);
  if (!template?.fileName) return notFound("Template PDF not uploaded");
  const filePath = path.join(getTemplatesDir(), template.fileName);
  if (!fs.existsSync(filePath)) return notFound("Template file not found on disk");
  const buffer = fs.readFileSync(filePath);
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${template.name}.pdf"`,
    },
  });
}
