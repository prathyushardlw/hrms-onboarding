import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { candidatesStore, offersStore, companiesStore, jobsStore, saveOfferPdf } from "@/lib/store";
import {
  getAuthFromRequest, unauthorized, forbidden, badRequest, notFound, ok, created,
} from "@/lib/api-helpers";
import type { OfferLetter } from "@/lib/types";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import { sendEmail, buildOfferEmail } from "@/lib/email";

type Params = { params: Promise<{ id: string }> };

async function generateOfferPdf(offer: OfferLetter, candidateName: string, companyName: string): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595, 842]); // A4
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const { width, height } = page.getSize();
  const margin = 60;

  // Header bar
  page.drawRectangle({ x: 0, y: height - 80, width, height: 80, color: rgb(0.055, 0.22, 0.17) });
  page.drawText(companyName, { x: margin, y: height - 48, font: boldFont, size: 22, color: rgb(1, 1, 1) });
  page.drawText("OFFER LETTER", { x: width - margin - 110, y: height - 48, font: boldFont, size: 14, color: rgb(0.03, 0.75, 0.21) });

  let y = height - 120;

  const line = (text: string, opts: { bold?: boolean; size?: number; color?: [number,number,number]; indent?: number } = {}) => {
    const f = opts.bold ? boldFont : font;
    const sz = opts.size ?? 11;
    const col = opts.color ? rgb(...opts.color as [number,number,number]) : rgb(0.15, 0.15, 0.15);
    page.drawText(text, { x: margin + (opts.indent ?? 0), y, font: f, size: sz, color: col });
    y -= sz + 6;
  };

  const gap = (n = 12) => { y -= n; };

  const dateStr = new Date(offer.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
  line(`Date: ${dateStr}`, { size: 10, color: [0.4, 0.4, 0.4] });
  gap();
  line(`Dear ${candidateName},`, { bold: true, size: 13 });
  gap(6);
  line("We are pleased to extend this offer of employment and look forward to welcoming you", { size: 11 });
  line("to our team. Below are the details of your offer:", { size: 11 });
  gap(16);

  // Details box
  const boxTop = y + 8;
  const rows: [string, string][] = [
    ["Designation", offer.designation],
    ["Department", offer.department],
    ["Compensation (CTC)", offer.ctc],
    ["Date of Joining", new Date(offer.joiningDate).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })],
  ];

  const rowH = 26;
  const boxH = rows.length * rowH + 16;
  page.drawRectangle({ x: margin - 8, y: boxTop - boxH, width: width - (margin - 8) * 2, height: boxH, color: rgb(0.97, 0.99, 0.97), borderColor: rgb(0.8, 0.9, 0.8), borderWidth: 1 });

  y = boxTop - 8;
  for (const [label, value] of rows) {
    line(label, { bold: true, size: 11, indent: 4 });
    y += 17;
    page.drawText(value, { x: margin + 160, y, font, size: 11, color: rgb(0.15, 0.15, 0.15) });
    y -= 9 + 17;
  }
  y -= 8;

  gap(16);
  if (offer.additionalTerms) {
    line("Additional Terms:", { bold: true });
    gap(4);
    // Wrap text roughly
    const words = offer.additionalTerms.split(" ");
    let cur = "";
    for (const w of words) {
      if ((cur + " " + w).length > 90) { line(cur.trim(), { indent: 8 }); cur = w; }
      else cur += " " + w;
    }
    if (cur.trim()) line(cur.trim(), { indent: 8 });
    gap(8);
  }

  gap(16);
  line("This offer is contingent upon successful completion of background verification.", { size: 10, color: [0.4, 0.4, 0.4] });
  gap(8);
  line("Please confirm your acceptance by signing and returning a copy of this letter.", { size: 10, color: [0.4, 0.4, 0.4] });

  gap(40);
  line("Authorised Signatory", { bold: true });
  line(companyName, { size: 10, color: [0.4, 0.4, 0.4] });

  // Footer
  page.drawLine({ start: { x: margin, y: 50 }, end: { x: width - margin, y: 50 }, thickness: 0.5, color: rgb(0.8, 0.8, 0.8) });
  page.drawText(`${companyName} | Confidential`, { x: margin, y: 32, font, size: 9, color: rgb(0.6, 0.6, 0.6) });

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}

