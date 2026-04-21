"use client";

<<<<<<< HEAD
import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
=======
import { useEffect, useState, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import dynamic from "next/dynamic";
>>>>>>> 5ee52b558ebf2a59190ff98d27e70362dd621648
import {
  CheckCircle, Clock, FileText, Upload, AlertTriangle,
  Eye, Loader2, Send
} from "lucide-react";
<<<<<<< HEAD
import { PdfFormViewer } from "@/components/PdfFormViewer";
=======

// Dynamically import PDF viewer to avoid SSR issues with pdfjs
const PdfSignViewer = dynamic(() => import("@/components/PdfSignViewer"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
    </div>
  ),
});
>>>>>>> 5ee52b558ebf2a59190ff98d27e70362dd621648

interface CandidateDocument {
  id: string;
  name: string;
  required: boolean;
  uploadRequired: boolean;
  status: string;
  correctionNote?: string;
}

interface CandidateOnboarding {
  id: string;
  candidateName: string;
  companyId: string;
  designation: string;
  department: string;
  joiningDate: string;
  status: string;
  documents: CandidateDocument[];
}

const docStatusConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  pending: { label: "Pending", color: "bg-gray-100 text-gray-600", icon: Clock },
  filled: { label: "Filled", color: "bg-blue-50 text-blue-600", icon: FileText },
  signed: { label: "Signed", color: "bg-green-50 text-green-600", icon: CheckCircle },
  uploaded: { label: "Uploaded", color: "bg-indigo-50 text-indigo-600", icon: Upload },
  verified: { label: "Verified", color: "bg-emerald-50 text-emerald-600", icon: CheckCircle },
  correction_requested: { label: "Correction Needed", color: "bg-red-50 text-red-600", icon: AlertTriangle },
};

