import { NextRequest } from "next/server";
import { onboardingsStore } from "@/lib/store";
import { logAuditEvent } from "@/lib/audit";
import { saveUploadedFile } from "@/lib/store";
import { ok, notFound, badRequest } from "@/lib/api-helpers";
import { v4 as uuidv4 } from "uuid";
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
