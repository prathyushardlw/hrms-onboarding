import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { onboardingsStore, getUploadsDir } from "@/lib/store";
import { generateDocumentPdf } from "@/lib/pdf-generator";
import { getAuthFromRequest, unauthorized, notFound } from "@/lib/api-helpers";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string; docId: string }> }) {
  const auth = getAuthFromRequest(req);
  if (!auth) return unauthorized();
  const { id, docId } = await params;
  const onboarding = await onboardingsStore.getById(id);
  if (!onboarding) return notFound("Onboarding not found");

  const doc = (onboarding.documents ?? []).find((d) => d.id === docId);
  if (!doc) return notFound("Document not found");

  // Try to serve the signed/filled file first
  const uploadsDir = path.join(getUploadsDir(), id);
  if (fs.existsSync(uploadsDir)) {
    // Prefer filled (fill_and_sign) over plain signed, over any other upload
    const priority = [`${docId}_filled.pdf`, `${docId}_signed.pdf`];
    for (const name of priority) {
      const filePath = path.join(uploadsDir, name);
      if (fs.existsSync(filePath)) {
        const buffer = fs.readFileSync(filePath);
        return new NextResponse(buffer, {
          headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="${doc.name}.pdf"` },
        });
      }
    }
    // Fallback: any file starting with docId (e.g. uploaded files)
    const files = fs.readdirSync(uploadsDir).filter((f) => f.startsWith(docId));
    if (files.length > 0) {
      const filePath = path.join(uploadsDir, files[0]);
      const buffer = fs.readFileSync(filePath);
      return new NextResponse(buffer, {
        headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="${doc.name}.pdf"` },
      });
    }
  }

  // Generate a PDF from template
  const pdfBytes = await generateDocumentPdf(onboarding, doc, doc.fieldValues);
  return new NextResponse(pdfBytes, {
    headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="${doc.name}.pdf"` },
  });
}