export default function CandidatePortalPage() {
  const { token } = useParams();
  const [onboarding, setOnboarding] = useState<CandidateOnboarding | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
<<<<<<< HEAD
  const [activeDoc, setActiveDoc] = useState<string | null>(null);
  const [viewerDoc, setViewerDoc] = useState<CandidateDocument | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
=======
  const [actionLoading, setActionLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // PDF viewer state
  const [viewingDoc, setViewingDoc] = useState<CandidateDocument | null>(null);

  // Upload ref per document
>>>>>>> 5ee52b558ebf2a59190ff98d27e70362dd621648
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadDocId, setUploadDocId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      const res = await fetch(`/api/candidate/${token}`);
      const data = await res.json();
      if (data.success) {
        setOnboarding(data.data);
        if (data.data.status === "submitted") setSubmitted(true);
      } else {
        setError(data.error || "Invalid or expired link");
      }
    } catch {
      setError("Failed to load onboarding data");
    }
    setLoading(false);
  }, [token]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleUpload = async (docId: string, file: File) => {
    setActionLoading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("action", "upload");

    try {
      const res = await fetch(`/api/candidate/${token}/document/${docId}`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (data.success) await loadData();
    } catch {
      // handled
    }
    setActionLoading(false);
  };

<<<<<<< HEAD

=======
  const handleSignOnPdf = async (docId: string, signatureDataUrl: string) => {
    const formData = new FormData();
    formData.append("signature", signatureDataUrl);
    formData.append("action", "sign");

    const res = await fetch(`/api/candidate/${token}/document/${docId}`, {
      method: "POST",
      body: formData,
    });
    const data = await res.json();
    if (data.success) {
      setViewingDoc(null);
      await loadData();
    } else {
      throw new Error(data.error || "Signing failed");
    }
  };
>>>>>>> 5ee52b558ebf2a59190ff98d27e70362dd621648

  const handleSubmitAll = async () => {
    setActionLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/candidate/${token}/submit`, {
        method: "POST",
      });
      const data = await res.json();
      if (data.success) {
        setSubmitted(true);
        await loadData();
      } else {
        setError(data.error);
      }
    } catch {
      setError("Failed to submit");
    }
    setActionLoading(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error && !onboarding) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md text-center">
          <AlertTriangle className="h-12 w-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-lg font-bold text-gray-900 mb-2">Unable to Load</h2>
          <p className="text-gray-500">{error}</p>
        </div>
      </div>
    );
  }

  if (
    submitted ||
    onboarding?.status === "submitted" ||
    onboarding?.status === "verified" ||
    onboarding?.status === "completed"
  ) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md text-center">
          <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
          <h2 className="text-lg font-bold text-gray-900 mb-2">Documents Submitted!</h2>
          <p className="text-gray-500">
            Thank you, {onboarding?.candidateName}. Your onboarding documents
            have been submitted successfully. HR will review them shortly.
          </p>
        </div>
      </div>
    );
  }

  if (!onboarding) return null;

  const completedDocs = onboarding.documents.filter((d) =>
    ["signed", "uploaded", "filled", "verified"].includes(d.status)
  ).length;

  const allRequiredDone = onboarding.documents
    .filter((d) => d.required)
    .every((d) => ["signed", "uploaded", "filled", "verified"].includes(d.status));

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h1 className="text-xl font-bold text-gray-900">
            Welcome, {onboarding.candidateName}!
          </h1>
          <p className="text-gray-500 mt-1 text-sm">
            Review each document, sign it on the PDF, then submit all documents.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-gray-600">
            <span>{onboarding.designation}</span>
            <span>·</span>
            <span>{onboarding.department}</span>
            <span>·</span>
            <span>Joining {new Date(onboarding.joiningDate).toLocaleDateString()}</span>
          </div>
          <div className="mt-4 bg-gray-50 rounded-lg p-3 flex items-center justify-between">
            <span className="text-sm text-gray-600">
              Progress: {completedDocs}/{onboarding.documents.length} documents
            </span>
            <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-600 rounded-full transition-all"
                style={{
                  width: `${(completedDocs / onboarding.documents.length) * 100}%`,
                }}
              />
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg">{error}</div>
        )}

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file && uploadDocId) {
              handleUpload(uploadDocId, file);
              setUploadDocId(null);
            }
            e.target.value = "";
          }}
        />

        {/* Document List */}
        <div className="space-y-3">
          {onboarding.documents.map((doc) => {
            const ds = docStatusConfig[doc.status] || docStatusConfig.pending;
            const Icon = ds.icon;
            const isSigned = doc.status === "signed";
            const needsAction = ["pending", "correction_requested"].includes(doc.status);
            const needsUpload = doc.name.includes("License") || doc.name.includes("SSN") || doc.name.includes("Banking");

            return (
              <div
                key={doc.id}
                className="bg-white rounded-xl shadow-sm overflow-hidden"
              >
<<<<<<< HEAD
                <div
                  className="p-4 flex items-center gap-4 cursor-pointer hover:bg-gray-50"
                  onClick={() => {
                    if (needsAction && !doc.uploadRequired) {
                      setViewerDoc(doc);
                    } else {
                      setActiveDoc(isActive ? null : doc.id);
                    }
                  }}
                >
=======
                <div className="p-4 flex items-center gap-4">
>>>>>>> 5ee52b558ebf2a59190ff98d27e70362dd621648
                  <Icon className={`h-5 w-5 flex-shrink-0 ${ds.color.split(" ")[1]}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">
                      {doc.name}
                      {doc.required && <span className="text-red-500 ml-1">*</span>}
                    </p>
                    {doc.correctionNote && (
                      <p className="text-xs text-red-500 mt-0.5">{doc.correctionNote}</p>
                    )}
                    {isSigned && (
                      <p className="text-xs text-green-600 mt-0.5">Signed and saved to PDF</p>
                    )}
                  </div>

<<<<<<< HEAD
                {isActive && needsAction && doc.uploadRequired && (
                  <div className="px-4 pb-4 pt-2 border-t border-gray-100">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleUpload(doc.id, file);
                      }}
                    />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={actionLoading}
                      className="w-full border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-blue-400 hover:bg-blue-50 transition-colors"
                    >
                      <Upload className="h-5 w-5 mx-auto text-gray-400 mb-1" />
                      <p className="text-sm text-gray-600">Click to upload file</p>
                      <p className="text-xs text-gray-400">PDF, JPG, PNG, DOC</p>
                    </button>
                  </div>
                )}

                {needsAction && !doc.uploadRequired && (
                  <div className="px-4 pb-4 pt-0 border-t border-gray-100">
                    <button
                      onClick={() => setViewerDoc(doc)}
                      className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 mt-3"
                    >
                      <Pen className="h-4 w-4" /> Fill &amp; Sign
=======
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${ds.color}`}>
                      {ds.label}
                    </span>

                    {/* View & Sign PDF button */}
                    <button
                      onClick={() => setViewingDoc(doc)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        needsAction
                          ? "bg-blue-600 text-white hover:bg-blue-700"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                    >
                      <Eye className="h-3.5 w-3.5" />
                      {needsAction ? "View & Sign" : "View PDF"}
>>>>>>> 5ee52b558ebf2a59190ff98d27e70362dd621648
                    </button>

                    {/* Upload button for identity/banking docs */}
                    {needsUpload && needsAction && (
                      <button
                        onClick={() => {
                          setUploadDocId(doc.id);
                          fileInputRef.current?.click();
                        }}
                        disabled={actionLoading}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
                      >
                        <Upload className="h-3.5 w-3.5" />
                        Upload
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Submit All */}
        <button
          onClick={handleSubmitAll}
          disabled={!allRequiredDone || actionLoading}
          className="w-full bg-green-600 text-white py-3 rounded-xl font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {actionLoading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Send className="h-5 w-5" />
          )}
          Submit All Documents
        </button>

        {!allRequiredDone && (
          <p className="text-center text-xs text-gray-400">
            Sign all required documents (*) to enable submission.
          </p>
        )}
      </div>

<<<<<<< HEAD
      {/* PDF Form Viewer */}
      {viewerDoc && (
        <PdfFormViewer
          token={token as string}
          docId={viewerDoc.id}
          docName={viewerDoc.name}
          onClose={() => setViewerDoc(null)}
          onComplete={async () => {
            setViewerDoc(null);
            await loadData();
          }}
=======
      {/* PDF Viewer Overlay */}
      {viewingDoc && (
        <PdfSignViewer
          pdfUrl={`/api/candidate/${token}/document/${viewingDoc.id}/pdf`}
          documentName={viewingDoc.name}
          isSigned={viewingDoc.status === "signed"}
          onSign={(signatureDataUrl) => handleSignOnPdf(viewingDoc.id, signatureDataUrl)}
          onClose={() => setViewingDoc(null)}
>>>>>>> 5ee52b558ebf2a59190ff98d27e70362dd621648
        />
      )}
    </div>
  );
}
