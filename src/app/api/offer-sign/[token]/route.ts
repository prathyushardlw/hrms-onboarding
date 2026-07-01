import { NextRequest, NextResponse } from "next/server";
import { offersStore, candidatesStore, companiesStore, jobsStore, saveOfferPdf } from "@/lib/store";
import { ok, notFound, badRequest } from "@/lib/api-helpers";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import fs from "fs";
import path from "path";

type Params = { params: Promise<{ token: string }> };

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

// GET — return offer details for the signing page (no auth, token-gated)
export async function GET(_req: NextRequest, { params }: Params) {
  const { token } = await params;
  const offer = offersStore.find((o) => o.signToken === token)[0];
  if (!offer) return notFound("Offer not found or link has expired");

  const candidate = candidatesStore.getById(offer.candidateId);
  const company = companiesStore.getById(offer.companyId);
  const job = jobsStore.getById(offer.jobId);

  return ok({
    offer: {
      id: offer.id,
      designation: offer.designation,
      department: offer.department,
      ctc: offer.ctc,
      joiningDate: offer.joiningDate,
      additionalTerms: offer.additionalTerms,
      status: offer.status,
      signedAt: offer.signedAt,
    },
    candidateName: candidate?.name ?? "Candidate",
    companyName: company?.name ?? "Company",
    jobTitle: job?.title ?? "the position",
  });
}

// POST — candidate submits signature
export async function POST(req: NextRequest, { params }: Params) {
  const { token } = await params;
  const offer = offersStore.find((o) => o.signToken === token)[0];
  if (!offer) return notFound("Offer not found or link has expired");
  if (offer.signedAt) return badRequest("This offer has already been signed");

  const body = await req.json();
  if (!body.signatureDataUrl?.startsWith("data:image/")) {
    return badRequest("Valid signature image is required");
  }

  const ip = getClientIp(req);
  const userAgent = req.headers.get("user-agent") ?? "unknown";
  const signedAt = new Date().toISOString();

  // ── Embed signature + audit trail into the PDF ──
  const offerPdfPath = path.join(process.cwd(), "data", "offers", `${offer.id}.pdf`);
  let signedPdfBuffer: Buffer | null = null;

  if (fs.existsSync(offerPdfPath)) {
    try {
      const existingBytes = fs.readFileSync(offerPdfPath);
      const pdfDoc = await PDFDocument.load(existingBytes);
      const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

      // Get last page to stamp signature on
      const pages = pdfDoc.getPages();
      const lastPage = pages[pages.length - 1];
      const { width, height } = lastPage.getSize();

      // Embed signature image
      const sigDataUrl = body.signatureDataUrl as string;
      const base64 = sigDataUrl.split(",")[1];
      const sigBytes = Buffer.from(base64, "base64");
      const sigImage = await pdfDoc.embedPng(sigBytes).catch(() => pdfDoc.embedJpg(sigBytes));
      const sigDims = sigImage.scale(0.4);

      // Signature box on last page
      const sigX = 60;
      const sigY = 80;
      lastPage.drawRectangle({ x: sigX - 4, y: sigY - 4, width: sigDims.width + 8, height: sigDims.height + 8, borderColor: rgb(0.2, 0.6, 0.3), borderWidth: 1, color: rgb(0.97, 1, 0.97) });
      lastPage.drawImage(sigImage, { x: sigX, y: sigY, width: sigDims.width, height: sigDims.height });
      lastPage.drawText("Candidate Signature", { x: sigX, y: sigY - 14, font, size: 8, color: rgb(0.5, 0.5, 0.5) });

      // ── Audit trail page ──
      const auditPage = pdfDoc.addPage([width, height]);
      const margin = 60;
      let y = height - 60;

      auditPage.drawRectangle({ x: 0, y: height - 80, width, height: 80, color: rgb(0.055, 0.22, 0.17) });
      auditPage.drawText("Signature Audit Trail", { x: margin, y: height - 48, font: boldFont, size: 18, color: rgb(1, 1, 1) });
      auditPage.drawText("Document Signing Certificate", { x: margin, y: height - 64, font, size: 10, color: rgb(0.6, 0.9, 0.7) });

      y = height - 110;
      const row = (label: string, value: string) => {
        auditPage.drawText(label, { x: margin, y, font: boldFont, size: 10, color: rgb(0.3, 0.3, 0.3) });
        auditPage.drawText(value, { x: margin + 160, y, font, size: 10, color: rgb(0.1, 0.1, 0.1) });
        y -= 22;
      };

      const candidate = candidatesStore.getById(offer.candidateId);
      const company = companiesStore.getById(offer.companyId);

      row("Document", "Offer Letter");
      row("Signer Name", candidate?.name ?? "—");
      row("Signer Email", candidate?.email ?? "—");
      row("Company", company?.name ?? "—");
      row("Designation", offer.designation);
      y -= 10;
      auditPage.drawLine({ start: { x: margin, y }, end: { x: width - margin, y }, thickness: 0.5, color: rgb(0.85, 0.85, 0.85) });
      y -= 20;
      row("Signed At", new Date(signedAt).toLocaleString("en-US", { timeZoneName: "short" }));
      row("IP Address", ip);
      row("Browser / Device", userAgent.length > 80 ? userAgent.slice(0, 80) + "…" : userAgent);
      y -= 10;
      auditPage.drawLine({ start: { x: margin, y }, end: { x: width - margin, y }, thickness: 0.5, color: rgb(0.85, 0.85, 0.85) });
      y -= 20;
      auditPage.drawText("This audit record is automatically generated and certifies the digital", { x: margin, y, font, size: 9, color: rgb(0.5, 0.5, 0.5) });
      y -= 14;
      auditPage.drawText("acceptance of the above offer letter by the named signer.", { x: margin, y, font, size: 9, color: rgb(0.5, 0.5, 0.5) });

      // Footer
      auditPage.drawLine({ start: { x: margin, y: 50 }, end: { x: width - margin, y: 50 }, thickness: 0.5, color: rgb(0.8, 0.8, 0.8) });
      auditPage.drawText(`${company?.name ?? "Company"} | Confidential | Generated by HRMS E-Onboarding`, { x: margin, y: 32, font, size: 8, color: rgb(0.6, 0.6, 0.6) });

      const pdfBytes = await pdfDoc.save();
      signedPdfBuffer = Buffer.from(pdfBytes);
    } catch (err) {
      console.error("Failed to embed signature in PDF:", err);
    }
  }

  const signedPdfFileName = signedPdfBuffer ? `${offer.id}_signed.pdf` : undefined;
  if (signedPdfBuffer && signedPdfFileName) {
    saveOfferPdf(signedPdfFileName.replace(".pdf", ""), signedPdfBuffer);
  }

  // Update offer record
  offersStore.update(offer.id, {
    status: "accepted",
    signedAt,
    signerIp: ip,
    signerAgent: userAgent,
    signedPdfFileName,
    updatedAt: signedAt,
  });

  // Also update candidate status
  candidatesStore.update(offer.candidateId, { status: "offered", updatedAt: signedAt });

  return ok({
    message: "Offer signed successfully",
    signedAt,
    candidateName: candidatesStore.getById(offer.candidateId)?.name,
  });
}
