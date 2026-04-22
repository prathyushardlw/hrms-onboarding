import { NextRequest, NextResponse } from "next/server";
import { onboardingsStore } from "@/lib/store";
import { getAuthFromRequest, unauthorized, notFound, badRequest } from "@/lib/api-helpers";
import archiver from "archiver";
import fs from "fs";
import path from "path";
import { PassThrough } from "stream";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = getAuthFromRequest(req);
  if (!auth || !["admin", "hr"].includes(auth.role)) return unauthorized();

  const { id } = await params;
  const onboarding = onboardingsStore.getById(id);
  if (!onboarding) return notFound("Onboarding not found");

  if (onboarding.status !== "completed" && onboarding.status !== "verified") {
    return badRequest("Onboarding must be completed or verified to download documents");
  }

  // Collect all document files
  const files: { name: string; filePath: string }[] = [];

  for (const doc of onboarding.documents) {
    // Prefer signed, then filled, then uploaded
    const docPath = doc.signedFileUrl || doc.filledFileUrl || doc.uploadedFileUrl;
    if (docPath && fs.existsSync(docPath)) {
      const ext = path.extname(docPath) || ".pdf";
      const safeName = doc.name.replace(/[^a-zA-Z0-9_\- ]/g, "").trim();
      files.push({ name: `${safeName}${ext}`, filePath: docPath });
    }
  }

  if (files.length === 0) {
    return badRequest("No completed documents found to download");
  }

  // Create ZIP archive in memory
  const archive = archiver("zip", { zlib: { level: 5 } });
  const passThrough = new PassThrough();
  archive.pipe(passThrough);

  // Track used names to avoid duplicates
  const usedNames = new Set<string>();
  for (const file of files) {
    let name = file.name;
    let counter = 1;
    while (usedNames.has(name.toLowerCase())) {
      const ext = path.extname(file.name);
      const base = path.basename(file.name, ext);
      name = `${base} (${counter})${ext}`;
      counter++;
    }
    usedNames.add(name.toLowerCase());
    archive.file(file.filePath, { name });
  }

  await archive.finalize();

  // Read the stream into a buffer
  const chunks: Buffer[] = [];
  for await (const chunk of passThrough) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  const zipBuffer = Buffer.concat(chunks);

  const candidateName = onboarding.candidate.name.replace(/[^a-zA-Z0-9_\- ]/g, "").trim();
  const fileName = `${candidateName} - Onboarding Documents.zip`;

  return new NextResponse(zipBuffer, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Content-Length": zipBuffer.length.toString(),
    },
  });
}
