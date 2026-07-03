import { NextRequest } from "next/server";
import fs from "fs";
import path from "path";
import { onboardingsStore, templatesStore, saveUploadedFile, getTemplatesDir } from "@/lib/store";
import { logAuditEvent } from "@/lib/audit";
import { ok, badRequest, notFound } from "@/lib/api-helpers";
import { embedSignatureInPdf, embedFormFieldsInPdf, generateDocumentPdf } from "@/lib/pdf-generator";

async function getOnboardingByToken(token: string) {
  const records = await onboardingsStore.find((o) => o.accessToken === token);
  return records[0] ?? null;
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string; docId: string }> }) {
  const { token, docId } = await params;
  const onboarding = await getOnboardingByToken(token);
  if (!onboarding) return notFound("Invalid or expired link");

  if (onboarding.tokenExpiresAt && new Date(onboarding.tokenExpiresAt) < new Date()) {
    return badRequest("This link has expired.");
  }

  const docIndex = (onboarding.documents ?? []).findIndex((d) => d.id === docId);
  if (docIndex === -1) return notFound("Document not found");

  // Capture signer identity for audit trail
  const ip = (req.headers.get("x-forwarded-for") ?? req.headers.get("x-real-ip") ?? "unknown").split(",")[0].trim();
  const userAgent = req.headers.get("user-agent") ?? "unknown";

  const fd = await req.formData();
  const action = fd.get("action")?.toString() ?? "sign";
  const now = new Date().toISOString();

  const updatedDocs = [...(onboarding.documents ?? [])];

  if (action === "upload") {
    const file = fd.get("file") as File | null;
    if (!file) return badRequest("File required");
    const buffer = Buffer.from(await file.arrayBuffer());
    saveUploadedFile(onboarding.id, `${docId}_${file.name}`, buffer);
    updatedDocs[docIndex] = { ...updatedDocs[docIndex], status: "uploaded", uploadedFileUrl: file.name, completedAt: now };
  } else if (action === "sign") {
    const signature = fd.get("signature")?.toString();
    if (!signature) return badRequest("Signature required");
    // Use the real template PDF if available, otherwise generate a fallback
    const template = await templatesStore.getById(updatedDocs[docIndex].templateId);
    let pdfBytes: Uint8Array;
    if (template?.fileName) {
      const tplPath = path.join(getTemplatesDir(), template.fileName);
      if (fs.existsSync(tplPath)) {
        pdfBytes = new Uint8Array(fs.readFileSync(tplPath));
      } else {
        pdfBytes = await generateDocumentPdf(onboarding, updatedDocs[docIndex]);
      }
    } else {
      pdfBytes = await generateDocumentPdf(onboarding, updatedDocs[docIndex]);
    }
    const signedBytes = await embedSignatureInPdf(pdfBytes, signature);
    saveUploadedFile(onboarding.id, `${docId}_signed.pdf`, Buffer.from(signedBytes));
    updatedDocs[docIndex] = {
      ...updatedDocs[docIndex],
      status: "signed",
      signedFileUrl: `${docId}_signed.pdf`,
      candidateSignature: { dataUrl: signature, signedAt: now, signerIp: ip, signerAgent: userAgent },
      completedAt: now,
    };
  } else if (action === "fill_and_sign") {
    const signature = fd.get("signature")?.toString();
    const fieldValuesRaw = fd.get("fieldValues")?.toString();
    if (!signature) return badRequest("Signature required");
    let fieldValues: Record<string, string> = {};
    try { fieldValues = JSON.parse(fieldValuesRaw ?? "{}"); } catch { /* ignore */ }
    // Use the real template PDF if available, otherwise generate a fallback
    const template = await templatesStore.getById(updatedDocs[docIndex].templateId);
    let pdfBytes: Uint8Array;
    if (template?.fileName) {
      const tplPath = path.join(getTemplatesDir(), template.fileName);
      if (fs.existsSync(tplPath)) {
        const rawBytes = new Uint8Array(fs.readFileSync(tplPath));
        // Embed the filled form field values into the real PDF
        pdfBytes = await embedFormFieldsInPdf(rawBytes, template.formFields ?? [], fieldValues);
      } else {
        pdfBytes = await generateDocumentPdf(onboarding, updatedDocs[docIndex], fieldValues);
      }
    } else {
      pdfBytes = await generateDocumentPdf(onboarding, updatedDocs[docIndex], fieldValues);
    }
    const signedBytes = await embedSignatureInPdf(pdfBytes, signature);
    saveUploadedFile(onboarding.id, `${docId}_filled.pdf`, Buffer.from(signedBytes));
    updatedDocs[docIndex] = {
      ...updatedDocs[docIndex],
      status: "signed",
      fieldValues,
      filledFileUrl: `${docId}_filled.pdf`,
      candidateSignature: { dataUrl: signature, signedAt: now, signerIp: ip, signerAgent: userAgent },
      completedAt: now,
    };
  } else {
    return badRequest("Unknown action");
  }

  // Check if all required docs are now done to mark as in_progress
  const allRequired = updatedDocs.filter((d) => d.required);
  const allDone = allRequired.every((d) => d.status !== "pending" && d.status !== "correction_requested");
  const newStatus = allDone && onboarding.status === "sent" ? "in_progress" : onboarding.status;

  await onboardingsStore.update(onboarding.id, { documents: updatedDocs, status: newStatus, updatedAt: now });
  await logAuditEvent({
    onboardingId: onboarding.id,
    event: "document_updated",
    performedBy: { type: "candidate", id: onboarding.id },
    details: { docId, action, signerIp: ip, signerAgent: userAgent },
  });

  return ok({ status: updatedDocs[docIndex].status });
}

