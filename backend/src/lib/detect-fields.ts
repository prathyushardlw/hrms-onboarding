import type { PdfFormField, SignatureField } from "@/lib/types";

interface TextItem {
  str: string;
  transform: number[];
  width: number;
  height: number;
}

interface MergedLine {
  y: number;
  x: number;
  endX: number;
  text: string;
  page: number;
  fontSize: number;
}

// Merge text items on the same Y into lines
function mergeToLines(items: TextItem[], pageNum: number): MergedLine[] {
  const lines: MergedLine[] = [];
  let current: MergedLine | null = null;

  for (const item of items) {
    if (!item.str && !item.width) continue;
    const y = Math.round(item.transform[5]);
    const x = Math.round(item.transform[4]);
    const w = Math.round(item.width);
    const fontSize = Math.round(Math.abs(item.transform[0]));
    const endX = x + w;

    if (current && Math.abs(current.y - y) < 4) {
      current.text += item.str;
      current.endX = Math.max(current.endX, endX);
    } else {
      if (current) lines.push(current);
      current = { y, x, endX, text: item.str, page: pageNum, fontSize };
    }
  }
  if (current) lines.push(current);
  return lines;
}

const SKIP_PATTERNS = [
  /copyright/i,
  /all rights reserved/i,
  /proprietary/i,
  /^page \d/i,
  /^note:/i,
  /^see\s+instructions/i,
  /^see\s+specific/i,
];

// Standalone labels (no colon) that should be detected as fields
const STANDALONE_FIELD_LABELS: { pattern: RegExp; type: PdfFormField["type"]; label: string }[] = [
  { pattern: /^social\s*security\s*number$/i, type: "ssn", label: "Social Security Number" },
  { pattern: /^employer\s*identification\s*number$/i, type: "ein", label: "Employer Identification Number" },
];

// Known numbered-field patterns (e.g. IRS forms: "1 Name of entity/individual...")
// Extracts: number, short label, and determines where to place the input
function parseNumberedField(text: string): { label: string; num: string } | null {
  // Match "1 Label text..." or "3a Label text..."
  const m = text.match(/^(\d+[a-z]?)\s+([A-Z][^.]*?)(?:\.\s|$)/);
  if (!m) return null;
  const label = m[2].trim();
  // Must look like a field label, not a paragraph
  if (label.length < 3 || label.length > 80 || label.split(" ").length > 12) return null;
  // Skip if it reads like an instruction or non-fillable description
  if (/\b(?:you must|check the|if you|see the|are required|has been|codes apply|only\s+one|following)\b/i.test(label)) return null;
  return { num: m[1], label };
}

function isSkip(text: string): boolean {
  return SKIP_PATTERNS.some((p) => p.test(text.trim()));
}

