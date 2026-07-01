"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth, useAuthFetch } from "@/context/AuthContext";
import Link from "next/link";
import {
  ArrowLeft, Download, Star, Plus, Trash2, CheckCircle,
  XCircle, Clock, FileText, ExternalLink, ChevronDown, Video, MapPin,
} from "lucide-react";
import type { Candidate, InterviewRound, OfferLetter, Job, MeetingType } from "@/lib/types";

const MEETING_LABELS: Record<MeetingType, string> = {
  google_meet: "Google Meet", zoom: "Zoom", teams: "Microsoft Teams", in_person: "In-person",
};

type Tab = "overview" | "interviews" | "offer";

const RECOMMENDATION_COLORS = {
  proceed: "bg-green-100 text-green-700",
  hold: "bg-yellow-100 text-yellow-700",
  reject: "bg-red-100 text-red-600",
};

const STATUS_COLORS: Record<string, string> = {
  new: "bg-blue-100 text-blue-700",
  shortlisted: "bg-yellow-100 text-yellow-700",
  interview: "bg-purple-100 text-purple-700",
  offered: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-600",
};

const OFFER_STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-600",
  sent: "bg-blue-100 text-blue-700",
  accepted: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-600",
};

const SOURCE_LABELS: Record<string, string> = {
  linkedin: "LinkedIn", referral: "Referral", agency: "Agency",
  walk_in: "Walk-in", job_board: "Job Board", other: "Other",
};

