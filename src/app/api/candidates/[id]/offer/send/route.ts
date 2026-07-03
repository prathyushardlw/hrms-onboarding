import { NextRequest } from "next/server";
import fs from "fs";
import { offersStore, candidatesStore, companiesStore, getOfferPdfPath, saveOfferPdf } from "@/lib/store";
import { generateOfferLetterPdf } from "@/lib/pdf-generator";
import { sendEmail } from "@/lib/email";
import { getAuthFromRequest, unauthorized, ok, notFound } from "@/lib/api-helpers";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = getAuthFromRequest(req);
  if (!auth || !["super_admin", "admin", "hr"].includes(auth.role)) return unauthorized();
  const { id: candidateId } = await params;

  const candidate = await candidatesStore.getById(candidateId);
  if (!candidate) return notFound("Candidate not found");

  const offers = await offersStore.find((o) => o.candidateId === candidateId);
  const offer = offers[0];
  if (!offer) return notFound("Offer not found");

  const company = await companiesStore.getById(offer.companyId);
  const companyName = company?.name ?? "Company";

  // Generate PDF if it doesn't exist yet
  const pdfPath = getOfferPdfPath(offer.id);
  if (!fs.existsSync(pdfPath)) {
    const pdfBytes = await generateOfferLetterPdf(offer, candidate.name, companyName);
    saveOfferPdf(offer.id, Buffer.from(pdfBytes));
  }

  // Send offer email to candidate
  const joiningDate = new Date(offer.joiningDate).toLocaleDateString("en-IN", {
    day: "numeric", month: "long", year: "numeric",
  });

  const emailSent = await sendEmail({
    to: candidate.email,
    toName: candidate.name,
    subject: `Offer Letter — ${offer.designation} at ${companyName}`,
    html: `<p>Dear ${candidate.name},</p>
<p>We are pleased to offer you the position of <strong>${offer.designation}</strong>${offer.department ? ` in the <strong>${offer.department}</strong> department` : ""} at <strong>${companyName}</strong>.</p>
<p><strong>Compensation (CTC):</strong> ${offer.ctc}<br/>
<strong>Date of Joining:</strong> ${joiningDate}</p>
<p>Please review the offer and get back to us at the earliest.</p>
<p>We look forward to having you on board!</p>
<p>Regards,<br/>${companyName}</p>`,
  });

  // Update offer status to "sent"
  const now = new Date().toISOString();
  const updated = await offersStore.update(offer.id, { status: "sent", updatedAt: now });

  return ok({ emailSent, offer: updated });
}
