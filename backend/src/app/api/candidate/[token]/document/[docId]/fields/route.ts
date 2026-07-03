import { NextRequest } from "next/server";
import fs from "fs";
import path from "path";
import { onboardingsStore, templatesStore, getTemplatesDir } from "@/lib/store";
import { detectFieldsFromPdf } from "@/lib/detect-fields";
import { ok, notFound } from "@/lib/api-helpers";

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

  const template = await templatesStore.getById(doc.templateId);

  // Prefer designer-placed fields (formFields = positioned overlays with x/y/width/height)
  // These are saved by the template designer (PdfFieldDesigner) as template.formFields.
  const designerFields = template?.formFields ?? [];
  const designerSigFields = template?.signatureFields ?? [];

  if (designerFields.length > 0 || designerSigFields.length > 0) {
    return ok({
      formFields: designerFields,
      signatureFields: designerSigFields,
      existingValues: doc.fieldValues ?? {},
    });
  }

  // No designer fields — try to auto-detect AcroForm fields from the uploaded PDF
  if (template?.fileName) {
    const templatePath = path.join(getTemplatesDir(), template.fileName);
    if (fs.existsSync(templatePath)) {
      try {
        const buffer = fs.readFileSync(templatePath);
        const { formFields, signatureFields } = await detectFieldsFromPdf(buffer);
        if (formFields.length > 0 || signatureFields.length > 0) {
          return ok({ formFields, signatureFields, existingValues: doc.fieldValues ?? {} });
        }
      } catch {
        // fall through
      }
    }
  }

  // No fields at all — return empty (will show sign-only viewer)
  return ok({
    formFields: [],
    signatureFields: [],
    existingValues: doc.fieldValues ?? {},
  });
}

