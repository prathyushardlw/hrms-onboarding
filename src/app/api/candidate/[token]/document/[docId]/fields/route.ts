import { NextRequest, NextResponse } from "next/server";
import { onboardingsStore, templatesStore } from "@/lib/store";

function getOnboardingByToken(token: string) {
  const results = onboardingsStore.find((o) => o.accessToken === token);
  if (results.length === 0) return null;
  const onboarding = results[0];
  if (new Date(onboarding.tokenExpiresAt) < new Date()) return null;
  return onboarding;
}

// GET — return form fields config for a document's template
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

  const template = templatesStore.find((t) => t.id === doc.templateId)[0];
  return NextResponse.json({
    success: true,
    data: {
      formFields: template?.formFields || [],
      signatureFields: template?.signatureFields || [],
      hasRealTemplate: !!(template?.fileName),
    },
  });
}
