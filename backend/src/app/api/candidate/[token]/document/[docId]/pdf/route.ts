import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { onboardingsStore, getUploadsDir, templatesStore, getTemplatesDir } from "@/lib/store";
import { generateDocumentPdf } from "@/lib/pdf-generator";
import { notFound } from "@/lib/api-helpers";

async function getOnboardingByToken(token: string) {
  const records = await onboardingsStore.find((o) => o.accessToken === token);
  return records[0] ?? null;
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ token: string; docId: string }> }) {
  const { token, docId } = await params;
  const onboarding = await getOnboardingByToken(token);
  if (!onboarding) return notFound("Invalid or expired link");

  const doc = (onboarding.documents ?? []).find((d) => d.id === docId);
  if (!doc) return notFound("Document not found");

  // Try to serve real template PDF file
  const template = await templatesStore.getById(doc.templateId);
  if (template?.fileName) {
    const templatePath = path.join(getTemplatesDir(), template.fileName);
    if (fs.existsSync(templatePath)) {
      const buffer = fs.readFileSync(templatePath);
      return new NextResponse(buffer, {
        headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="${doc.name}.pdf"` },
      });
    }
  }

  // Generate PDF from data
  const pdfBytes = await generateDocumentPdf(onboarding, doc, doc.fieldValues);
  return new NextResponse(pdfBytes, {
    headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="${doc.name}.pdf"` },
  });
}

