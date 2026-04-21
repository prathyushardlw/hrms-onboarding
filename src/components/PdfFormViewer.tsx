"use client";

import { useState, useRef } from "react";
import SignatureCanvas from "react-signature-canvas";
import { X, Loader2, CheckCircle, FileText, Eye } from "lucide-react";

// ── Per-document form fields ──────────────────────────────────────────────────

type FieldDef = {
  key: string;
  label: string;
  type: "text" | "select" | "number";
  options?: string[];
  placeholder?: string;
  required?: boolean;
};

const DOC_EXTRA_FIELDS: Record<string, FieldDef[]> = {
  "W-4 Form": [
    {
      key: "filingStatus",
      label: "Filing Status",
      type: "select",
      required: true,
      options: [
        "Single or Married filing separately",
        "Married filing jointly or Qualifying surviving spouse",
        "Head of Household",
      ],
    },
    {
      key: "multipleJobs",
      label: "Multiple Jobs / Spouse Also Works",
      type: "select",
      options: ["No", "Yes"],
    },
    {
      key: "extraWithholding",
      label: "Extra Withholding Amount ($)",
      type: "number",
      placeholder: "0.00",
    },
  ],
  "W-9 Form": [
    {
      key: "taxClassification",
      label: "Federal Tax Classification",
      type: "select",
      required: true,
      options: [
        "Individual / Sole Proprietor",
        "C Corporation",
        "S Corporation",
        "Partnership",
        "Trust / Estate",
        "LLC",
      ],
    },
    {
      key: "taxIdType",
      label: "Tax ID Type",
      type: "select",
      options: ["SSN", "EIN"],
    },
    {
      key: "taxId",
      label: "Tax ID (last 4 digits only)",
      type: "text",
      placeholder: "XXXX",
    },
  ],
  "Direct Deposit Form": [
    {
      key: "bankName",
      label: "Bank Name",
      type: "text",
      required: true,
      placeholder: "e.g. Chase Bank",
    },
    {
      key: "routingNumber",
      label: "Routing Number",
      type: "text",
      required: true,
      placeholder: "9-digit ABA routing number",
    },
    {
      key: "accountNumber",
      label: "Account Number",
      type: "text",
      required: true,
      placeholder: "Your account number",
    },
    {
      key: "accountType",
      label: "Account Type",
      type: "select",
      required: true,
      options: ["Checking", "Savings"],
    },
    {
      key: "depositType",
      label: "Deposit Type",
      type: "select",
      options: ["Full Net Pay", "Specific Amount", "Remaining Balance"],
    },
  ],
  "I-9 Form": [
    {
      key: "citizenshipStatus",
      label: "Citizenship / Immigration Status",
      type: "select",
      required: true,
      options: [
        "Citizen of the United States",
        "Noncitizen National of the United States",
        "Lawful Permanent Resident",
        "Alien Authorized to Work",
      ],
    },
  ],
  "NDA Agreement": [
    {
      key: "effectiveDate",
      label: "Effective Date",
      type: "text",
      placeholder: "MM/DD/YYYY",
    },
  ],
  "Employment Agreement": [
    {
      key: "salary",
      label: "Agreed Annual Salary ($)",
      type: "number",
      placeholder: "e.g. 75000",
    },
  ],
};

// ── Component ─────────────────────────────────────────────────────────────────

interface PdfFormViewerProps {
  token: string;
  docId: string;
  docName: string;
  onClose: () => void;
  onComplete: () => void;
}

