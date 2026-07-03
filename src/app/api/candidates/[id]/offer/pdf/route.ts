import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import { offersStore, candidatesStore, companiesStore, getOfferPdfPath, saveOfferPdf } from "@/lib/store";
import { generateOfferLetterPdf } from "@/lib/pdf-generator";
import { getAuthFromRequest, unauthorized, notFound } from "@/lib/api-helpers";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = getAuthFromRequest(req);
  if (!auth) return unauthorized();
  const { id: candidateId } = await params;
  const offers = await offersStore.find((o) => o.candidateId === candidateId);
  const offer = offers[0];
  if (!offer) return notFound("Offer not found");

  const pdfPath = getOfferPdfPath(offer.id);

  // Generate PDF on-demand if it doesn't exist yet
  if (!fs.existsSync(pdfPath)) {
    const candidate = await candidatesStore.getById(candidateId);
    if (!candidate) return notFound("Candidate not found");
    const company = await companiesStore.getById(offer.companyId);
    const pdfBytes = await generateOfferLetterPdf(offer, candidate.name, company?.name ?? "Company");
    saveOfferPdf(offer.id, Buffer.from(pdfBytes));
  }

  const buffer = fs.readFileSync(pdfPath);
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="offer-letter.pdf"`,
    },
  });
}

