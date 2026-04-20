"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  CheckCircle, Clock, FileText, Upload, AlertTriangle,
  Pen, Loader2, Send
} from "lucide-react";
import SignatureCanvas from "react-signature-canvas";

interface CandidateDocument {
  id: string;
  name: string;
  required: boolean;
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
  const [activeDoc, setActiveDoc] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [showSignature, setShowSignature] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const sigRef = useRef<SignatureCanvas | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadData();
  }, [token]);

  async function loadData() {
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
  }

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
      // error handling
    }
    setActionLoading(false);
  };

  const handleSign = async (docId: string) => {
    if (!sigRef.current) return;
    if (sigRef.current.isEmpty()) return;

    setActionLoading(true);
    const signatureData = sigRef.current.toDataURL();
    const formData = new FormData();
    formData.append("signature", signatureData);
    formData.append("action", "sign");

    try {
      const res = await fetch(`/api/candidate/${token}/document/${docId}`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        setShowSignature(false);
        setActiveDoc(null);
        await loadData();
      }
    } catch {
      // error handling
    }
    setActionLoading(false);
  };

  const handleSubmitAll = async () => {
    setActionLoading(true);
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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (error && !onboarding) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md text-center">
          <AlertTriangle className="h-12 w-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-lg font-bold text-gray-900 mb-2">
            Unable to Load
          </h2>
          <p className="text-gray-500">{error}</p>
        </div>
      </div>
    );
  }

  if (submitted || onboarding?.status === "submitted" || onboarding?.status === "verified" || onboarding?.status === "completed") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md text-center">
          <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
          <h2 className="text-lg font-bold text-gray-900 mb-2">
            Documents Submitted!
          </h2>
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
            Please complete and sign your onboarding documents below.
          </p>
          <div className="mt-4 flex items-center gap-4 text-sm text-gray-600">
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
          <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg">
            {error}
          </div>
        )}

        {/* Documents */}
        <div className="space-y-3">
          {onboarding.documents.map((doc) => {
            const ds = docStatusConfig[doc.status] || docStatusConfig.pending;
            const Icon = ds.icon;
            const isActive = activeDoc === doc.id;
            const needsAction = ["pending", "correction_requested"].includes(doc.status);

            return (
              <div
                key={doc.id}
                className="bg-white rounded-xl shadow-sm overflow-hidden"
              >
                <div
                  className="p-4 flex items-center gap-4 cursor-pointer hover:bg-gray-50"
                  onClick={() => setActiveDoc(isActive ? null : doc.id)}
                >
                  <Icon className={`h-5 w-5 flex-shrink-0 ${ds.color.split(" ")[1]}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">
                      {doc.name}
                      {doc.required && (
                        <span className="text-red-500 ml-1">*</span>
                      )}
                    </p>
                    {doc.correctionNote && (
                      <p className="text-xs text-red-500 mt-0.5">
                        {doc.correctionNote}
                      </p>
                    )}
                  </div>
                  <span
                    className={`text-xs font-medium px-2.5 py-1 rounded-full ${ds.color}`}
                  >
                    {ds.label}
                  </span>
                </div>

                {isActive && needsAction && (
                  <div className="px-4 pb-4 pt-2 border-t border-gray-100 space-y-3">
                    {/* Upload */}
                    <div>
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
                        <p className="text-sm text-gray-600">
                          Click to upload file
                        </p>
                        <p className="text-xs text-gray-400">
                          PDF, JPG, PNG, DOC
                        </p>
                      </button>
                    </div>

                    {/* Sign */}
                    <button
                      onClick={() => setShowSignature(true)}
                      className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700"
                    >
                      <Pen className="h-4 w-4" /> Add Signature
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Submit */}
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
            Complete all required documents (*) to submit.
          </p>
        )}
      </div>

      {/* Signature Modal */}
      {showSignature && activeDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h3 className="font-semibold text-gray-900 mb-4">
              Add Your Signature
            </h3>
            <div className="border-2 border-gray-200 rounded-lg overflow-hidden">
              <SignatureCanvas
                ref={(ref) => {
                  sigRef.current = ref;
                }}
                canvasProps={{
                  className: "w-full h-40",
                  style: { width: "100%", height: "160px" },
                }}
                backgroundColor="white"
              />
            </div>
            <div className="flex justify-between mt-4">
              <button
                onClick={() => sigRef.current?.clear()}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Clear
              </button>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setShowSignature(false);
                  }}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleSign(activeDoc)}
                  disabled={actionLoading}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                >
                  {actionLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                  Apply Signature
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
