"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuthFetch } from "@/context/AuthContext";
import Link from "next/link";
import {
  ArrowLeft, MapPin, Clock, Users, Plus, Download,
  ChevronDown, Trash2, StickyNote, Pencil, CheckCircle,
} from "lucide-react";
import type { Job, Candidate } from "@/lib/types";

const STATUSES: { value: Candidate["status"]; label: string; color: string }[] = [
  { value: "new", label: "New", color: "bg-blue-100 text-blue-700" },
  { value: "shortlisted", label: "Shortlisted", color: "bg-yellow-100 text-yellow-700" },
  { value: "interview", label: "Interview", color: "bg-purple-100 text-purple-700" },
  { value: "offered", label: "Offered", color: "bg-green-100 text-green-700" },
  { value: "rejected", label: "Rejected", color: "bg-red-100 text-red-600" },
];

const SOURCE_LABELS: Record<string, string> = {
  linkedin: "LinkedIn", referral: "Referral", agency: "Agency",
  walk_in: "Walk-in", job_board: "Job Board", other: "Other",
};

const JOB_STATUS_COLORS: Record<string, string> = {
  open: "bg-green-100 text-green-700",
  closed: "bg-gray-100 text-gray-500",
  draft: "bg-yellow-100 text-yellow-700",
};