export default function CandidateDetailPage() {
  const { id: jobId, candidateId } = useParams<{ id: string; candidateId: string }>();
  const { token } = useAuth();
  const authFetch = useAuthFetch();
  const router = useRouter();

  const [tab, setTab] = useState<Tab>("overview");
  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [job, setJob] = useState<Job | null>(null);
  const [interviews, setInterviews] = useState<InterviewRound[]>([]);
  const [offer, setOffer] = useState<OfferLetter | null>(null);
  const [loading, setLoading] = useState(true);

  // Interview form state
  const [showRoundForm, setShowRoundForm] = useState(false);
  const [roundForm, setRoundForm] = useState({ roundName: "", interviewerName: "", scheduledAt: "", meetingType: "", meetingLink: "" });
  const [savingRound, setSavingRound] = useState(false);
  const [roundFormError, setRoundFormError] = useState<string | null>(null);
  const [editingRound, setEditingRound] = useState<string | null>(null);
  const [editRoundData, setEditRoundData] = useState<{ rating: number; recommendation: string; feedback: string; status: string }>({ rating: 0, recommendation: "", feedback: "", status: "scheduled" });

  // Offer form state
  const [showOfferForm, setShowOfferForm] = useState(false);
  const [offerForm, setOfferForm] = useState({ designation: "", department: "", ctc: "", joiningDate: "", additionalTerms: "" });
  const [savingOffer, setSavingOffer] = useState(false);
  const [convertingToOnboarding, setConvertingToOnboarding] = useState(false);

  const load = useCallback(async () => {
    const [cRes, jRes, iRes, oRes] = await Promise.all([
      authFetch(`/api/candidates/${candidateId}`),
      authFetch(`/api/jobs/${jobId}`),
      authFetch(`/api/candidates/${candidateId}/interviews`),
      authFetch(`/api/candidates/${candidateId}/offer`),
    ]);
    if (cRes.success) setCandidate(cRes.data);
    else router.replace(`/dashboard/jobs/${jobId}`);
    if (jRes.success) setJob(jRes.data);
    if (iRes.success) setInterviews(iRes.data);
    if (oRes.success) setOffer(oRes.data);
    setLoading(false);
  }, [candidateId, jobId, authFetch, router]);

  useEffect(() => { load(); }, [load]);

  // ---- Interview actions ----
  const addRound = async () => {
    if (!roundForm.roundName.trim() || !roundForm.interviewerName.trim()) return;
    setRoundFormError(null);
    setSavingRound(true);
    const res = await authFetch(`/api/candidates/${candidateId}/interviews`, {
      method: "POST",
      body: JSON.stringify(roundForm),
    });
    if (res.success) {
      setInterviews((p) => [...p, res.data]);
      setShowRoundForm(false);
      setRoundForm({ roundName: "", interviewerName: "", scheduledAt: "", meetingType: "", meetingLink: "" });
      if (res.data.scheduledAt && !res.data.emailSent) {
        setRoundFormError("Round saved, but the invitation email could not be sent. Check server logs.");
        setShowRoundForm(true);
      }
    } else {
      setRoundFormError(res.error ?? "Failed to save interview round");
    }
    setSavingRound(false);
  };

  const saveRoundFeedback = async (roundId: string) => {
    const res = await authFetch(`/api/interviews/${roundId}`, {
      method: "PATCH",
      body: JSON.stringify({ ...editRoundData, rating: editRoundData.rating || undefined, recommendation: editRoundData.recommendation || undefined }),
    });
    if (res.success) { setInterviews((p) => p.map((i) => i.id === roundId ? res.data : i)); setEditingRound(null); }
  };

  const deleteRound = async (roundId: string) => {
    if (!confirm("Delete this interview round?")) return;
    await authFetch(`/api/interviews/${roundId}`, { method: "DELETE" });
    setInterviews((p) => p.filter((i) => i.id !== roundId));
  };

  // ---- Offer actions ----
  const createOffer = async () => {
    if (!offerForm.designation || !offerForm.ctc || !offerForm.joiningDate) return;
    setSavingOffer(true);
    const res = await authFetch(`/api/candidates/${candidateId}/offer`, {
      method: "POST",
      body: JSON.stringify(offerForm),
    });
    if (res.success) {
      setOffer(res.data);
      setShowOfferForm(false);
      setCandidate((c) => c ? { ...c, status: "offered" } : c);
    }
    setSavingOffer(false);
  };

  const updateOfferStatus = async (status: string) => {
    const res = await authFetch(`/api/candidates/${candidateId}/offer`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
    if (res.success) setOffer(res.data);
  };

  const convertToOnboarding = async () => {
    if (!confirm(`Start onboarding for ${candidate?.name}? An onboarding record will be created.`)) return;
    setConvertingToOnboarding(true);
    const res = await authFetch(`/api/candidates/${candidateId}/convert-to-onboarding`, {
      method: "POST",
      body: JSON.stringify({}),
    });
    if (res.success) {
      router.push(`/dashboard/onboarding/${res.data.onboardingId}`);
    } else {
      alert(res.error ?? "Failed to convert");
      setConvertingToOnboarding(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-40"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600" /></div>;
  if (!candidate) return null;

  // "Start Onboarding" requires at least 1 interview round OR an offer letter
  // Cannot jump straight from a brand-new candidate to onboarding — use direct onboarding for that
  const canStartOnboarding = interviews.length > 0 || offer !== null;

  const avgRating = interviews.filter((i) => i.rating).length > 0
    ? (interviews.reduce((s, i) => s + (i.rating ?? 0), 0) / interviews.filter((i) => i.rating).length).toFixed(1)
    : null;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start gap-3">
        <Link href={`/dashboard/jobs/${jobId}`} className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg mt-1">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-2xl font-bold text-gray-900">{candidate.name}</h2>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[candidate.status]}`}>{candidate.status}</span>
          </div>
          <p className="text-gray-500 text-sm mt-1">
            {candidate.currentDesignation && candidate.currentCompany ? `${candidate.currentDesignation} @ ${candidate.currentCompany}` : ""}
            {job && <> · Applying for <span className="font-medium text-gray-700">{job.title}</span></>}
          </p>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          {candidate.resumeFileName && (
            <a href={`/api/candidates/${candidateId}/resume`} download className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
              <Download className="h-4 w-4" /> Resume
            </a>
          )}
          <div className="relative group">
            <button
              onClick={convertToOnboarding}
              disabled={convertingToOnboarding || !canStartOnboarding}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <CheckCircle className="h-4 w-4" />
              {convertingToOnboarding ? "Creating..." : "Start Onboarding"}
            </button>
            {!canStartOnboarding && (
              <div className="absolute right-0 top-full mt-1.5 w-52 bg-gray-900 text-white text-xs rounded-lg px-3 py-2 hidden group-hover:block z-20 text-center">
                Complete at least one interview round before starting onboarding
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        {(["overview", "interviews", "offer"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-5 py-2.5 text-sm font-medium capitalize border-b-2 transition-colors ${tab === t ? "border-green-600 text-green-700" : "border-transparent text-gray-500 hover:text-gray-700"}`}
          >
            {t === "interviews" ? `Interviews (${interviews.length})` : t.charAt(0).toUpperCase() + t.slice(1)}
            {t === "offer" && offer && <span className={`ml-2 text-xs px-1.5 py-0.5 rounded-full ${OFFER_STATUS_COLORS[offer.status]}`}>{offer.status}</span>}
          </button>
        ))}
      </div>

      {/* ---- OVERVIEW TAB ---- */}
      {tab === "overview" && (
        <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
          {[
            ["Email", candidate.email],
            ["Phone", candidate.phone],
            ["Source", SOURCE_LABELS[candidate.source] ?? candidate.source],
            ["Current Company", candidate.currentCompany],
            ["Current Designation", candidate.currentDesignation],
            ["Expected Salary", candidate.expectedSalary],
            ["Notice Period", candidate.noticePeriod],
            ["LinkedIn", candidate.linkedinUrl ? { href: candidate.linkedinUrl } : null],
            ["Portfolio", candidate.portfolioUrl ? { href: candidate.portfolioUrl } : null],
          ].filter(([, v]) => v).map(([label, value]) => (
            <div key={label as string} className="flex items-center px-5 py-3 gap-4">
              <span className="w-40 text-sm text-gray-500 flex-shrink-0">{label as string}</span>
              {typeof value === "object" && value !== null && "href" in value ? (
                <a href={(value as {href: string}).href} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline flex items-center gap-1">
                  {(value as {href: string}).href} <ExternalLink className="h-3 w-3" />
                </a>
              ) : (
                <span className="text-sm text-gray-900">{value as string}</span>
              )}
            </div>
          ))}
          {candidate.notes && (
            <div className="px-5 py-3 gap-4 flex items-start">
              <span className="w-40 text-sm text-gray-500 flex-shrink-0">Notes</span>
              <p className="text-sm text-gray-900 whitespace-pre-wrap">{candidate.notes}</p>
            </div>
          )}
        </div>
      )}

      {/* ---- INTERVIEWS TAB ---- */}
      {tab === "interviews" && (
        <div className="space-y-4">
          {avgRating && (
            <div className="bg-white rounded-xl border border-gray-200 px-5 py-4 flex items-center gap-3">
              <Star className="h-5 w-5 text-yellow-500 fill-yellow-400" />
              <span className="font-semibold text-gray-900">{avgRating} / 5</span>
              <span className="text-sm text-gray-500">average rating across {interviews.filter(i => i.rating).length} scored round{interviews.filter(i => i.rating).length !== 1 ? "s" : ""}</span>
            </div>
          )}

          {/* Add round button */}
          <div className="flex justify-between items-center">
            <h3 className="font-semibold text-gray-900">Interview Rounds</h3>
            <button onClick={() => setShowRoundForm(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700">
              <Plus className="h-4 w-4" /> Add Round
            </button>
          </div>

          {/* Add round form */}
          {showRoundForm && (
            <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
              <h4 className="font-medium text-gray-800">New Interview Round</h4>
              <div className="grid grid-cols-2 gap-3">
                <input value={roundForm.roundName} onChange={(e) => setRoundForm((f) => ({ ...f, roundName: e.target.value }))}
                  placeholder="Round name (e.g. Technical Round 1)"
                  className="col-span-2 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                <input value={roundForm.interviewerName} onChange={(e) => setRoundForm((f) => ({ ...f, interviewerName: e.target.value }))}
                  placeholder="Interviewer name"
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                <input type="datetime-local" value={roundForm.scheduledAt} onChange={(e) => setRoundForm((f) => ({ ...f, scheduledAt: e.target.value }))}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                <select value={roundForm.meetingType} onChange={(e) => setRoundForm((f) => ({ ...f, meetingType: e.target.value, meetingLink: e.target.value === "in_person" ? "" : f.meetingLink }))}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
                  <option value="">Meeting type (optional)</option>
                  <option value="google_meet">Google Meet</option>
                  <option value="zoom">Zoom</option>
                  <option value="teams">Microsoft Teams</option>
                  <option value="in_person">In-person</option>
                </select>
                {roundForm.meetingType && roundForm.meetingType !== "in_person" && (
                  <input value={roundForm.meetingLink} onChange={(e) => setRoundForm((f) => ({ ...f, meetingLink: e.target.value }))}
                    placeholder="Meeting link (https://...)"
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                )}
              </div>
              <div className="flex gap-2">
                <button onClick={addRound} disabled={savingRound} className="px-4 py-1.5 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 disabled:opacity-50">
                  {savingRound ? "Adding..." : "Add"}
                </button>
                <button onClick={() => { setShowRoundForm(false); setRoundFormError(null); }} className="px-4 py-1.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
              </div>
              {roundFormError && <p className="text-sm text-red-600">{roundFormError}</p>}
            </div>
          )}

          {/* Round cards */}
          {interviews.length === 0 && !showRoundForm && (
            <div className="bg-white rounded-xl border border-gray-200 p-10 text-center text-gray-400">
              No interview rounds added yet.
            </div>
          )}
          {interviews.map((round, idx) => (
            <div key={round.id} className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-gray-900">Round {idx + 1}: {round.roundName}</p>
                  <p className="text-sm text-gray-500 mt-0.5">Interviewer: {round.interviewerName}
                    {round.scheduledAt && ` · ${new Date(round.scheduledAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}`}
                  </p>
                  {round.meetingType && (
                    <div className="flex items-center gap-1.5 mt-1">
                      {round.meetingType === "in_person" ? <MapPin className="h-3.5 w-3.5 text-gray-400" /> : <Video className="h-3.5 w-3.5 text-blue-400" />}
                      {round.meetingLink ? (
                        <a href={round.meetingLink} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline">
                          {MEETING_LABELS[round.meetingType]} — Join
                        </a>
                      ) : (
                        <span className="text-xs text-gray-500">{MEETING_LABELS[round.meetingType]}</span>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  {round.status === "completed" ? <CheckCircle className="h-4 w-4 text-green-500" /> : round.status === "cancelled" ? <XCircle className="h-4 w-4 text-red-400" /> : <Clock className="h-4 w-4 text-gray-400" />}
                  <span className="text-xs text-gray-500 capitalize">{round.status}</span>
                  <button onClick={() => deleteRound(round.id)} className="ml-1 p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              </div>

              {editingRound === round.id ? (
                <div className="space-y-3 border-t border-gray-100 pt-3">
                  {/* Rating */}
                  <div>
                    <label className="text-xs font-medium text-gray-600 block mb-1">Rating</label>
                    <div className="flex gap-1">
                      {[1,2,3,4,5].map((n) => (
                        <button key={n} onClick={() => setEditRoundData((d) => ({ ...d, rating: n }))}
                          className={`h-8 w-8 rounded-lg text-sm font-medium border transition-colors ${editRoundData.rating >= n ? "bg-yellow-400 border-yellow-400 text-white" : "border-gray-200 text-gray-500 hover:bg-gray-50"}`}>
                          {n}
                        </button>
                      ))}
                    </div>
                  </div>
                  {/* Recommendation */}
                  <div>
                    <label className="text-xs font-medium text-gray-600 block mb-1">Recommendation</label>
                    <div className="flex gap-2">
                      {(["proceed", "hold", "reject"] as const).map((r) => (
                        <button key={r} onClick={() => setEditRoundData((d) => ({ ...d, recommendation: r }))}
                          className={`px-3 py-1 rounded-lg text-sm capitalize border transition-colors ${editRoundData.recommendation === r ? RECOMMENDATION_COLORS[r] + " border-transparent font-medium" : "border-gray-200 text-gray-500 hover:bg-gray-50"}`}>
                          {r}
                        </button>
                      ))}
                    </div>
                  </div>
                  {/* Status */}
                  <div>
                    <label className="text-xs font-medium text-gray-600 block mb-1">Status</label>
                    <select value={editRoundData.status} onChange={(e) => setEditRoundData((d) => ({ ...d, status: e.target.value }))}
                      className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
                      <option value="scheduled">Scheduled</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>
                  {/* Feedback */}
                  <textarea value={editRoundData.feedback} onChange={(e) => setEditRoundData((d) => ({ ...d, feedback: e.target.value }))}
                    rows={3} placeholder="Interview feedback..." className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none" />
                  <div className="flex gap-2">
                    <button onClick={() => saveRoundFeedback(round.id)} className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700">Save Feedback</button>
                    <button onClick={() => setEditingRound(null)} className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
                  </div>
                </div>
              ) : (
                <div className="border-t border-gray-100 pt-3 space-y-2">
                  {round.rating || round.recommendation ? (
                    <div className="flex items-center gap-3">
                      {round.rating && (
                        <div className="flex items-center gap-1">
                          {[1,2,3,4,5].map((n) => (
                            <Star key={n} className={`h-4 w-4 ${n <= round.rating! ? "text-yellow-400 fill-yellow-400" : "text-gray-200"}`} />
                          ))}
                          <span className="text-sm text-gray-600 ml-1">{round.rating}/5</span>
                        </div>
                      )}
                      {round.recommendation && (
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${RECOMMENDATION_COLORS[round.recommendation]}`}>{round.recommendation}</span>
                      )}
                    </div>
                  ) : null}
                  {round.feedback && <p className="text-sm text-gray-600 bg-gray-50 rounded-lg px-3 py-2">{round.feedback}</p>}
                  <button onClick={() => { setEditingRound(round.id); setEditRoundData({ rating: round.rating ?? 0, recommendation: round.recommendation ?? "", feedback: round.feedback ?? "", status: round.status }); }}
                    className="text-xs text-green-600 hover:text-green-700 font-medium">
                    {round.rating || round.feedback ? "Edit feedback" : "Add feedback / score"}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ---- OFFER TAB ---- */}
      {tab === "offer" && (
        <div className="space-y-4">
          {!offer && !showOfferForm && (
            <div className="bg-white rounded-xl border border-gray-200 p-10 text-center space-y-3">
              <FileText className="h-10 w-10 text-gray-300 mx-auto" />
              <p className="text-gray-500">No offer letter created yet</p>
              <button onClick={() => { setShowOfferForm(true); setOfferForm((f) => ({ ...f, designation: candidate.currentDesignation ?? "", department: job?.department ?? "" })); }}
                className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700">
                <Plus className="h-4 w-4" /> Create Offer Letter
              </button>
            </div>
          )}

          {showOfferForm && (
            <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
              <h3 className="font-semibold text-gray-900">Create Offer Letter</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 sm:col-span-1">
                  <label className="text-sm font-medium text-gray-700 block mb-1">Designation <span className="text-red-500">*</span></label>
                  <input value={offerForm.designation} onChange={(e) => setOfferForm((f) => ({ ...f, designation: e.target.value }))} placeholder="e.g. Senior Software Engineer"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="text-sm font-medium text-gray-700 block mb-1">Department</label>
                  <input value={offerForm.department} onChange={(e) => setOfferForm((f) => ({ ...f, department: e.target.value }))} placeholder="e.g. Engineering"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">CTC <span className="text-red-500">*</span></label>
                  <input value={offerForm.ctc} onChange={(e) => setOfferForm((f) => ({ ...f, ctc: e.target.value }))} placeholder="e.g. 12 LPA or ₹12,00,000 per annum"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">Date of Joining <span className="text-red-500">*</span></label>
                  <input type="date" value={offerForm.joiningDate} onChange={(e) => setOfferForm((f) => ({ ...f, joiningDate: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                </div>
                <div className="col-span-2">
                  <label className="text-sm font-medium text-gray-700 block mb-1">Additional Terms (optional)</label>
                  <textarea value={offerForm.additionalTerms} onChange={(e) => setOfferForm((f) => ({ ...f, additionalTerms: e.target.value }))}
                    rows={3} placeholder="Any additional terms or conditions..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none" />
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={createOffer} disabled={savingOffer || !offerForm.designation || !offerForm.ctc || !offerForm.joiningDate}
                  className="px-5 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50">
                  {savingOffer ? "Generating PDF..." : "Generate Offer Letter"}
                </button>
                <button onClick={() => setShowOfferForm(false)} className="px-5 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50">Cancel</button>
              </div>
            </div>
          )}

          {offer && (
            <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900">Offer Letter</h3>
                  <p className="text-sm text-gray-500 mt-0.5">Created {new Date(offer.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}</p>
                </div>
                <span className={`text-sm px-3 py-1 rounded-full font-medium capitalize ${OFFER_STATUS_COLORS[offer.status]}`}>{offer.status}</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {[["Designation", offer.designation], ["Department", offer.department], ["CTC", offer.ctc], ["Date of Joining", new Date(offer.joiningDate).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })]].map(([l, v]) => (
                  <div key={l} className="bg-gray-50 rounded-lg px-4 py-3">
                    <p className="text-xs text-gray-500">{l}</p>
                    <p className="font-medium text-gray-900 mt-0.5">{v}</p>
                  </div>
                ))}
              </div>
              {offer.additionalTerms && (
                <div className="bg-gray-50 rounded-lg px-4 py-3">
                  <p className="text-xs text-gray-500 mb-1">Additional Terms</p>
                  <p className="text-sm text-gray-700">{offer.additionalTerms}</p>
                </div>
              )}

              {/* Signature Audit Trail */}
              {(offer as {signedAt?: string}).signedAt && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 space-y-2">
                  <p className="text-xs font-semibold text-emerald-800 uppercase tracking-wide flex items-center gap-1.5">
                    <CheckCircle className="h-3.5 w-3.5" /> Signature Audit Trail
                  </p>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs">
                    <div><span className="text-gray-500">Signed at</span><p className="font-medium text-gray-900">{new Date((offer as {signedAt: string}).signedAt).toLocaleString()}</p></div>
                    <div><span className="text-gray-500">IP Address</span><p className="font-medium text-gray-900">{(offer as {signerIp?: string}).signerIp ?? "—"}</p></div>
                    <div className="col-span-2"><span className="text-gray-500">Browser / Device</span><p className="font-medium text-gray-900 truncate">{(offer as {signerAgent?: string}).signerAgent ?? "—"}</p></div>
                  </div>
                </div>
              )}

              {/* PDF + Actions */}
              <div className="flex flex-wrap gap-3 pt-2 border-t border-gray-100">
                <button
                  onClick={async () => {
                    const pdfFile = (offer as {signedPdfFileName?: string; pdfFileName?: string}).signedPdfFileName ? "signed" : "original";
                    const res = await fetch(`/api/candidates/${candidateId}/offer/pdf?version=${pdfFile}`, {
                      headers: { Authorization: `Bearer ${token}` },
                    });
                    if (res.ok) {
                      const blob = await res.blob();
                      window.open(URL.createObjectURL(blob), "_blank");
                    }
                  }}
                  className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50">
                  <FileText className="h-4 w-4 text-red-500" />
                  {(offer as {signedPdfFileName?: string}).signedPdfFileName ? "View Signed PDF" : "View PDF"}
                </button>

                {/* Sign link copy */}
                {(offer as {signToken?: string; signedAt?: string}).signToken && !(offer as {signedAt?: string}).signedAt && (
                  <button
                    onClick={() => {
                      const url = `${window.location.origin}/offer-sign/${(offer as {signToken: string}).signToken}`;
                      navigator.clipboard.writeText(url);
                      alert("Sign link copied to clipboard!");
                    }}
                    className="flex items-center gap-2 px-4 py-2 border border-emerald-200 text-emerald-700 rounded-lg text-sm hover:bg-emerald-50">
                    🔗 Copy Sign Link
                  </button>
                )}

                {offer.status === "draft" && (
                  <button onClick={() => updateOfferStatus("sent")} className="px-4 py-2 border border-blue-200 text-blue-700 rounded-lg text-sm hover:bg-blue-50">
                    Mark as Sent
                  </button>
                )}
                {offer.status === "sent" && (
                  <>
                    <button onClick={() => updateOfferStatus("accepted")} className="flex items-center gap-1.5 px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700">
                      <CheckCircle className="h-4 w-4" /> Accepted
                    </button>
                    <button onClick={() => updateOfferStatus("rejected")} className="flex items-center gap-1.5 px-4 py-2 border border-red-200 text-red-600 rounded-lg text-sm hover:bg-red-50">
                      <XCircle className="h-4 w-4" /> Rejected
                    </button>
                  </>
                )}
                <div className="relative group">
                  <button onClick={convertToOnboarding} disabled={convertingToOnboarding || !canStartOnboarding}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed">
                    <CheckCircle className="h-4 w-4" />
                    {convertingToOnboarding ? "Creating onboarding..." : "Start Onboarding"}
                  </button>
                  {!canStartOnboarding && (
                    <div className="absolute left-0 top-full mt-1.5 w-52 bg-gray-900 text-white text-xs rounded-lg px-3 py-2 hidden group-hover:block z-20">
                      Add at least one interview round before starting onboarding
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
