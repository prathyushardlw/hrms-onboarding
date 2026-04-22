"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import SignatureCanvas from "react-signature-canvas";
import { Loader2, Pen, Check, X, Save } from "lucide-react";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import type { PdfFormField } from "@/lib/types";

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface PdfFormFillerProps {
  pdfUrl: string;
  documentName: string;
  isSigned: boolean;
  formFields: PdfFormField[];
  onSubmit: (data: {
    fieldValues: Record<string, string>;
    signatureDataUrl: string;
  }) => Promise<void>;
  onClose: () => void;
}

export default function PdfFormFiller({
  pdfUrl,
  documentName,
  isSigned,
  formFields,
  onSubmit,
  onClose,
}: PdfFormFillerProps) {
  const [numPages, setNumPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showSignaturePad, setShowSignaturePad] = useState(false);
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [pdfPageSize, setPdfPageSize] = useState({ width: 612, height: 792 });
  const sigRef = useRef<SignatureCanvas | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [renderWidth, setRenderWidth] = useState(612);

  // Scale factor: rendered pixels / PDF points
  const scale = renderWidth / pdfPageSize.width;

  useEffect(() => {
    function handleResize() {
      if (containerRef.current) {
        const w = containerRef.current.clientWidth;
        setRenderWidth(Math.min(w - 32, 800));
      }
    }
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const onDocumentLoadSuccess = useCallback(
    ({ numPages }: { numPages: number }) => {
      setNumPages(numPages);
      setLoading(false);
    },
    []
  );

  const onPageLoadSuccess = useCallback(
    (page: { originalWidth: number; originalHeight: number }) => {
      setPdfPageSize({ width: page.originalWidth, height: page.originalHeight });
    },
    []
  );

  const updateField = (fieldId: string, value: string) => {
    setFieldValues((prev) => ({ ...prev, [fieldId]: value }));
  };

  // For radio-like checkbox groups: only one can be checked
  const toggleCheckbox = (field: PdfFormField) => {
    if (field.group) {
      // Uncheck all others in the same group, toggle this one
      const newValues = { ...fieldValues };
      formFields
        .filter((f) => f.group === field.group && f.type === "checkbox")
        .forEach((f) => {
          newValues[f.id] = f.id === field.id && fieldValues[f.id] !== "true" ? "true" : "";
        });
      // If toggling on, set this one
      if (fieldValues[field.id] !== "true") {
        newValues[field.id] = "true";
      }
      setFieldValues(newValues);
    } else {
      setFieldValues((prev) => ({
        ...prev,
        [field.id]: prev[field.id] === "true" ? "" : "true",
      }));
    }
  };

  const handleFillAndSign = async () => {
    if (!sigRef.current || sigRef.current.isEmpty()) return;
    setSubmitting(true);
    try {
      const dataUrl = sigRef.current.toDataURL("image/png");
      // Build a label->value map for embedding into PDF
      const labeledValues: Record<string, string> = {};
      formFields.forEach((f) => {
        const val = fieldValues[f.id];
        if (val) {
          labeledValues[f.id] = val;
        }
      });
      await onSubmit({ fieldValues: labeledValues, signatureDataUrl: dataUrl });
      setShowSignaturePad(false);
    } catch (err) {
      console.error("Submit failed:", err);
    }
    setSubmitting(false);
  };

  // Convert PDF coordinates (origin bottom-left) to CSS (origin top-left)
  const pdfToCSS = (field: PdfFormField) => {
    const left = field.x * scale;
    const width = field.width * scale;
    const height = field.height * scale;
    // PDF y is from bottom, CSS top is from top
    const top = (pdfPageSize.height - field.y - field.height) * scale;
    return { left, top, width, height };
  };

  const renderFieldOverlay = (field: PdfFormField, pageIndex: number) => {
    if (field.page !== pageIndex) return null;
    const pos = pdfToCSS(field);
    const commonStyle: React.CSSProperties = {
      position: "absolute",
      left: pos.left,
      top: pos.top,
      width: pos.width,
      height: pos.height,
      zIndex: 10,
    };

    if (field.type === "checkbox") {
      const isChecked = fieldValues[field.id] === "true";
      return (
        <button
          key={field.id}
          title={field.label}
          onClick={() => !isSigned && toggleCheckbox(field)}
          disabled={isSigned}
          style={{
            ...commonStyle,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: isSigned ? "default" : "pointer",
            background: isChecked ? "rgba(37, 99, 235, 0.15)" : "rgba(255,255,255,0.3)",
            border: "1.5px solid rgba(37, 99, 235, 0.4)",
            borderRadius: 2,
          }}
        >
          {isChecked && (
            <Check className="text-blue-700" style={{ width: pos.height * 0.7, height: pos.height * 0.7 }} />
          )}
        </button>
      );
    }

    // text / ssn / ein
    const fontSize = (field.fontSize || 11) * scale;
    return (
      <input
        key={field.id}
        type="text"
        title={field.label}
        placeholder={isSigned ? "" : field.label}
        value={fieldValues[field.id] || ""}
        onChange={(e) => !isSigned && updateField(field.id, e.target.value)}
        readOnly={isSigned}
        style={{
          ...commonStyle,
          fontSize: Math.max(fontSize, 9),
          fontFamily: "Arial, sans-serif",
          padding: "0 3px",
          background: isSigned
            ? "transparent"
            : fieldValues[field.id]
            ? "rgba(255,255,255,0.85)"
            : "rgba(219, 234, 254, 0.45)",
          border: isSigned ? "none" : "1px solid rgba(37, 99, 235, 0.3)",
          borderRadius: 2,
          outline: "none",
          color: "#111",
          boxSizing: "border-box",
        }}
      />
    );
  };

  const filledCount = Object.values(fieldValues).filter((v) => v && v.trim()).length;
  const totalFields = formFields.length;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="h-5 w-5" />
          </button>
          <h3 className="font-semibold text-gray-900 text-sm sm:text-base truncate">
            {documentName}
          </h3>
          {isSigned && (
            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
              <Check className="h-3 w-3" /> Signed
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          {!isSigned && (
            <>
              <span className="text-xs text-gray-500 hidden sm:inline">
                {filledCount}/{totalFields} fields filled
              </span>
              <button
                onClick={() => setShowSignaturePad(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 flex items-center gap-2"
              >
                <Pen className="h-4 w-4" />
                Fill & Sign
              </button>
            </>
          )}
        </div>
      </div>

      {/* PDF with overlaid form fields */}
      <div ref={containerRef} className="flex-1 overflow-auto bg-gray-100 flex justify-center">
        <div className="py-4">
          {loading && (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
          )}

          <Document
            file={pdfUrl}
            onLoadSuccess={onDocumentLoadSuccess}
            loading={null}
            className="flex flex-col items-center gap-4"
          >
            {Array.from(new Array(numPages), (_, index) => (
              <div
                key={`page_${index}`}
                className="shadow-lg rounded-lg overflow-hidden relative"
                style={{ width: renderWidth }}
              >
                <Page
                  pageNumber={index + 1}
                  width={renderWidth}
                  renderTextLayer={false}
                  renderAnnotationLayer={false}
                  onLoadSuccess={index === 0 ? onPageLoadSuccess : undefined}
                />
                {/* Form field overlays for this page */}
                {formFields.map((field) => renderFieldOverlay(field, index))}
              </div>
            ))}
          </Document>
        </div>
      </div>

      {/* Footer */}
      {numPages > 0 && !isSigned && (
        <div className="bg-white border-t border-gray-200 px-4 py-2 flex items-center justify-between flex-shrink-0">
          <span className="text-xs text-gray-500">
            Fill in the fields on the form, then click "Fill & Sign" to add your signature
          </span>
          <span className="text-xs text-gray-400">{numPages} page{numPages !== 1 ? "s" : ""}</span>
        </div>
      )}

      {/* Signature Pad Modal */}
      {showSignaturePad && (
        <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Sign: {documentName}</h3>
              <button
                onClick={() => setShowSignaturePad(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-sm text-gray-500 mb-3">
              Draw your signature below. Your filled fields and signature will be embedded into the PDF.
            </p>

            <div className="border-2 border-gray-300 rounded-lg overflow-hidden bg-white">
              <SignatureCanvas
                ref={(ref) => { sigRef.current = ref; }}
                canvasProps={{
                  className: "w-full",
                  style: { width: "100%", height: "180px" },
                }}
                backgroundColor="white"
                penColor="black"
              />
            </div>

            <div className="flex items-center justify-between mt-4">
              <button
                onClick={() => sigRef.current?.clear()}
                className="text-sm text-gray-500 hover:text-gray-700 px-3 py-1.5"
              >
                Clear
              </button>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowSignaturePad(false)}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={handleFillAndSign}
                  disabled={submitting}
                  className="bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                >
                  {submitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  Apply & Save to PDF
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
