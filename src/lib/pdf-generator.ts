// Generates a PDF for each document template, filled with candidate data.
// In production, you'd load real PDF templates from S3/disk and fill them.
// For now, we generate simple PDFs with pdf-lib that look like real forms.

import { PDFDocument, StandardFonts, rgb, PDFPage, PDFFont } from "pdf-lib";
import type { Onboarding, OnboardingDocument, DocumentTemplate } from "./types";
import { templatesStore } from "./store";

function drawField(
  page: PDFPage,
  font: PDFFont,
  label: string,
  value: string,
  x: number,
  y: number,
  width: number
) {
  page.drawText(label, { x, y, size: 9, font, color: rgb(0.4, 0.4, 0.4) });
  page.drawRectangle({
    x,
    y: y - 20,
    width,
    height: 18,
    borderColor: rgb(0.8, 0.8, 0.8),
    borderWidth: 1,
    color: rgb(0.97, 0.97, 0.97),
  });
  page.drawText(value || "", {
    x: x + 4,
    y: y - 16,
    size: 10,
    font,
    color: rgb(0.1, 0.1, 0.1),
  });
}

export async function generateDocumentPdf(
  onboarding: Onboarding,
  doc: OnboardingDocument,
  fieldValues?: Record<string, string>
): Promise<Uint8Array> {
  const template = templatesStore.getById(doc.templateId);
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const page = pdfDoc.addPage([612, 792]); // US Letter

  const { width, height } = page.getSize();
  let y = height - 50;

  // Header bar
  page.drawRectangle({
    x: 0,
    y: height - 80,
    width,
    height: 80,
    color: rgb(0.15, 0.25, 0.45),
  });
  page.drawText(doc.name, {
    x: 40,
    y: height - 50,
    size: 20,
    font: fontBold,
    color: rgb(1, 1, 1),
  });
  page.drawText("Onboarding Document", {
    x: 40,
    y: height - 68,
    size: 10,
    font,
    color: rgb(0.8, 0.85, 0.95),
  });

  y = height - 110;

  // Document info
  page.drawText("EMPLOYEE INFORMATION", {
    x: 40,
    y,
    size: 11,
    font: fontBold,
    color: rgb(0.15, 0.25, 0.45),
  });
  y -= 8;
  page.drawLine({
    start: { x: 40, y },
    end: { x: width - 40, y },
    thickness: 1,
    color: rgb(0.85, 0.85, 0.85),
  });
  y -= 20;

  // Candidate fields
  const col1 = 40;
  const col2 = 310;
  const fieldWidth = 230;

  drawField(page, font, "Full Legal Name", onboarding.candidate.name, col1, y, fieldWidth);
  drawField(page, font, "Email Address", onboarding.candidate.email, col2, y, fieldWidth);
  y -= 50;

  drawField(page, font, "Phone Number", onboarding.candidate.phone, col1, y, fieldWidth);
  drawField(page, font, "Address", onboarding.candidate.address || "", col2, y, fieldWidth);
  y -= 50;

  drawField(page, font, "Position / Title", onboarding.designation, col1, y, fieldWidth);
  drawField(page, font, "Department", onboarding.department, col2, y, fieldWidth);
  y -= 50;

  drawField(
    page,
    font,
    "Employment Type",
    onboarding.employmentType.replace("-", " ").toUpperCase(),
    col1,
    y,
    fieldWidth
  );
  drawField(
    page,
    font,
    "Start Date",
    new Date(onboarding.joiningDate).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }),
    col2,
    y,
    fieldWidth
  );
  y -= 60;

  // Document-specific section
  page.drawText("DOCUMENT DETAILS", {
    x: 40,
    y,
    size: 11,
    font: fontBold,
    color: rgb(0.15, 0.25, 0.45),
  });
  y -= 8;
  page.drawLine({
    start: { x: 40, y },
    end: { x: width - 40, y },
    thickness: 1,
    color: rgb(0.85, 0.85, 0.85),
  });
  y -= 20;

  // Document-specific content based on category
  const category = template?.category || "other";
  const bodyText = getDocumentBodyText(doc.name, category);
  const lines = wrapText(bodyText, font, 10, width - 80);
  for (const line of lines) {
    if (y < 200) break;
    page.drawText(line, { x: 40, y, size: 10, font, color: rgb(0.2, 0.2, 0.2) });
    y -= 16;
  }

  // Additional form fields section (if candidate provided field values)
  if (fieldValues && Object.keys(fieldValues).length > 0) {
    if (y > 250) {
      page.drawText("ADDITIONAL INFORMATION", {
        x: 40,
        y,
        size: 11,
        font: fontBold,
        color: rgb(0.15, 0.25, 0.45),
      });
      y -= 8;
      page.drawLine({
        start: { x: 40, y },
        end: { x: width - 40, y },
        thickness: 1,
        color: rgb(0.85, 0.85, 0.85),
      });
      y -= 20;

      for (const [key, value] of Object.entries(fieldValues)) {
        if (!value || y < 200) continue;
        const label = key
          .replace(/([A-Z])/g, " $1")
          .replace(/^./, (s) => s.toUpperCase())
          .trim();
        drawField(page, font, label, value, 40, y, width - 80);
        y -= 50;
      }
    }
  }

  // Signature section at bottom
  y = 170;
  page.drawLine({
    start: { x: 40, y: y + 10 },
    end: { x: width - 40, y: y + 10 },
    thickness: 1,
    color: rgb(0.85, 0.85, 0.85),
  });

  page.drawText("SIGNATURE", {
    x: 40,
    y: y - 5,
    size: 11,
    font: fontBold,
    color: rgb(0.15, 0.25, 0.45),
  });

  // Signature box placeholder
  page.drawRectangle({
    x: 40,
    y: 70,
    width: 250,
    height: 80,
    borderColor: rgb(0.7, 0.7, 0.7),
    borderWidth: 1,
    borderDashArray: [4, 4],
    color: rgb(0.98, 0.98, 0.98),
  });
  page.drawText("Employee Signature", {
    x: 105,
    y: 55,
    size: 9,
    font,
    color: rgb(0.5, 0.5, 0.5),
  });

  // Date field next to signature
  page.drawText("Date:", {
    x: 330,
    y: 100,
    size: 9,
    font,
    color: rgb(0.4, 0.4, 0.4),
  });
  page.drawLine({
    start: { x: 360, y: 98 },
    end: { x: 530, y: 98 },
    thickness: 1,
    color: rgb(0.7, 0.7, 0.7),
  });
  page.drawText(new Date().toLocaleDateString("en-US"), {
    x: 365,
    y: 100,
    size: 10,
    font,
    color: rgb(0.2, 0.2, 0.2),
  });

  // Footer
  page.drawText(
    `Generated for ${onboarding.candidate.name} | Document ID: ${doc.id.slice(0, 8)}`,
    {
      x: 40,
      y: 25,
      size: 7,
      font,
      color: rgb(0.6, 0.6, 0.6),
    }
  );

  return pdfDoc.save();
}

