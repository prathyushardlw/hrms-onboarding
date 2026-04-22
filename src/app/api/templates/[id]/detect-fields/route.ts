import { NextRequest } from "next/server";
import { templatesStore, getTemplatesDir } from "@/lib/store";
import { getAuthFromRequest, unauthorized, notFound, ok, badRequest } from "@/lib/api-helpers";
import path from "path";
import fs from "fs";
import zlib from "zlib";
import { PDFDocument } from "pdf-lib";
import type { PdfFormField, SignatureField } from "@/lib/types";

interface TextItem {
  text: string;
  x: number;
  y: number;
  fontSize: number;
  page: number;
}

interface MergedLine {
  y: number;
  x: number;
  endX: number;
  text: string;
  page: number;
  fontSize: number;
}

// Extract text items from PDF by decompressing content streams and parsing text operators
function extractTextItems(pdfBuffer: Buffer): TextItem[] {
  const raw = pdfBuffer.toString("binary");
  const items: TextItem[] = [];
  let pageNum = 0;

  // Find all streams in the PDF
  const streamRe = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
  let streamMatch;

  while ((streamMatch = streamRe.exec(raw)) !== null) {
    let decoded: string;
    try {
      decoded = zlib.inflateSync(Buffer.from(streamMatch[1], "binary")).toString("latin1");
    } catch {
      continue;
    }

    // Check if this stream has text operations (skip image/resource streams)
    if (!decoded.includes("Tm") && !decoded.includes("Tj") && !decoded.includes("TJ")) continue;

    const lines = decoded.split(/\r?\n/);
    let currentX = 0;
    let currentY = 0;
    let currentFontSize = 12;
    let hasTextOnPage = false;

    for (const line of lines) {
      // Tm: text matrix (sets absolute position + font size)
      const tmMatch = line.match(
        /([\d.\-]+)\s+([\d.\-]+)\s+([\d.\-]+)\s+([\d.\-]+)\s+([\d.\-]+)\s+([\d.\-]+)\s+Tm/
      );
      if (tmMatch) {
        currentFontSize = Math.abs(parseFloat(tmMatch[1]));
        currentX = parseFloat(tmMatch[5]);
        currentY = parseFloat(tmMatch[6]);
      }

      // Td: relative move
      const tdMatch = line.match(/([\d.\-]+)\s+([\d.\-]+)\s+Td/);
      if (tdMatch) {
        currentX += parseFloat(tdMatch[1]);
        currentY += parseFloat(tdMatch[2]);
      }

      // TJ array: [(text) kern (text)] TJ
      const tjMatch = line.match(/\[(.+)\]\s*TJ/);
      if (tjMatch) {
        let text = "";
        const parts = tjMatch[1].match(/\(([^)]*)\)/g);
        if (parts) {
          text = parts.map((p: string) => p.slice(1, -1)).join("");
        }
        if (text) {
          hasTextOnPage = true;
          items.push({
            text,
            x: Math.round(currentX),
            y: Math.round(currentY),
            fontSize: Math.round(currentFontSize),
            page: pageNum,
          });
        }
      }

      // Single Tj: (text) Tj
      const singleTj = line.match(/\(([^)]*)\)\s*Tj/);
      if (singleTj && singleTj[1]) {
        hasTextOnPage = true;
        items.push({
          text: singleTj[1],
          x: Math.round(currentX),
          y: Math.round(currentY),
          fontSize: Math.round(currentFontSize),
          page: pageNum,
        });
      }
    }

    if (hasTextOnPage) pageNum++;
  }

  return items;
}

function mergeToLines(items: TextItem[]): MergedLine[] {
  const lines: MergedLine[] = [];
  let current: MergedLine | null = null;

  for (const item of items) {
    if (!item.text) continue;
    const estEndX = item.x + item.text.length * item.fontSize * 0.5;

    if (current && Math.abs(current.y - item.y) < 4 && current.page === item.page) {
      current.text += item.text;
      current.endX = Math.max(current.endX, estEndX);
    } else {
      if (current) lines.push(current);
      current = {
        y: item.y,
        x: item.x,
        endX: estEndX,
        text: item.text,
        page: item.page,
        fontSize: item.fontSize,
      };
    }
  }
  if (current) lines.push(current);
  return lines;
}

// Detect label patterns that expect user input
const LABEL_PATTERNS = [
  // Labels ending with colon (Name:, Address:, Phone:, etc.)
  /^(.+?):\s*$/,
  // Labels with underscores after them (Name: ___, Name ___)
  /^(.+?)[:.]?\s*[_]{3,}/,
  // Labels ending with colon followed by dashes
  /^(.+?):\s*-{3,}/,
];

