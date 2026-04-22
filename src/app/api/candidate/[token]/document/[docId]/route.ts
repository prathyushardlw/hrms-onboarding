import { NextRequest } from "next/server";
import { onboardingsStore, saveUploadedFile, templatesStore, getTemplatesDir } from "@/lib/store";
import { logAuditEvent } from "@/lib/audit";
import { ok, notFound, badRequest } from "@/lib/api-helpers";
import { generateDocumentPdf, embedSignatureInPdf, embedFormFieldsInPdf } from "@/lib/pdf-generator";
import { v4 as uuidv4 } from "uuid";
import fs from "fs";
import path from "path";
import type { OnboardingDocument } from "@/lib/types";

function getOnboardingByToken(token: string) {
  const results = onboardingsStore.find((o) => o.accessToken === token);
  if (results.length === 0) return null;
  const onboarding = results[0];
  if (new Date(onboarding.tokenExpiresAt) < new Date()) return null;
  return onboarding;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string; docId: string }> }
) {
  const { token, docId } = await params;
  const onboarding = getOnboardingByToken(token);
  if (!onboarding) return notFound("Invalid or expired onboarding link");

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const signatureData = formData.get("signature") as string | null;
    const action = formData.get("action") as string; // "upload" | "sign" | "fill"

    const docIndex = onboarding.documents.findIndex(
      (d: OnboardingDocument) => d.id === docId
    );
    if (docIndex === -1) return notFound("Document not found");

    const doc = onboarding.documents[docIndex];
    const updatedDoc = { ...doc };

    if (action === "upload" && file) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const ext = file.name.split(".").pop() || "pdf";
      const fileName = `${doc.name.replace(/\s+/g, "_")}_${uuidv4().slice(0, 8)}.${ext}`;
      const filePath = saveUploadedFile(onboarding.id, fileName, buffer);
      updatedDoc.uploadedFileUrl = filePath;
      updatedDoc.status = "uploaded";

      logAuditEvent({
        onboardingId: onboarding.id,
        event: "document_uploaded",
        performedBy: { type: "candidate" },
        metadata: { documentId: docId, fileName },
      });
    }

    if (action === "sign" && signatureData) {
      // Get the current PDF — check for real template file first
      let pdfBytes: Uint8Array;
      const template = templatesStore.find((t) => t.id === doc.templateId)[0];

      if (doc.signedFileUrl && fs.existsSync(doc.signedFileUrl)) {
        pdfBytes = new Uint8Array(fs.readFileSync(doc.signedFileUrl));
      } else if (doc.filledFileUrl && fs.existsSync(doc.filledFileUrl)) {
        pdfBytes = new Uint8Array(fs.readFileSync(doc.filledFileUrl));
      } else if (template?.fileName) {
        const templatePath = path.join(getTemplatesDir(), template.fileName);
        if (fs.existsSync(templatePath)) {
          pdfBytes = new Uint8Array(fs.readFileSync(templatePath));
        } else {
          pdfBytes = await generateDocumentPdf(onboarding, doc);
        }
      } else {
        pdfBytes = await generateDocumentPdf(onboarding, doc);
      }

      // Use signature position from template if available
      const sigField = template?.signatureFields?.find((f) => f.role === "candidate");
      const sigPosition = sigField
        ? { page: sigField.page, x: sigField.x, y: sigField.y, width: sigField.width, height: sigField.height }
        : undefined;

      // Embed the signature image into the PDF
      const signedPdfBytes = await embedSignatureInPdf(pdfBytes, signatureData, sigPosition);

      // Save the signed PDF to disk
      const signedFileName = `${doc.name.replace(/\s+/g, "_")}_signed.pdf`;
      const signedPath = saveUploadedFile(onboarding.id, signedFileName, Buffer.from(signedPdfBytes));

      updatedDoc.signedFileUrl = signedPath;
      updatedDoc.candidateSignature = {
        dataUrl: signatureData,
        signedAt: new Date().toISOString(),
      };
      updatedDoc.status = "signed";

      logAuditEvent({
        onboardingId: onboarding.id,
        event: "document_signed",
        performedBy: { type: "candidate" },
        metadata: { documentId: docId },
      });
    }

    if (action === "fill") {
      updatedDoc.status = "filled";
    }

    if (action === "fill_and_sign" && signatureData) {
      // Parse extra field values
      const fieldValuesRaw = formData.get("fieldValues") as string | null;
      const fieldValues: Record<string, string> = fieldValuesRaw
        ? JSON.parse(fieldValuesRaw)
        : {};

      const templateForFill = templatesStore.find((t) => t.id === doc.templateId)[0];

      // Get the base PDF — use real template file if available, else generate
      let pdfBytes: Uint8Array;
      if (templateForFill?.fileName) {
        const templatePath = path.join(getTemplatesDir(), templateForFill.fileName);
        if (fs.existsSync(templatePath)) {
          pdfBytes = new Uint8Array(fs.readFileSync(templatePath));
        } else {
          pdfBytes = await generateDocumentPdf(onboarding, doc, fieldValues);
        }
      } else {
        pdfBytes = await generateDocumentPdf(onboarding, doc, fieldValues);
      }

      // Embed form field values (text, checkmarks) onto the PDF
      if (templateForFill?.formFields && templateForFill.formFields.length > 0) {
        pdfBytes = await embedFormFieldsInPdf(pdfBytes, templateForFill.formFields, fieldValues);
      }

      // Embed the signature image into the PDF
      const fillSigField = templateForFill?.signatureFields?.find((f) => f.role === "candidate");
      const fillSigPos = fillSigField
        ? { page: fillSigField.page, x: fillSigField.x, y: fillSigField.y, width: fillSigField.width, height: fillSigField.height }
        : undefined;
      const signedBytes = await embedSignatureInPdf(pdfBytes, signatureData, fillSigPos);

      // Save to disk
      const fileName = `${doc.name.replace(/\s+/g, "_")}_signed_${uuidv4().slice(0, 8)}.pdf`;
      const filePath = saveUploadedFile(onboarding.id, fileName, Buffer.from(signedBytes));

      updatedDoc.signedFileUrl = filePath;
      updatedDoc.fieldValues = fieldValues;
      updatedDoc.candidateSignature = {
        dataUrl: signatureData,
        signedAt: new Date().toISOString(),
      };
      updatedDoc.status = "signed";
      updatedDoc.completedAt = new Date().toISOString();

      logAuditEvent({
        onboardingId: onboarding.id,
        event: "document_signed",
        performedBy: { type: "candidate" },
        metadata: { documentId: docId, documentName: doc.name },
      });
    }

    const updatedDocs = [...onboarding.documents];
    updatedDocs[docIndex] = updatedDoc;

    onboardingsStore.update(onboarding.id, {
      documents: updatedDocs,
      updatedAt: new Date().toISOString(),
    });

    return ok({ message: "Document updated", document: updatedDoc });
  } catch (error) {
    return badRequest((error as Error).message);
  }
}