export async function GET(req: NextRequest, { params }: Params) {
  const auth = getAuthFromRequest(req);
  if (!auth) return unauthorized();
  const { id: candidateId } = await params;
  const candidate = candidatesStore.getById(candidateId);
  if (!candidate) return notFound("Candidate not found");
  if (auth.role !== "super_admin" && !auth.companyIds.includes(candidate.companyId)) return forbidden();

  const offers = offersStore.find((o) => o.candidateId === candidateId);
  return ok(offers[0] ?? null);
}

export async function POST(req: NextRequest, { params }: Params) {
  const auth = getAuthFromRequest(req);
  if (!auth || !["super_admin", "admin", "hr"].includes(auth.role)) return unauthorized();
  const { id: candidateId } = await params;
  const candidate = candidatesStore.getById(candidateId);
  if (!candidate) return notFound("Candidate not found");
  if (auth.role !== "super_admin" && !auth.companyIds.includes(candidate.companyId)) return forbidden();

  // Only one offer per candidate
  const existing = offersStore.find((o) => o.candidateId === candidateId);
  if (existing.length > 0) return badRequest("Offer already exists. Use PATCH to update.");

  const body = await req.json();
  if (!body.designation?.trim()) return badRequest("Designation is required");
  if (!body.ctc?.trim()) return badRequest("CTC is required");
  if (!body.joiningDate) return badRequest("Joining date is required");

  const job = jobsStore.getById(candidate.jobId);
  const company = companiesStore.getById(candidate.companyId);

  const now = new Date().toISOString();
  const offerId = uuidv4();
  const signToken = uuidv4();
  const offer: OfferLetter = {
    id: offerId,
    candidateId,
    jobId: candidate.jobId,
    companyId: candidate.companyId,
    designation: body.designation.trim(),
    department: body.department?.trim() ?? job?.department ?? "",
    ctc: body.ctc.trim(),
    joiningDate: body.joiningDate,
    additionalTerms: body.additionalTerms?.trim() ?? undefined,
    status: "draft",
    signToken,
    createdAt: now,
    updatedAt: now,
  };

  // Generate PDF
  const pdfBuffer = await generateOfferPdf(offer, candidate.name, company?.name ?? "Company");
  saveOfferPdf(offerId, pdfBuffer);
  offer.pdfFileName = `${offerId}.pdf`;

  offersStore.create(offer);

  // Move candidate to offered stage
  candidatesStore.update(candidateId, { status: "offered", updatedAt: now });

  // Send offer email with PDF attachment + sign link
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const { subject, html } = buildOfferEmail({
    candidateName: candidate.name,
    designation: offer.designation,
    department: offer.department,
    ctc: offer.ctc,
    joiningDate: offer.joiningDate,
    companyName: company?.name ?? "the company",
    signUrl: `${appUrl}/offer-sign/${signToken}`,
  });
  sendEmail({
    to: candidate.email,
    toName: candidate.name,
    subject,
    html,
    attachments: [{
      content: pdfBuffer.toString("base64"),
      name: `Offer_Letter_${candidate.name.replace(/\s+/g, "_")}.pdf`,
    }],
  }).catch(() => {});

  return created({ ...offer, emailSent: true });
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const auth = getAuthFromRequest(req);
  if (!auth || !["super_admin", "admin", "hr"].includes(auth.role)) return unauthorized();
  const { id: candidateId } = await params;
  const candidate = candidatesStore.getById(candidateId);
  if (!candidate) return notFound("Candidate not found");
  if (auth.role !== "super_admin" && !auth.companyIds.includes(candidate.companyId)) return forbidden();

  const offers = offersStore.find((o) => o.candidateId === candidateId);
  if (offers.length === 0) return notFound("No offer found");
  const offer = offers[0];

  const body = await req.json();
  const updates: Record<string, unknown> = { updatedAt: new Date().toISOString() };

  if (body.status !== undefined) {
    if (!["draft", "sent", "accepted", "rejected"].includes(body.status)) return badRequest("Invalid status");
    updates.status = body.status;
  }

  return ok(offersStore.update(offer.id, updates));
}
