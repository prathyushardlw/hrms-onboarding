"use client";

import { useEffect, useState, use } from "react";
import { useAuth, useAuthFetch } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { ArrowLeft, Upload, Loader2, Wand2 } from "lucide-react";
import dynamic from "next/dynamic";
import type { DocumentTemplate, PdfFormField, SignatureField } from "@/lib/types";
import { pdfjs } from "react-pdf";

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

const PdfFieldDesigner = dynamic(
  () => import("@/components/PdfFieldDesigner"),
  { ssr: false }
);

export default function TemplateDesignPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { token } = useAuth();
  const authFetch = useAuthFetch();
  const router = useRouter();
  const [template, setTemplate] = useState<DocumentTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showDesigner, setShowDesigner] = useState(false);
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const [detecting, setDetecting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    loadTemplate();
  }, []);

  async function loadTemplate() {
    setLoading(true);
    const res = await authFetch(`/api/templates/${id}`);
    if (res.success) {
      setTemplate(res.data);
    } else {
      setError("Template not found");
    }
    setLoading(false);
  }

  async function handleUploadPdf(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError("");
    const formData = new FormData();
    formData.append("pdf", file);

    const res = await authFetch(`/api/templates/${id}/upload`, {
      method: "POST",
      body: formData,
    });

    if (res.success) {
      setTemplate(res.data);
    } else {
      setError(res.error || "Upload failed");
    }
    setUploading(false);
  }

  async function handleSaveFields(
    formFields: import("@/lib/types").PdfFormField[],
    signatureFields: import("@/lib/types").SignatureField[]
  ) {
    const res = await authFetch(`/api/templates/${id}`, {
      method: "PUT",
      body: JSON.stringify({
        formFields,
        signatureFields,
        updatedAt: new Date().toISOString(),
      }),
    });

    if (res.success) {
      setTemplate(res.data);
      setShowDesigner(false);
    } else {
      throw new Error(res.error || "Save failed");
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
      </div>
    );
  }

  if (!template) {
    return (
      <div className="space-y-4">
        <button
          onClick={() => router.push("/dashboard/templates")}
          className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Templates
        </button>
        <p className="text-red-600">{error || "Template not found"}</p>
      </div>
    );
  }

  if (showDesigner && template.fileName && pdfBlobUrl) {
    return (
      <PdfFieldDesigner
        pdfUrl={pdfBlobUrl}
        templateName={template.name}
        existingFormFields={template.formFields || []}
        existingSignatureFields={template.signatureFields || []}
        onSave={handleSaveFields}
        onClose={() => setShowDesigner(false)}
      />
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push("/dashboard/templates")}
          className="text-gray-400 hover:text-gray-600"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h2 className="text-xl font-bold text-gray-900">{template.name}</h2>
          <p className="text-sm text-gray-500">
            Design field positions for this template
          </p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 text-sm px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Step 1: Upload PDF */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="font-semibold text-gray-900 mb-1">Step 1: Upload PDF Template</h3>
        <p className="text-sm text-gray-500 mb-4">
          Upload the actual PDF form that candidates will fill out.
        </p>

        {template.fileName ? (
          <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-lg px-4 py-3">
            <div>
              <p className="text-sm font-medium text-green-800">
                PDF uploaded: {template.fileName}
              </p>
              <p className="text-xs text-green-600 mt-0.5">
                You can re-upload to replace it.
              </p>
            </div>
            <label className="text-sm text-green-700 hover:text-green-900 cursor-pointer font-medium">
              Replace
              <input
                type="file"
                accept=".pdf"
                onChange={handleUploadPdf}
                className="hidden"
              />
            </label>
          </div>
        ) : (
          <label className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg px-6 py-10 cursor-pointer hover:border-blue-400 hover:bg-emerald-50/50 transition-colors">
            {uploading ? (
              <Loader2 className="h-8 w-8 animate-spin text-emerald-700" />
            ) : (
              <>
                <Upload className="h-8 w-8 text-gray-400 mb-2" />
                <span className="text-sm font-medium text-gray-700">
                  Click to upload PDF
                </span>
                <span className="text-xs text-gray-500 mt-1">
                  PDF files only
                </span>
              </>
            )}
            <input
              type="file"
              accept=".pdf"
              onChange={handleUploadPdf}
              className="hidden"
              disabled={uploading}
            />
          </label>
        )}
      </div>

      {/* Step 2: Design Fields */}
      <div
        className={`bg-white rounded-xl border border-gray-200 p-6 ${
          !template.fileName ? "opacity-50 pointer-events-none" : ""
        }`}
      >
        <h3 className="font-semibold text-gray-900 mb-1">
          Step 2: Position Fields on PDF
        </h3>
        <p className="text-sm text-gray-500 mb-4">
          Auto-detect reads the PDF and pre-fills field positions. You can then
          adjust, add, or remove fields in the visual designer.
        </p>

        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={async () => {
              setDetecting(true);
              setError("");
              try {
                // Load PDF with auth
                const pdfRes = await fetch(`/api/templates/${id}/pdf`, {
                  headers: { Authorization: `Bearer ${token}` },
                });
                if (!pdfRes.ok) {
                  setError("Failed to load PDF");
                  setDetecting(false);
                  return;
                }
                const blob = await pdfRes.blob();
                const blobUrl = URL.createObjectURL(blob);
                setPdfBlobUrl(blobUrl);

                // If no existing fields, auto-detect using client-side pdfjs
                const hasExisting = (template.formFields?.length || 0) > 0;
                if (!hasExisting) {
                  const arrayBuf = await blob.arrayBuffer();
                  const pdfDoc = await pdfjs.getDocument({ data: arrayBuf }).promise;
                  const { detectFieldsFromPdf } = await import("@/lib/detect-fields");
                  const detected = await detectFieldsFromPdf(pdfDoc);

                  // Save detected fields to template
                  if (detected.formFields.length > 0 || detected.signatureFields.length > 0) {
                    const saveRes = await authFetch(`/api/templates/${id}`, {
                      method: "PUT",
                      body: JSON.stringify({
                        formFields: detected.formFields,
                        signatureFields: detected.signatureFields,
                      }),
                    });
                    if (saveRes.success) setTemplate(saveRes.data);
                  }
                }

                setShowDesigner(true);
              } catch (err) {
                setError("Detection failed: " + (err as Error).message);
              }
              setDetecting(false);
            }}
            disabled={!template.fileName || detecting}
            className="bg-[#0e382b] text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-[#18471c] disabled:opacity-50 flex items-center gap-2"
          >
            {detecting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Wand2 className="h-4 w-4" />
            )}
            {detecting ? "Detecting fields..." : "Auto-Detect & Open Designer"}
          </button>

          <button
            onClick={async () => {
              const res = await fetch(`/api/templates/${id}/pdf`, {
                headers: { Authorization: `Bearer ${token}` },
              });
              if (res.ok) {
                const blob = await res.blob();
                setPdfBlobUrl(URL.createObjectURL(blob));
                setShowDesigner(true);
              } else {
                setError("Failed to load PDF");
              }
            }}
            disabled={!template.fileName}
            className="border border-gray-300 text-gray-700 px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
          >
            Open Designer (manual)
          </button>

          {(template.formFields?.length || 0) > 0 && (
            <span className="text-sm text-gray-500">
              {template.formFields!.length} fields ·{" "}
              {template.signatureFields?.length || 0} signature areas configured
            </span>
          )}
        </div>
      </div>

      {/* Summary */}
      {template.formFields && template.formFields.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-3">Configured Fields</h3>
          <div className="space-y-1.5">
            {template.formFields.map((f) => (
              <div
                key={f.id}
                className="flex items-center justify-between text-sm px-3 py-2 bg-gray-50 rounded-lg"
              >
                <span className="font-medium text-gray-700">{f.label}</span>
                <span className="text-xs text-gray-400">
                  {f.type} · page {f.page + 1} · ({Math.round(f.x)}, {Math.round(f.y)}) ·{" "}
                  {Math.round(f.width)}×{Math.round(f.height)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