export async function embedSignatureInPdf(
  existingPdfBytes: Uint8Array,
  signatureDataUrl: string
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(existingPdfBytes);
  const pages = pdfDoc.getPages();
  const lastPage = pages[pages.length - 1];

  // Decode the signature image from data URL
  const base64Data = signatureDataUrl.split(",")[1];
  const signatureBytes = Buffer.from(base64Data, "base64");

  let signatureImage;
  if (signatureDataUrl.includes("image/png")) {
    signatureImage = await pdfDoc.embedPng(signatureBytes);
  } else {
    signatureImage = await pdfDoc.embedJpg(signatureBytes);
  }

  // Scale to fit the signature box (250x80 at position 40,70)
  const sigDims = signatureImage.scale(
    Math.min(240 / signatureImage.width, 70 / signatureImage.height)
  );

  lastPage.drawImage(signatureImage, {
    x: 45 + (240 - sigDims.width) / 2,
    y: 75 + (70 - sigDims.height) / 2,
    width: sigDims.width,
    height: sigDims.height,
  });

  return pdfDoc.save();
}

function getDocumentBodyText(docName: string, category: string): string {
  const texts: Record<string, string> = {
    "I-9 Form":
      "Employment Eligibility Verification — Department of Homeland Security, U.S. Citizenship and Immigration Services. I attest, under penalty of perjury, that I am (check one of the following boxes): A citizen of the United States, A noncitizen national of the United States, A lawful permanent resident, or An alien authorized to work until the expiration date listed. I am aware that federal law provides for imprisonment and/or fines for false statements or use of false documents in connection with the completion of this form. I attest, under penalty of perjury, that the information I have provided is true and correct.",
    "W-4 Form":
      "Employee's Withholding Certificate — Internal Revenue Service. Complete this form so that your employer can withhold the correct federal income tax from your pay. Consider completing a new Form W-4 each year and when your personal or financial situation changes. This form is used to determine the amount of federal income tax withheld from your paycheck.",
    "W-9 Form":
      "Request for Taxpayer Identification Number and Certification — Internal Revenue Service. You are required to provide your correct TIN to prevent backup withholding. The TIN provided must match the name given on your tax return.",
    "Direct Deposit Form":
      "Direct Deposit Authorization — I hereby authorize the company to deposit my pay directly into the bank account(s) listed below. This authorization will remain in effect until I provide written notice of cancellation. Please attach a voided check or bank letter confirming routing and account numbers.",
    "NDA Agreement":
      "Non-Disclosure Agreement — This agreement is entered into between the Employee and the Company. The Employee agrees to hold in confidence and not disclose any proprietary information, trade secrets, client data, business strategies, or internal processes learned during the course of employment. This obligation survives the termination of employment for a period of two (2) years.",
    "Employment Agreement":
      "Employment Agreement — This agreement sets forth the terms and conditions of employment between the Employee and the Company. Employment is at-will unless otherwise stated. The Employee agrees to devote their full professional time and effort to the duties assigned. Compensation, benefits, and other terms are as outlined in the offer letter accompanying this agreement.",
    "Internship Agreement":
      "Internship Agreement — This agreement outlines the terms of the internship program. The intern acknowledges that this is a learning opportunity and agrees to follow company policies and procedures during the internship period.",
  };
  return (
    texts[docName] ||
    `This document requires your review and signature. By signing below, you acknowledge that you have read and understood the terms of this ${category} document and agree to comply with all requirements stated herein. Please review all information carefully before signing.`
  );
}

function wrapText(text: string, font: PDFFont, fontSize: number, maxWidth: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const testWidth = font.widthOfTextAtSize(testLine, fontSize);
    if (testWidth > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) lines.push(currentLine);
  return lines;
}
