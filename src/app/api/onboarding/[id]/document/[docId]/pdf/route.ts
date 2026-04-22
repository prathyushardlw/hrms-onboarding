import { NextRequest, NextResponse } from "next/server";
import { onboardingsStore, templatesStore, getTemplatesDir } from "@/lib/store";
import { generateDocumentPdf } from "@/lib/pdf-generator";
import { getAuthFromRequest, unauthorized, notFound } from "@/lib/api-helpers";
import fs from "fs";
import path from "path";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; docId: string }> }
) {
  const auth = getAuthFromRequest(req);
  if (!auth) return unauthorized();

  const { id, docId } = await params;
  const onboarding = onboardingsStore.getById(id);
  if (!onboarding) return notFound("Onboarding not found");

  const doc = onboarding.documents.find((d) => d.id === docId);
  if (!doc) return notFound("Document not found");

  // Priority: signed > filled > template > generated
  if (doc.signedFileUrl && fs.existsSync(doc.signedFileUrl)) {
    const bytes = fs.readFileSync(doc.signedFileUrl);
    return new NextResponse(bytes, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${doc.name}.pdf"`,
      },
    });
  }

  if (doc.filledFileUrl && fs.existsSync(doc.filledFileUrl)) {
    const bytes = fs.readFileSync(doc.filledFileUrl);
    return new NextResponse(bytes, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${doc.name}.pdf"`,
      },
    });
  }

  // Uploaded file (identity docs etc.)
  if (doc.uploadedFileUrl && fs.existsSync(doc.uploadedFileUrl)) {
    const bytes = fs.readFileSync(doc.uploadedFileUrl);
    const isPdf = doc.uploadedFileUrl.toLowerCase().endsWith(".pdf");
    return new NextResponse(bytes, {
      headers: {
        "Content-Type": isPdf ? "application/pdf" : "application/octet-stream",
        "Content-Disposition": `inline; filename="${doc.name}${isPdf ? ".pdf" : ""}"`,
      },
    });
  }

  // Template PDF
  const template = templatesStore.find((t) => t.id === doc.templateId)[0];
  if (template?.fileName) {
    const templatePath = path.join(getTemplatesDir(), template.fileName);
    if (fs.existsSync(templatePath)) {
      const bytes = fs.readFileSync(templatePath);
      return new NextResponse(bytes, {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `inline; filename="${doc.name}.pdf"`,
        },
      });
    }
  }

  // Generate PDF
  const pdfBytes = await generateDocumentPdf(onboarding, doc);
  return new NextResponse(Buffer.from(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${doc.name}.pdf"`,
    },
  });
}
