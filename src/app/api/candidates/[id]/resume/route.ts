import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { candidatesStore } from "@/lib/store";
import { getAuthFromRequest, unauthorized, badRequest, ok, notFound } from "@/lib/api-helpers";

const RESUMES_DIR = path.join(process.cwd(), "data", "resumes");

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = getAuthFromRequest(req);
  if (!auth) return unauthorized();
  const { id: candidateId } = await params;
  const candidate = await candidatesStore.getById(candidateId);
  if (!candidate?.resumeFileName) return notFound("No resume uploaded");
  const filePath = path.join(RESUMES_DIR, candidateId, candidate.resumeFileName);
  if (!fs.existsSync(filePath)) return notFound("Resume file not found");
  const buffer = fs.readFileSync(filePath);
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Disposition": `attachment; filename="${candidate.resumeFileName}"`,
    },
  });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = getAuthFromRequest(req);
  if (!auth || !["super_admin", "admin", "hr"].includes(auth.role)) return unauthorized();
  const { id: candidateId } = await params;
  const candidate = await candidatesStore.getById(candidateId);
  if (!candidate) return notFound("Candidate not found");

  const fd = await req.formData();
  const file = fd.get("resume") as File | null;
  if (!file) return badRequest("Resume file is required");

  const dir = path.join(RESUMES_DIR, candidateId);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const fileName = file.name;
  const buffer = Buffer.from(await file.arrayBuffer());
  fs.writeFileSync(path.join(dir, fileName), buffer);

  await candidatesStore.update(candidateId, { resumeFileName: fileName, updatedAt: new Date().toISOString() });
  return ok({ resumeFileName: fileName });
}

