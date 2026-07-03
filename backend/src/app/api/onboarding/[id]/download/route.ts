import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import archiver from "archiver";
import { onboardingsStore, getUploadsDir } from "@/lib/store";
import { getAuthFromRequest, unauthorized, notFound } from "@/lib/api-helpers";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = getAuthFromRequest(req);
  if (!auth) return unauthorized();
  const { id } = await params;
  const onboarding = await onboardingsStore.getById(id);
  if (!onboarding) return notFound("Onboarding not found");

  const uploadsDir = path.join(getUploadsDir(), id);

  // Return list of available files as JSON if no archiver available
  if (!fs.existsSync(uploadsDir)) {
    return new NextResponse(JSON.stringify({ error: "No documents uploaded yet" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  const files = fs.readdirSync(uploadsDir);
  if (files.length === 0) {
    return new NextResponse(JSON.stringify({ error: "No documents uploaded yet" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Stream a ZIP of all uploaded files
  const chunks: Buffer[] = [];
  await new Promise<void>((resolve, reject) => {
    const archive = archiver("zip", { zlib: { level: 6 } });
    archive.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
    archive.on("end", resolve);
    archive.on("error", reject);
    for (const file of files) {
      archive.file(path.join(uploadsDir, file), { name: file });
    }
    archive.finalize();
  });

  const zipBuffer = Buffer.concat(chunks);
  const candidateName = onboarding.candidate.name.replace(/[^a-zA-Z0-9 ]/g, "");
  return new NextResponse(zipBuffer, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${candidateName} - Onboarding Documents.zip"`,
    },
  });
}
