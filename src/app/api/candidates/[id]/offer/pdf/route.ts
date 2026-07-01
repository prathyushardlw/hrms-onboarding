import { NextRequest, NextResponse } from "next/server";
import { candidatesStore, offersStore, getOfferPdfPath } from "@/lib/store";
import { getAuthFromRequest, unauthorized, forbidden, notFound } from "@/lib/api-helpers";
import fs from "fs";
import path from "path";

type Params = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  const auth = getAuthFromRequest(req);
  if (!auth) return unauthorized();

  const { id: candidateId } = await params;
  const candidate = candidatesStore.getById(candidateId);
  if (!candidate) return notFound("Candidate not found");
  if (auth.role !== "super_admin" && !auth.companyIds.includes(candidate.companyId)) return forbidden();

  const offers = offersStore.find((o) => o.candidateId === candidateId);
  if (offers.length === 0) return notFound("No offer found");
  const offer = offers[0];

  // Prefer signed PDF if available and requested
  const version = new URL(req.url).searchParams.get("version");
  let filePath: string;
  let fileName: string;

  if (version === "signed" && offer.signedPdfFileName) {
    const signedId = offer.signedPdfFileName.replace(".pdf", "");
    filePath = getOfferPdfPath(signedId);
    fileName = `offer_signed_${candidate.name.replace(/\s+/g, "_")}.pdf`;
  } else {
    if (!offer.pdfFileName) return notFound("Offer PDF not generated");
    filePath = getOfferPdfPath(offer.id);
    fileName = `offer_${candidate.name.replace(/\s+/g, "_")}.pdf`;
  }

  if (!fs.existsSync(filePath)) return notFound("Offer PDF file not found");

  const buffer = fs.readFileSync(filePath);
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${fileName}"`,
    },
  });
}
