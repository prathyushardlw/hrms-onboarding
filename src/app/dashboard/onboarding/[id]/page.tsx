"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth, useAuthFetch } from "@/context/AuthContext";
import {
  ArrowLeft, Send, CheckCircle, Clock, AlertCircle, FileText,
  RefreshCw, Eye, Download, MessageSquare, Loader2, FolderDown
} from "lucide-react";
import type { Onboarding, AuditLog } from "@/lib/types";

const statusConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  initiated: { label: "Initiated", color: "bg-gray-100 text-gray-700", icon: Clock },
  sent: { label: "Sent", color: "bg-emerald-100 text-emerald-800", icon: Send },
  in_progress: { label: "In Progress", color: "bg-yellow-100 text-yellow-700", icon: Clock },
  submitted: { label: "Submitted", color: "bg-purple-100 text-purple-700", icon: AlertCircle },
  verified: { label: "Verified", color: "bg-green-100 text-green-700", icon: CheckCircle },
  completed: { label: "Completed", color: "bg-emerald-100 text-emerald-700", icon: CheckCircle },
};

const docStatusConfig: Record<string, { label: string; color: string }> = {
  pending: { label: "Pending", color: "text-gray-500 bg-gray-100" },
  filled: { label: "Filled", color: "text-emerald-700 bg-emerald-50" },
  signed: { label: "Signed", color: "text-green-600 bg-green-50" },
  uploaded: { label: "Uploaded", color: "text-indigo-600 bg-indigo-50" },
  verified: { label: "Verified", color: "text-emerald-600 bg-emerald-50" },
  correction_requested: { label: "Correction Needed", color: "text-red-600 bg-red-50" },
};

