import { NextRequest, NextResponse } from "next/server";
import { onboardingsStore } from "@/lib/store";
import { generateDocumentPdf } from "@/lib/pdf-generator";
import { logAuditEvent } from "@/lib/audit";
import fs from "fs";

function getOnboardingByToken(token: string) {
  const results = onboardingsStore.find((o) => o.accessToken === token);
  if (results.length === 0) return null;
  const onboarding = results[0];
  if (new Date(onboarding.tokenExpiresAt) < new Date()) return null;
  return onboarding;
}

// GET — serve the PDF for viewing in the browser
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string; docId: string }> }
) {
  const { token, docId } = await params;
  const onboarding = getOnboardingByToken(token);
  if (!onboarding) {
    return NextResponse.json({ success: false, error: "Invalid or expired link" }, { status: 404 });
  }

  const doc = onboarding.documents.find((d) => d.id === docId);
  if (!doc) {
    return NextResponse.json({ success: false, error: "Document not found" }, { status: 404 });
  }

  logAuditEvent({
    onboardingId: onboarding.id,
    event: "document_viewed",
    performedBy: { type: "candidate" },
    metadata: { documentId: docId, documentName: doc.name },
  });

  // If already signed, serve the signed PDF
  if (doc.signedFileUrl && fs.existsSync(doc.signedFileUrl)) {
    const signedBytes = fs.readFileSync(doc.signedFileUrl);
    return new NextResponse(signedBytes, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${doc.name}.pdf"`,
      },
    });
  }

  // If filled PDF exists on disk, serve it
  if (doc.filledFileUrl && fs.existsSync(doc.filledFileUrl)) {
    const filledBytes = fs.readFileSync(doc.filledFileUrl);
    return new NextResponse(filledBytes, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${doc.name}.pdf"`,
      },
    });
  }

  // Otherwise generate fresh PDF from template data
  const pdfBytes = await generateDocumentPdf(onboarding, doc);

  // Cache the generated PDF to disk
  const { saveUploadedFile } = await import("@/lib/store");
  const fileName = `${doc.name.replace(/\s+/g, "_")}_filled.pdf`;
  const savedPath = saveUploadedFile(onboarding.id, fileName, Buffer.from(pdfBytes));

  // Update the document record with the filled file path
  const updatedDocs = onboarding.documents.map((d) =>
    d.id === docId ? { ...d, filledFileUrl: savedPath } : d
  );
  onboardingsStore.update(onboarding.id, { documents: updatedDocs });

  return new NextResponse(pdfBytes, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${doc.name}.pdf"`,
    },
  });
}
