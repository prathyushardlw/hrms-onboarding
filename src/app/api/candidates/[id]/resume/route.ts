import { NextRequest, NextResponse } from "next/server";
import { candidatesStore, getResumeFilePath } from "@/lib/store";
import { getAuthFromRequest, unauthorized, forbidden, notFound } from "@/lib/api-helpers";
import fs from "fs";
import path from "path";

type Params = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  const auth = getAuthFromRequest(req);
  if (!auth) return unauthorized();

  const { id } = await params;
  const candidate = candidatesStore.getById(id);
  if (!candidate) return notFound("Candidate not found");
  if (auth.role !== "super_admin" && !auth.companyIds.includes(candidate.companyId)) return forbidden();
  if (!candidate.resumeFileName) return notFound("No resume uploaded");

  const filePath = getResumeFilePath(id, candidate.resumeFileName);
  if (!fs.existsSync(filePath)) return notFound("Resume file not found");

  const buffer = fs.readFileSync(filePath);
  const ext = path.extname(candidate.resumeFileName).toLowerCase();
  const contentType = ext === ".pdf" ? "application/pdf" : "application/octet-stream";

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename="${candidate.name.replace(/\s+/g, "_")}_resume${ext}"`,
    },
  });
}