export function PdfFormViewer({
  token,
  docId,
  docName,
  onClose,
  onComplete,
}: PdfFormViewerProps) {
  const [tab, setTab] = useState<"form" | "preview">("form");
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [sigEmpty, setSigEmpty] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const sigRef = useRef<SignatureCanvas | null>(null);

  const extraFields = DOC_EXTRA_FIELDS[docName] ?? [];
  const pdfUrl = `/api/candidate/${token}/document/${docId}/pdf`;

  const requiredFields = extraFields.filter((f) => f.required);
  const allRequiredFilled = requiredFields.every((f) => !!fieldValues[f.key]);

  function setField(key: string, value: string) {
    setFieldValues((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    if (sigEmpty || sigRef.current?.isEmpty()) {
      setError("Please draw your signature before saving.");
      return;
    }
    if (!allRequiredFilled) {
      setError("Please fill in all required fields (marked with *).");
      return;
    }

    setError("");
    setSaving(true);
    try {
      const sigData = sigRef.current!.toDataURL("image/png");
      const fd = new FormData();
      fd.append("action", "fill_and_sign");
      fd.append("signature", sigData);
      fd.append("fieldValues", JSON.stringify(fieldValues));

      const res = await fetch(`/api/candidate/${token}/document/${docId}`, {
        method: "POST",
        body: fd,
      });
      const data = await res.json();

      if (data.success) {
        setSaved(true);
        setTimeout(() => onComplete(), 1200);
      } else {
        setError(data.error || "Failed to save document. Please try again.");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden">

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="bg-blue-50 rounded-lg p-2">
              <FileText className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900">{docName}</h2>
              <p className="text-xs text-gray-400">Complete and sign this document</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors rounded-lg p-1.5 hover:bg-gray-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* ── Tabs ── */}
        <div className="flex border-b border-gray-100 px-6">
          <button
            onClick={() => setTab("form")}
            className={`py-3 px-1 mr-6 text-sm font-medium border-b-2 transition-colors ${
              tab === "form"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            Fill &amp; Sign
          </button>
          <button
            onClick={() => setTab("preview")}
            className={`py-3 px-1 text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
              tab === "preview"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            <Eye className="h-3.5 w-3.5" />
            View Document
          </button>
        </div>

        {/* ── Body ── */}
        <div className="flex-1 overflow-hidden">
          {tab === "form" ? (
            <div className="h-full overflow-y-auto p-6 space-y-6">

              {/* Info banner */}
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                <p className="text-sm text-blue-700 font-medium mb-0.5">
                  Your details are pre-filled
                </p>
                <p className="text-xs text-blue-600">
                  Your name, email, position, department, and start date are already in the
                  document.
                  {extraFields.length > 0
                    ? " Please complete the additional fields below, then add your signature."
                    : " Just add your signature below to complete this document."}
                </p>
              </div>

              {/* Document-specific fields */}
              {extraFields.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Additional Information
                  </h3>
                  {extraFields.map((field) => (
                    <div key={field.key}>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        {field.label}
                        {field.required && (
                          <span className="text-red-500 ml-1">*</span>
                        )}
                      </label>
                      {field.type === "select" ? (
                        <select
                          value={fieldValues[field.key] ?? ""}
                          onChange={(e) => setField(field.key, e.target.value)}
                          className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
                        >
                          <option value="">Select an option…</option>
                          {field.options?.map((opt) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type={field.type}
                          value={fieldValues[field.key] ?? ""}
                          placeholder={field.placeholder}
                          onChange={(e) => setField(field.key, e.target.value)}
                          className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Signature pad */}
              <div className="space-y-2">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Your Signature <span className="text-red-500">*</span>
                </h3>
                <p className="text-xs text-gray-400">
                  Draw your signature using your mouse or finger.
                </p>
                <div className="relative border-2 border-dashed border-gray-200 rounded-xl overflow-hidden bg-gray-50 hover:border-blue-300 transition-colors cursor-crosshair">
                  <SignatureCanvas
                    ref={(ref) => { sigRef.current = ref; }}
                    onEnd={() => setSigEmpty(sigRef.current?.isEmpty() ?? true)}
                    canvasProps={{
                      style: { width: "100%", height: "180px", display: "block" },
                    }}
                    backgroundColor="rgb(249,250,251)"
                  />
                  {sigEmpty && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none select-none gap-1">
                      <span className="text-3xl text-gray-300">✒</span>
                      <p className="text-sm text-gray-400">Sign here</p>
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => { sigRef.current?.clear(); setSigEmpty(true); }}
                  className="text-xs text-gray-400 hover:text-red-500 transition-colors"
                >
                  Clear signature
                </button>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-100 rounded-lg p-3 text-sm text-red-600">
                  {error}
                </div>
              )}
            </div>
          ) : (
            /* PDF preview via browser's built-in PDF viewer */
            <div className="h-full min-h-[400px]">
              <iframe
                src={pdfUrl}
                className="w-full h-full border-0"
                title={`Preview: ${docName}`}
              />
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between bg-gray-50/50">
          <button
            onClick={onClose}
            className="text-sm text-gray-500 hover:text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            Cancel
          </button>
          <div className="flex items-center gap-3">
            {tab === "preview" && (
              <button
                onClick={() => setTab("form")}
                className="text-sm text-blue-600 hover:text-blue-700 px-4 py-2 rounded-lg hover:bg-blue-50 transition-colors"
              >
                Back to Form
              </button>
            )}
            {tab === "form" && (
              <button
                onClick={handleSave}
                disabled={saving || saved}
                className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2.5 rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors shadow-sm"
              >
                {saved ? (
                  <>
                    <CheckCircle className="h-4 w-4" />
                    Signed &amp; Saved!
                  </>
                ) : saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving…
                  </>
                ) : (
                  "Sign & Complete"
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