// Labels that are clearly headers/titles, not fields
const SKIP_PATTERNS = [
  /copyright/i,
  /all rights reserved/i,
  /proprietary/i,
  /page \d/i,
  /^(section|part)\s+[ivxlcdm\d]/i,
];

// Common field labels in onboarding documents
const KNOWN_FIELD_LABELS = [
  "name", "employee name", "legal name", "first name", "last name", "middle",
  "address", "city", "state", "zip", "email",
  "phone", "home phone", "alt. phone", "cell phone", "work phone",
  "date", "start date", "hire date", "joining date",
  "signature", "employee signature", "manager signature",
  "department", "position", "title", "designation",
  "ssn", "social security", "ein",
  "bank name", "routing", "account",
  "company name", "employer",
  "emergency contact", "relationship",
];

function isLikelyFieldLabel(text: string): boolean {
  const lower = text.toLowerCase().trim();
  if (SKIP_PATTERNS.some((p) => p.test(lower))) return false;
  if (lower.length < 2 || lower.length > 80) return false;
  return true;
}

function detectFields(
  lines: MergedLine[],
  pageWidth: number,
  pageHeight: number
): { formFields: PdfFormField[]; signatureFields: SignatureField[] } {
  const formFields: PdfFormField[] = [];
  const signatureFields: SignatureField[] = [];
  let fieldIndex = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const text = line.text.trim();
    if (!text || !isLikelyFieldLabel(text)) continue;

    // Check for signature lines
    const lowerText = text.toLowerCase();
    if (
      lowerText.includes("signature") &&
      !lowerText.includes("regarding") &&
      !lowerText.includes("authorize")
    ) {
      // Check if "Date" is on the same line
      const hasDate = lowerText.includes("date");
      const sigWidth = hasDate ? (pageWidth - line.x - 200) * 0.55 : (pageWidth - line.x - 40) * 0.7;

      signatureFields.push({
        id: `sig_${fieldIndex++}`,
        role: lowerText.includes("manager") || lowerText.includes("issuing") || lowerText.includes("hr")
          ? "hr"
          : "candidate",
        page: line.page,
        x: line.x,
        y: line.y + 2,
        width: Math.min(Math.max(sigWidth, 150), 300),
        height: 30,
      });

      // If "Date" is on same line, add a date text field
      if (hasDate) {
        formFields.push({
          id: `field_${fieldIndex++}`,
          label: "Date",
          type: "text",
          page: line.page,
          x: line.endX - 120,
          y: line.y + 2,
          width: 120,
          height: 16,
          fontSize: 10,
        });
      }
      continue;
    }

    // Check for "Label:" pattern  (colon at end, with space after for fill)
    const colonMatch = text.match(/^(.+?):\s*([_\-]*)\s*(.*)$/);
    if (colonMatch) {
      const label = colonMatch[1].trim();
      const underscores = colonMatch[2];
      const afterText = colonMatch[3].trim();

      if (label.length < 2 || label.length > 50) continue;

      // If the label text is too long / is a sentence, skip
      if (label.split(" ").length > 6) continue;

      // Determine field position: right after the label text
      const labelEndX = line.x + label.length * (line.fontSize * 0.6) + 10;
      const fieldX = Math.min(labelEndX, line.x + 180);
      const fieldWidth = Math.max(pageWidth - fieldX - 50, 100);

      // If there are underscores, use their span
      const actualFieldWidth = underscores.length > 3
        ? Math.min(underscores.length * 8, pageWidth - fieldX - 40)
        : fieldWidth;

      // Check for SSN/EIN types
      let fieldType: PdfFormField["type"] = "text";
      if (/ssn|social\s*security/i.test(label)) fieldType = "ssn";
      if (/ein|employer\s*identification/i.test(label)) fieldType = "ein";

      // If after the colon there's another label (e.g., "Home Phone:--- Alt. Phone:---")
      if (afterText && afterText.includes(":")) {
        // Two fields on one line
        const halfWidth = (pageWidth - line.x - 40) / 2 - 20;

        formFields.push({
          id: `field_${fieldIndex++}`,
          label,
          type: fieldType,
          page: line.page,
          x: fieldX,
          y: line.y,
          width: Math.min(halfWidth - label.length * 4, 150),
          height: 16,
          fontSize: 10,
        });

        // Second field
        const secondMatch = afterText.match(/^(.+?):\s*([_\-]*)/);
        if (secondMatch) {
          const secondLabel = secondMatch[1].trim();
          const secondX = line.x + (pageWidth - line.x) / 2;
          formFields.push({
            id: `field_${fieldIndex++}`,
            label: secondLabel,
            type: "text",
            page: line.page,
            x: secondX + secondLabel.length * 7,
            y: line.y,
            width: Math.min(150, pageWidth - secondX - 40),
            height: 16,
            fontSize: 10,
          });
        }
        continue;
      }

      formFields.push({
        id: `field_${fieldIndex++}`,
        label,
        type: fieldType,
        page: line.page,
        x: fieldX,
        y: line.y,
        width: Math.min(actualFieldWidth, 300),
        height: 16,
        fontSize: 10,
      });
      continue;
    }

    // Check for checkbox patterns (■, □, ☐, Γûí, bullet + text)
    if (/^[■□☐☑✓✗●○Γûí]\s*(.+)/.test(text)) {
      const checkLabel = text.replace(/^[■□☐☑✓✗●○Γûí]\s*/, "").trim();
      // Look for fill-in within the checkbox line (e.g., "☐ Cell Phone (ID# ____)")
      const fillMatch = checkLabel.match(/(.+?)\s*\(?(?:No\.|ID#?|Phone\s*#?)\s*[_]+/);
      if (fillMatch) {
        // Has both a checkbox and a fill field
        formFields.push({
          id: `field_${fieldIndex++}`,
          label: checkLabel.split(/[(_]/)[0].trim(),
          type: "checkbox",
          page: line.page,
          x: line.x,
          y: line.y,
          width: 12,
          height: 12,
        });
        // Add the fill field
        formFields.push({
          id: `field_${fieldIndex++}`,
          label: checkLabel.replace(/[_]+/g, "").replace(/[()]/g, "").trim(),
          type: "text",
          page: line.page,
          x: line.x + 200,
          y: line.y,
          width: Math.min(pageWidth - line.x - 250, 200),
          height: 16,
          fontSize: 10,
        });
      } else {
        formFields.push({
          id: `field_${fieldIndex++}`,
          label: checkLabel.substring(0, 40),
          type: "checkbox",
          page: line.page,
          x: line.x,
          y: line.y,
          width: 12,
          height: 12,
        });
      }
      continue;
    }

    // Check for standalone underline fields (lines that are mostly underscores)
    if (/^[_]{5,}/.test(text) || text.replace(/[^_]/g, "").length > text.length * 0.5) {
      // This is a fill-in line - check the previous line for its label
      const prevLine = i > 0 ? lines[i - 1] : null;
      const label = prevLine ? prevLine.text.trim().replace(/:$/, "") : `Field ${fieldIndex + 1}`;
      if (label.length > 50 || /[.!?]$/.test(label)) continue; // Skip sentences

      formFields.push({
        id: `field_${fieldIndex++}`,
        label: label.substring(0, 40),
        type: "text",
        page: line.page,
        x: line.x,
        y: line.y,
        width: Math.min(line.endX - line.x, 300),
        height: 16,
        fontSize: 10,
      });
    }
  }

  return { formFields, signatureFields };
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = getAuthFromRequest(req);
  if (!auth || !["admin", "hr"].includes(auth.role)) return unauthorized();

  const { id } = await params;
  const template = templatesStore.getById(id);
  if (!template) return notFound("Template not found");
  if (!template.fileName) return badRequest("No PDF file uploaded for this template");

  const filePath = path.join(getTemplatesDir(), template.fileName);
  if (!fs.existsSync(filePath)) return notFound("PDF file not found on disk");

  try {
    const fileBuffer = fs.readFileSync(filePath);
    const pdfDoc = await PDFDocument.load(fileBuffer, { ignoreEncryption: true });
    const firstPage = pdfDoc.getPage(0);
    const { width: pageWidth, height: pageHeight } = firstPage.getSize();

    const items = extractTextItems(fileBuffer);
    const allLines = mergeToLines(items);
    // Filter out empty lines
    const nonEmptyLines = allLines.filter((l) => l.text.trim().length > 0);

    const { formFields, signatureFields } = detectFields(nonEmptyLines, pageWidth, pageHeight);

    return ok({
      formFields,
      signatureFields,
      pageCount: pdfDoc.getPageCount(),
      pageSize: { width: pageWidth, height: pageHeight },
      detectedLines: nonEmptyLines.length,
    });
  } catch (error) {
    return badRequest("Failed to analyze PDF: " + (error as Error).message);
  }
}