export default function JobDetailPage() {
  const { id } = useParams<{ id: string }>();
  const authFetch = useAuthFetch();
  const router = useRouter();

  const [job, setJob] = useState<Job | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeStatus, setActiveStatus] = useState<Candidate["status"] | "all">("all");
  const [editingNotes, setEditingNotes] = useState<string | null>(null);
  const [noteText, setNoteText] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const [statusMenuOpen, setStatusMenuOpen] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [jobRes, candRes] = await Promise.all([
      authFetch(`/api/jobs/${id}`),
      authFetch(`/api/jobs/${id}/candidates`),
    ]);
    if (jobRes.success) setJob(jobRes.data);
    else router.replace("/dashboard/jobs");
    if (candRes.success) setCandidates(candRes.data);
    setLoading(false);
  }, [id, authFetch, router]);

  useEffect(() => { load(); }, [load]);

  const changeStatus = async (candidateId: string, status: Candidate["status"]) => {
    await authFetch(`/api/candidates/${candidateId}`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
    setCandidates((prev) => prev.map((c) => c.id === candidateId ? { ...c, status } : c));
    setStatusMenuOpen(null);
  };

  const saveNote = async (candidateId: string) => {
    setSavingNote(true);
    await authFetch(`/api/candidates/${candidateId}`, {
      method: "PATCH",
      body: JSON.stringify({ notes: noteText }),
    });
    setCandidates((prev) => prev.map((c) => c.id === candidateId ? { ...c, notes: noteText } : c));
    setEditingNotes(null);
    setSavingNote(false);
  };

  const deleteCandidate = async (candidateId: string) => {
    if (!confirm("Remove this candidate?")) return;
    await authFetch(`/api/candidates/${candidateId}`, { method: "DELETE" });
    setCandidates((prev) => prev.filter((c) => c.id !== candidateId));
  };

  const toggleJobStatus = async () => {
    if (!job) return;
    const next = job.status === "open" ? "closed" : "open";
    await authFetch(`/api/jobs/${id}`, { method: "PATCH", body: JSON.stringify({ status: next }) });
    setJob((j) => j ? { ...j, status: next } : j);
  };

  if (loading) {
    return <div className="flex items-center justify-center h-40"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600" /></div>;
  }
  if (!job) return null;

  const filtered = activeStatus === "all" ? candidates : candidates.filter((c) => c.status === activeStatus);
  const counts = STATUSES.reduce((acc, s) => { acc[s.value] = candidates.filter((c) => c.status === s.value).length; return acc; }, {} as Record<string, number>);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start gap-3">
        <Link href="/dashboard/jobs" className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg mt-1">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-2xl font-bold text-gray-900">{job.title}</h2>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${JOB_STATUS_COLORS[job.status]}`}>
              {job.status}
            </span>
          </div>
          <div className="flex items-center gap-4 mt-2 text-sm text-gray-500 flex-wrap">
            <span>{job.department}</span>
            <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{job.location}</span>
            <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{job.employmentType}</span>
            <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" />{candidates.length} candidates</span>
          </div>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <button
            onClick={toggleJobStatus}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium border ${job.status === "open" ? "border-gray-300 text-gray-600 hover:bg-gray-50" : "border-green-300 text-green-700 hover:bg-green-50"}`}
          >
            {job.status === "open" ? "Close Job" : "Reopen Job"}
          </button>
          <Link
            href={`/dashboard/jobs/${id}/candidates/new`}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700"
          >
            <Plus className="h-4 w-4" /> Add Candidate
          </Link>
        </div>
      </div>

      {/* Job description + skills */}
      {(job.description || (job.requiredSkills?.length ?? 0) > 0) && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          {job.description && (
            <div>
              <h3 className="font-semibold text-gray-800 mb-2">Description</h3>
              <p className="text-sm text-gray-600 whitespace-pre-wrap">{job.description}</p>
            </div>
          )}
          {(job.requiredSkills?.length ?? 0) > 0 && (
            <div>
              <h3 className="font-semibold text-gray-800 mb-2">Required Skills</h3>
              <div className="flex flex-wrap gap-2">
                {(job.requiredSkills ?? []).map((s) => (
                  <span key={s} className="text-sm px-2.5 py-1 bg-gray-100 text-gray-700 rounded-lg">{s}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Pipeline stats */}
      <div className="grid grid-cols-5 gap-3">
        {STATUSES.map((s) => (
          <button
            key={s.value}
            onClick={() => setActiveStatus(activeStatus === s.value ? "all" : s.value)}
            className={`bg-white rounded-xl border p-3 text-center transition-all ${activeStatus === s.value ? "border-green-400 shadow-sm" : "border-gray-200 hover:border-gray-300"}`}
          >
            <p className="text-2xl font-bold text-gray-900">{counts[s.value] ?? 0}</p>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium mt-1 inline-block ${s.color}`}>{s.label}</span>
          </button>
        ))}
      </div>

      {/* Candidate list */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">
            {activeStatus === "all" ? `All Candidates (${candidates.length})` : `${STATUSES.find(s => s.value === activeStatus)?.label} (${filtered.length})`}
          </h3>
        </div>
        {filtered.length === 0 ? (
          <div className="p-10 text-center text-gray-400">
            <Users className="h-8 w-8 mx-auto mb-2 opacity-40" />
            <p>{activeStatus === "all" ? "No candidates added yet." : `No candidates in "${activeStatus}" stage.`}</p>
            {activeStatus === "all" && (
              <Link href={`/dashboard/jobs/${id}/candidates/new`} className="mt-3 inline-flex items-center gap-1 text-sm text-green-600 hover:text-green-700">
                <Plus className="h-4 w-4" /> Add your first candidate
              </Link>
            )}
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filtered.map((c) => {
              const statusInfo = STATUSES.find((s) => s.value === c.status) ?? STATUSES[0];
              return (
                <div key={c.id} className="px-5 py-4">
                  <div className="flex items-start gap-4">
                    {/* Avatar */}
                    <div className="h-10 w-10 rounded-full bg-green-100 text-green-700 font-semibold text-sm flex items-center justify-center flex-shrink-0">
                      {c.name?.charAt(0)?.toUpperCase() ?? "?"}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Link href={`/dashboard/jobs/${job?.id}/candidates/${c.id}`} className="font-medium text-gray-900 hover:text-green-700 hover:underline">{c.name}</Link>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusInfo.color}`}>{statusInfo.label}</span>
                        {SOURCE_LABELS[c.source] && (
                          <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{SOURCE_LABELS[c.source]}</span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-3 mt-1 text-sm text-gray-500">
                        <span>{c.email}</span>
                        {c.phone && <span>{c.phone}</span>}
                        {c.currentCompany && <span>{c.currentDesignation ? `${c.currentDesignation} @ ${c.currentCompany}` : c.currentCompany}</span>}
                        {c.expectedSalary && <span>Expected: {c.expectedSalary}</span>}
                        {c.noticePeriod && <span>Notice: {c.noticePeriod}</span>}
                      </div>
                      <div className="flex gap-3 mt-1">
                        {c.linkedinUrl && <a href={c.linkedinUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 hover:underline">LinkedIn</a>}
                        {c.portfolioUrl && <a href={c.portfolioUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 hover:underline">Portfolio</a>}
                      </div>

                      {/* Notes */}
                      {editingNotes === c.id ? (
                        <div className="mt-2 space-y-2">
                          <textarea
                            value={noteText}
                            onChange={(e) => setNoteText(e.target.value)}
                            rows={3}
                            className="w-full text-sm px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
                            placeholder="Add internal notes..."
                            autoFocus
                          />
                          <div className="flex gap-2">
                            <button onClick={() => saveNote(c.id)} disabled={savingNote} className="px-3 py-1 bg-green-600 text-white text-xs rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-1">
                              <CheckCircle className="h-3.5 w-3.5" /> {savingNote ? "Saving..." : "Save"}
                            </button>
                            <button onClick={() => setEditingNotes(null)} className="px-3 py-1 border border-gray-200 text-xs rounded-lg text-gray-600 hover:bg-gray-50">Cancel</button>
                          </div>
                        </div>
                      ) : c.notes ? (
                        <div className="mt-2 flex items-start gap-1 text-sm text-gray-500 bg-gray-50 rounded-lg px-3 py-2">
                          <StickyNote className="h-3.5 w-3.5 mt-0.5 flex-shrink-0 text-gray-400" />
                          <span className="flex-1">{c.notes}</span>
                          <button onClick={() => { setEditingNotes(c.id); setNoteText(c.notes ?? ""); }} className="text-gray-400 hover:text-gray-600">
                            <Pencil className="h-3 w-3" />
                          </button>
                        </div>
                      ) : null}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {/* Status dropdown */}
                      <div className="relative">
                        <button
                          onClick={() => setStatusMenuOpen(statusMenuOpen === c.id ? null : c.id)}
                          className="flex items-center gap-1 px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600"
                        >
                          Move to <ChevronDown className="h-3 w-3" />
                        </button>
                        {statusMenuOpen === c.id && (
                          <div className="absolute right-0 top-full mt-1 w-36 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                            {STATUSES.filter((s) => s.value !== c.status).map((s) => (
                              <button
                                key={s.value}
                                onClick={() => changeStatus(c.id, s.value)}
                                className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 first:rounded-t-lg last:rounded-b-lg text-gray-700"
                              >
                                {s.label}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Note */}
                      <button
                        onClick={() => { setEditingNotes(c.id); setNoteText(c.notes ?? ""); }}
                        className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
                        title="Add note"
                      >
                        <StickyNote className="h-4 w-4" />
                      </button>

                      {/* Resume download */}
                      {c.resumeFileName && (
                        <a
                          href={`/api/candidates/${c.id}/resume`}
                          download
                          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                          title="Download resume"
                        >
                          <Download className="h-4 w-4" />
                        </a>
                      )}

                      {/* Delete */}
                      <button
                        onClick={() => deleteCandidate(c.id)}
                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg"
                        title="Remove candidate"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