export default function OnboardingDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { token } = useAuth();
  const authFetch = useAuthFetch();
  const [onboarding, setOnboarding] = useState<Onboarding | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showCorrectionModal, setShowCorrectionModal] = useState(false);
  const [correctionDocIds, setCorrectionDocIds] = useState<string[]>([]);
  const [correctionNote, setCorrectionNote] = useState("");
  const [showAudit, setShowAudit] = useState(false);
  const [sendResult, setSendResult] = useState<string | null>(null);
  const [viewingPdfUrl, setViewingPdfUrl] = useState<string | null>(null);
  const [viewingDocName, setViewingDocName] = useState("");
  const [downloading, setDownloading] = useState(false);

  async function loadData() {
    const [obData, auditData] = await Promise.all([
      authFetch(`/api/onboarding/${id}`),
      authFetch(`/api/onboarding/${id}/audit`),
    ]);
    if (obData.success) setOnboarding(obData.data);
    if (auditData.success) setAuditLogs(auditData.data);
    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, [id]);

  const handleSend = async () => {
    setActionLoading(true);
    const res = await authFetch(`/api/onboarding/${id}/send`, {
      method: "POST",
    });
    if (res.success) {
      const { link, shortLink, emailSent, compose } = res.data;
      setSendResult(link);

      if (!emailSent && compose) {
        // Outlook compose deeplink renders body as plain text
        const body = `Good Morning ${compose.candidateName},\n\nCongratulations & welcome aboard!\n\nPlease see the attached paperwork. If you are in agreement with the terms, complete and sign the onboarding documents as soon as possible.\n\nOnboarding Link: ${shortLink}\n\nNOTE: Send a copy of your driver's license, social security card, professional photo with a white background for ID badge, void check and certifications you held`;
        const outlookUrl = `https://outlook.office.com/mail/deeplink/compose?to=${encodeURIComponent(compose.to)}&subject=${encodeURIComponent(compose.subject)}&body=${encodeURIComponent(body)}`;
        window.open(outlookUrl, "_blank");
      }

      await loadData();
    }
    setActionLoading(false);
  };

  const handleStatusUpdate = async (newStatus: string) => {
    setActionLoading(true);
    await authFetch(`/api/onboarding/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status: newStatus }),
    });
    await loadData();
    setActionLoading(false);
  };

  const handleCorrection = async () => {
    if (correctionDocIds.length === 0 || !correctionNote) return;
    setActionLoading(true);
    const res = await authFetch(`/api/onboarding/${id}/request-correction`, {
      method: "POST",
      body: JSON.stringify({
        documentIds: correctionDocIds,
        note: correctionNote,
      }),
    });

    if (res.success && !res.data.emailSent && res.data.compose) {
      const c = res.data.compose;
      const docList = c.documentNames.map((n: string, i: number) => `  ${i + 1}. ${n}`).join("\n");
      const body = `Dear ${c.candidateName},\n\nThe HR team at ${c.companyName} has reviewed your submission and requested corrections on the following document${c.documentNames.length > 1 ? "s" : ""}:\n\n${docList}\n\nRemarks: ${c.note}\n\nPlease use the link below to review and resubmit:\n\n${c.link}`;
      const outlookUrl = `https://outlook.office.com/mail/deeplink/compose?to=${encodeURIComponent(c.to)}&subject=${encodeURIComponent(res.data.compose.subject)}&body=${encodeURIComponent(body)}`;
      window.open(outlookUrl, "_blank");
    }

    setShowCorrectionModal(false);
    setCorrectionDocIds([]);
    setCorrectionNote("");
    await loadData();
    setActionLoading(false);
  };

  if (loading || !onboarding) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  const status = statusConfig[onboarding.status];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <button
        onClick={() => router.back()}
        className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      {/* Header */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              {onboarding.candidate.name}
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              {onboarding.designation} · {onboarding.department} ·{" "}
              {onboarding.employmentType.replace("-", " ")}
            </p>
            <p className="text-sm text-gray-500">
              {onboarding.candidate.email} · {onboarding.candidate.phone}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${status.color}`}
            >
              <status.icon className="h-4 w-4" />
              {status.label}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-gray-100">
          {onboarding.status === "initiated" && (
            <button
              onClick={handleSend}
              disabled={actionLoading}
              className="bg-[#0e382b] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#18471c] disabled:opacity-50 flex items-center gap-2"
            >
              {actionLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              Send Onboarding Package
            </button>
          )}
          {onboarding.status === "submitted" && (
            <>
              <button
                onClick={() => handleStatusUpdate("verified")}
                disabled={actionLoading}
                className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
              >
                <CheckCircle className="h-4 w-4" /> Verify Documents
              </button>
            </>
          )}
          {onboarding.status === "verified" && (
            <button
              onClick={() => handleStatusUpdate("completed")}
              disabled={actionLoading}
              className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-2"
            >
              <CheckCircle className="h-4 w-4" /> Mark Complete
            </button>
          )}
          {(onboarding.status === "completed" || onboarding.status === "verified") && (
            <button
              onClick={async () => {
                setDownloading(true);
                try {
                  const res = await fetch(`/api/onboarding/${id}/download`, {
                    headers: { Authorization: `Bearer ${token}` },
                  });
                  if (!res.ok) throw new Error("Download failed");
                  const blob = await res.blob();
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `${onboarding.candidate.name} - Onboarding Documents.zip`;
                  a.click();
                  URL.revokeObjectURL(url);
                } catch { /* ignore */ }
                setDownloading(false);
              }}
              disabled={downloading}
              className="bg-[#0e382b] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#18471c] disabled:opacity-50 flex items-center gap-2"
            >
              {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FolderDown className="h-4 w-4" />}
              Download All (ZIP)
            </button>
          )}
          <button
            onClick={() => setShowAudit(!showAudit)}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-2"
          >
            <Eye className="h-4 w-4" /> Audit Log
          </button>
          <button
            onClick={loadData}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" /> Refresh
          </button>
        </div>

        {sendResult && (
          <div className="mt-4 p-3 bg-emerald-50 rounded-lg">
            <p className="text-sm text-emerald-900 font-medium">Onboarding link sent!</p>
            <p className="text-xs text-emerald-700 mt-1 break-all">{sendResult}</p>
          </div>
        )}
      </div>

      {/* Status pipeline */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Progress</h3>
        <div className="flex items-center">
          {Object.entries(statusConfig).map(([key, val], i, arr) => {
            const isActive = key === onboarding.status;
            const isPast =
              Object.keys(statusConfig).indexOf(key) <
              Object.keys(statusConfig).indexOf(onboarding.status);
            return (
              <div key={key} className="flex items-center flex-1">
                <div
                  className={`h-3 w-3 rounded-full ${
                    isPast || isActive ? "bg-[#0e382b]" : "bg-gray-200"
                  }`}
                />
                <span
                  className={`ml-1.5 text-xs font-medium hidden sm:inline ${
                    isActive ? "text-emerald-800" : isPast ? "text-gray-700" : "text-gray-400"
                  }`}
                >
                  {val.label}
                </span>
                {i < arr.length - 1 && (
                  <div
                    className={`flex-1 h-0.5 mx-2 ${
                      isPast ? "bg-[#0e382b]" : "bg-gray-200"
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Documents */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">
            Documents ({onboarding.documents.length})
          </h3>
          {onboarding.status === "submitted" && (
            <button
              onClick={() => {
                setShowCorrectionModal(true);
                setCorrectionDocIds([]);
                setCorrectionNote("");
              }}
              className="bg-red-50 text-red-600 px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-red-100 flex items-center gap-1.5"
            >
              <MessageSquare className="h-3.5 w-3.5" />
              Request Corrections
            </button>
          )}
        </div>
        <div className="divide-y divide-gray-100">
          {onboarding.documents.map((doc) => {
            const ds = docStatusConfig[doc.status] || docStatusConfig.pending;
            return (
              <div key={doc.id} className="px-6 py-4 flex items-center gap-4">
                <FileText className="h-5 w-5 text-gray-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">{doc.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {(doc as any).documentAction === "sign_and_return" ? "Sign & Return" :
                     (doc as any).documentAction === "fill_sign_return" ? "Fill, Sign & Return" :
                     (doc as any).documentAction === "upload" ? "Upload Only" :
                     (doc as any).documentAction === "read_only" ? "Read Only" :
                     "Sign & Return"}
                  </p>
                  {doc.correctionNote && (
                    <p className="text-xs text-red-500 mt-0.5">
                      Note: {doc.correctionNote}
                    </p>
                  )}
                  {doc.candidateSignature && (
                    <p className="text-xs text-green-600 mt-0.5">
                      Signed on{" "}
                      {new Date(doc.candidateSignature.signedAt).toLocaleString()}
                    </p>
                  )}
                </div>
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${ds.color}`}>
                  {ds.label}
                </span>
                <button
                  onClick={async () => {
                    const res = await fetch(
                      `/api/onboarding/${id}/document/${doc.id}/pdf`,
                      { headers: { Authorization: `Bearer ${token}` } }
                    );
                    if (res.ok) {
                      const blob = await res.blob();
                      setViewingPdfUrl(URL.createObjectURL(blob));
                      setViewingDocName(doc.name);
                    }
                  }}
                  className="text-emerald-700 hover:text-emerald-900"
                  title="View PDF"
                >
                  <Eye className="h-4 w-4" />
                </button>
                <button
                  onClick={async () => {
                    const res = await fetch(
                      `/api/onboarding/${id}/document/${doc.id}/pdf`,
                      { headers: { Authorization: `Bearer ${token}` } }
                    );
                    if (res.ok) {
                      const blob = await res.blob();
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = `${doc.name}.pdf`;
                      a.click();
                      URL.revokeObjectURL(url);
                    }
                  }}
                  className="text-gray-400 hover:text-gray-600"
                  title="Download PDF"
                >
                  <Download className="h-4 w-4" />
                </button>
                {doc.status === "correction_requested" && (
                  <button
                    onClick={() => {
                      setShowCorrectionModal(true);
                      setCorrectionDocIds([doc.id]);
                      setCorrectionNote(doc.correctionNote || "");
                    }}
                    className="text-xs bg-amber-50 text-amber-700 px-2.5 py-1 rounded-lg font-medium hover:bg-amber-100 flex items-center gap-1"
                    title="Resend correction email"
                  >
                    <RefreshCw className="h-3 w-3" />
                    Resend
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* PDF Viewer Modal */}
      {viewingPdfUrl && (
        <div className="fixed inset-0 z-50 bg-black/60 flex flex-col">
          <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between flex-shrink-0">
            <h3 className="font-semibold text-gray-900 text-sm truncate">
              {viewingDocName}
            </h3>
            <button
              onClick={() => {
                URL.revokeObjectURL(viewingPdfUrl);
                setViewingPdfUrl(null);
              }}
              className="text-gray-500 hover:text-gray-700 text-sm font-medium"
            >
              Close ✕
            </button>
          </div>
          <div className="flex-1 bg-gray-100">
            <iframe
              src={viewingPdfUrl}
              className="w-full h-full"
              title={viewingDocName}
            />
          </div>
        </div>
      )}

      {/* Correction modal */}
      {showCorrectionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4 shadow-xl">
            <h3 className="font-semibold text-gray-900 mb-1">
              Request Corrections
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              Select the documents that need corrections and add your remarks.
            </p>

            {/* Document checkboxes */}
            <div className="space-y-2 mb-4 max-h-48 overflow-auto">
              {onboarding.documents.map((doc) => (
                <label
                  key={doc.id}
                  className={`flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer transition-colors ${
                    correctionDocIds.includes(doc.id)
                      ? "border-red-300 bg-red-50"
                      : "border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={correctionDocIds.includes(doc.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setCorrectionDocIds((prev) => [...prev, doc.id]);
                      } else {
                        setCorrectionDocIds((prev) =>
                          prev.filter((id) => id !== doc.id)
                        );
                      }
                    }}
                    className="h-4 w-4 rounded border-gray-300 text-red-600 focus:ring-red-500"
                  />
                  <span className="text-sm text-gray-900">{doc.name}</span>
                  <span className={`ml-auto text-xs px-2 py-0.5 rounded-full ${
                    (docStatusConfig[doc.status] || docStatusConfig.pending).color
                  }`}>
                    {(docStatusConfig[doc.status] || docStatusConfig.pending).label}
                  </span>
                </label>
              ))}
            </div>

            {/* Remarks */}
            <textarea
              value={correctionNote}
              onChange={(e) => setCorrectionNote(e.target.value)}
              placeholder="Describe what needs to be corrected..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 outline-none h-24 resize-none"
            />
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => setShowCorrectionModal(false)}
                className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900"
              >
                Cancel
              </button>
              <button
                onClick={handleCorrection}
                disabled={correctionDocIds.length === 0 || !correctionNote || actionLoading}
                className="bg-red-600 text-white px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50 flex items-center gap-2"
              >
                {actionLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Send Correction Request
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Audit Log */}
      {showAudit && (
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900">Audit Log</h3>
          </div>
          <div className="p-6">
            {auditLogs.length === 0 ? (
              <p className="text-sm text-gray-500">No events recorded yet.</p>
            ) : (
              <div className="space-y-3">
                {auditLogs.map((log) => (
                  <div key={log.id} className="flex items-start gap-3">
                    <div className="h-2 w-2 rounded-full bg-blue-400 mt-2 flex-shrink-0" />
                    <div>
                      <p className="text-sm text-gray-900">
                        <span className="font-medium capitalize">
                          {log.event.replace(/_/g, " ")}
                        </span>
                        <span className="text-gray-500">
                          {" "}
                          by {log.performedBy.type}
                        </span>
                      </p>
                      <p className="text-xs text-gray-400">
                        {new Date(log.timestamp).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