function detectFieldsFromLines(
  allLines: MergedLine[],
  pageWidth: number
): { formFields: PdfFormField[]; signatureFields: SignatureField[] } {
  const formFields: PdfFormField[] = [];
  const signatureFields: SignatureField[] = [];
  let idx = 0;

  for (let i = 0; i < allLines.length; i++) {
    const line = allLines[i];
    const text = line.text.trim();
    if (!text || text.length < 2 || isSkip(text)) continue;

    const lower = text.toLowerCase();

    // ---- Signature line ----
    if (
      lower.includes("signature") &&
      !lower.includes("regarding") &&
      !lower.includes("authorize") &&
      !lower.includes("authorization") &&
      !lower.includes("instructions") &&
      !lower.includes("certification")
    ) {
      const hasDate = lower.includes("date");
      const sigW = hasDate
        ? Math.min((pageWidth - line.x - 200) * 0.55, 300)
        : Math.min((pageWidth - line.x - 40) * 0.6, 300);

      signatureFields.push({
        id: `sig_${idx++}`,
        role:
          lower.includes("manager") ||
          lower.includes("issuing") ||
          lower.includes("supervisor") ||
          lower.includes("hr")
            ? "hr"
            : "candidate",
        page: line.page,
        x: line.x,
        y: line.y + 2,
        width: Math.max(sigW, 150),
        height: 30,
      });

      if (hasDate) {
        formFields.push({
          id: `field_${idx++}`,
          label: "Date",
          type: "text",
          page: line.page,
          x: Math.max(line.endX - 150, pageWidth * 0.6),
          y: line.y + 2,
          width: 120,
          height: 16,
          fontSize: 10,
        });
      }
      continue;
    }

    // ---- "Label:" pattern (colon-terminated labels) ----
    const colonMatch = text.match(/^(.+?):\s*([_\-]*)\s*(.*)$/);
    if (colonMatch) {
      const label = colonMatch[1].trim();
      const underscores = colonMatch[2];
      const afterText = colonMatch[3].trim();

      // Skip if label is too long (it's a sentence, not a field label)
      if (label.length < 2 || label.length > 50 || label.split(" ").length > 6) continue;
      // Skip instruction-like labels
      if (/\b(?:see instructions|see also|instructions on|note that)\b/i.test(label)) continue;

      // Determine field type
      let fieldType: PdfFormField["type"] = "text";
      if (/ssn|social\s*security/i.test(label)) fieldType = "ssn";
      if (/ein|employer\s*identification/i.test(label)) fieldType = "ein";

      // Position: after the label
      const labelEndX = line.x + label.length * line.fontSize * 0.6 + 15;
      const fieldX = Math.min(labelEndX, line.x + 180);

      // If there's a second "label:" in the afterText (two fields on one line)
      if (afterText && afterText.includes(":")) {
        const halfW = (pageWidth - line.x - 40) / 2 - 20;
        formFields.push({
          id: `field_${idx++}`,
          label,
          type: fieldType,
          page: line.page,
          x: fieldX,
          y: line.y,
          width: Math.min(halfW - label.length * 4, 150),
          height: 16,
          fontSize: 10,
        });

        const secondMatch = afterText.match(/^(.+?):\s*([_\-]*)/);
        if (secondMatch) {
          const secondLabel = secondMatch[1].trim();
          const secondX = line.x + (pageWidth - line.x) / 2;
          formFields.push({
            id: `field_${idx++}`,
            label: secondLabel,
            type: "text",
            page: line.page,
            x: secondX + secondLabel.length * 6,
            y: line.y,
            width: Math.min(150, pageWidth - secondX - 40),
            height: 16,
            fontSize: 10,
          });
        }
        continue;
      }

      const fieldW = underscores.length > 3
        ? Math.min(underscores.length * 7, pageWidth - fieldX - 40)
        : Math.max(pageWidth - fieldX - 50, 100);

      formFields.push({
        id: `field_${idx++}`,
        label,
        type: fieldType,
        page: line.page,
        x: fieldX,
        y: line.y,
        width: Math.min(fieldW, 300),
        height: 16,
        fontSize: 10,
      });
      continue;
    }

    // ---- Numbered field pattern (e.g. "1 Name of entity/individual") ----
    const numberedField = parseNumberedField(text);
    if (numberedField) {
      let fieldType: PdfFormField["type"] = "text";
      if (/ssn|social\s*security/i.test(numberedField.label)) fieldType = "ssn";
      if (/ein|employer\s*identification/i.test(numberedField.label)) fieldType = "ein";

      formFields.push({
        id: `field_${idx++}`,
        label: numberedField.label.substring(0, 40),
        type: fieldType,
        page: line.page,
        x: line.x,
        y: line.y - 16,
        width: Math.min(pageWidth - line.x - 50, 400),
        height: 16,
        fontSize: 10,
      });
      continue;
    }

    // ---- Standalone known labels (no colon) ----
    for (const known of STANDALONE_FIELD_LABELS) {
      if (known.pattern.test(text)) {
        formFields.push({
          id: `field_${idx++}`,
          label: known.label,
          type: known.type,
          page: line.page,
          x: line.x,
          y: line.y - 18,
          width: Math.min(pageWidth - line.x - 50, 250),
          height: 16,
          fontSize: 10,
        });
        break;
      }
    }

    // ---- Checkbox patterns (■, □, ☐, ☑, bullet + text) ----
    const checkMatch = text.match(/^[■□☐☑✓✗●○►▶▪·•Γûí]\s*(.+)/);
    if (checkMatch) {
      const checkLabel = checkMatch[1].trim();
      // If it has fill-in fields (underscores, No., ID#)
      const fillMatch = checkLabel.match(/(.+?)\s*[(\s](?:No\.|ID#?|Phone\s*#?|#)\s*[_]+/);
      if (fillMatch) {
        formFields.push({
          id: `field_${idx++}`,
          label: checkLabel.split(/[(_]/)[0].trim().substring(0, 40),
          type: "checkbox",
          page: line.page,
          x: line.x,
          y: line.y,
          width: 12,
          height: 12,
        });
        formFields.push({
          id: `field_${idx++}`,
          label: checkLabel.replace(/[_]+/g, "").replace(/[()]/g, "").trim().substring(0, 40),
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
          id: `field_${idx++}`,
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

    // ---- Standalone underline/blank fields ----
    const underscoredCount = (text.match(/_/g) || []).length;
    if (underscoredCount >= 5 && underscoredCount > text.length * 0.3) {
      // Has underscores - look for a label preceding the underscores
      const labelMatch = text.match(/^(.+?)\s*[_]{3,}/);
      if (labelMatch) {
        const label = labelMatch[1].trim().replace(/:$/, "");
        if (label.length >= 2 && label.length <= 50 && label.split(" ").length <= 6) {
          const labelEndX = line.x + label.length * line.fontSize * 0.6 + 15;
          formFields.push({
            id: `field_${idx++}`,
            label: label.substring(0, 40),
            type: "text",
            page: line.page,
            x: Math.min(labelEndX, line.x + 180),
            y: line.y,
            width: Math.min(line.endX - labelEndX + 20, 300),
            height: 16,
            fontSize: 10,
          });
          continue;
        }
      }

      // Pure underline field - check previous line for label
      if (i > 0) {
        const prevText = allLines[i - 1].text.trim().replace(/:$/, "");
        if (prevText.length >= 2 && prevText.length <= 50 && !/[.!?]$/.test(prevText)) {
          formFields.push({
            id: `field_${idx++}`,
            label: prevText.substring(0, 40),
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
    }
  }

  return { formFields, signatureFields };
}

// Main function: pass the pdfjs document object
export async function detectFieldsFromPdf(
  pdfDoc: { numPages: number; getPage: (n: number) => Promise<{
    getTextContent: () => Promise<{ items: TextItem[] }>;
    getViewport: (opts: { scale: number }) => { width: number; height: number };
  }> }
): Promise<{
  formFields: PdfFormField[];
  signatureFields: SignatureField[];
}> {
  const allLines: MergedLine[] = [];

  for (let p = 1; p <= pdfDoc.numPages; p++) {
    const page = await pdfDoc.getPage(p);
    const textContent = await page.getTextContent();
    const pageLines = mergeToLines(textContent.items as TextItem[], p - 1); // 0-indexed
    allLines.push(...pageLines);
  }

  const firstPage = await pdfDoc.getPage(1);
  const vp = firstPage.getViewport({ scale: 1 });
  const nonEmpty = allLines.filter((l) => l.text.trim().length > 0);

  return detectFieldsFromLines(nonEmpty, vp.width);
}
