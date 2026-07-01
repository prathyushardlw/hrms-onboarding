"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuthFetch } from "@/context/AuthContext";
import Link from "next/link";
import { ArrowLeft, Upload, X } from "lucide-react";

const SOURCES = [
  { value: "linkedin", label: "LinkedIn" },
  { value: "referral", label: "Referral" },
  { value: "agency", label: "Agency" },
  { value: "walk_in", label: "Walk-in" },
  { value: "job_board", label: "Job Board" },
  { value: "other", label: "Other" },
];

export default function NewCandidatePage() {
  const { id: jobId } = useParams<{ id: string }>();
  const authFetch = useAuthFetch();
  const router = useRouter();

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    source: "linkedin",
    currentCompany: "",
    currentDesignation: "",
    expectedSalary: "",
    noticePeriod: "",
    linkedinUrl: "",
    portfolioUrl: "",
    notes: "",
  });
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const set = (key: string, value: string) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: "" }));
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = "Name is required";
    if (!form.email.trim()) e.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = "Invalid email";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async () => {
    if (!validate()) return;
    setSaving(true);

    const token = JSON.parse(typeof window !== "undefined" ? localStorage.getItem("auth") ?? "{}" : "{}").token;

    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => { if (v) fd.append(k, v); });
    if (resumeFile) fd.append("resume", resumeFile);

    const res = await fetch(`/api/jobs/${jobId}/candidates`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: fd,
    });
    const data = await res.json();
    if (data.success) {
      router.push(`/dashboard/jobs/${jobId}`);
    } else {
      setErrors({ _: data.error ?? "Failed to add candidate" });
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href={`/dashboard/jobs/${jobId}`} className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Add Candidate</h2>
          <p className="text-gray-500 text-sm mt-0.5">Add a candidate you've sourced for this role</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
        {/* Required */}
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2 sm:col-span-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name <span className="text-red-500">*</span></label>
            <input
              value={form.name} onChange={(e) => set("name", e.target.value)}
              placeholder="John Doe"
              className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 ${errors.name ? "border-red-400" : "border-gray-300"}`}
            />
            {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
          </div>
          <div className="col-span-2 sm:col-span-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">Email <span className="text-red-500">*</span></label>
            <input
              type="email" value={form.email} onChange={(e) => set("email", e.target.value)}
              placeholder="john@example.com"
              className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 ${errors.email ? "border-red-400" : "border-gray-300"}`}
            />
            {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
          </div>
        </div>

        {/* Phone + Source */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
            <input value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+91 98765 43210"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Source</label>
            <select value={form.source} onChange={(e) => set("source", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
              {SOURCES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
        </div>

        {/* Current company + designation */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Current Company</label>
            <input value={form.currentCompany} onChange={(e) => set("currentCompany", e.target.value)} placeholder="Acme Corp"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Current Designation</label>
            <input value={form.currentDesignation} onChange={(e) => set("currentDesignation", e.target.value)} placeholder="Software Engineer"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
          </div>
        </div>

        {/* Salary + Notice */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Expected Salary</label>
            <input value={form.expectedSalary} onChange={(e) => set("expectedSalary", e.target.value)} placeholder="e.g. 12 LPA"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notice Period</label>
            <input value={form.noticePeriod} onChange={(e) => set("noticePeriod", e.target.value)} placeholder="e.g. 30 days / Immediate"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
          </div>
        </div>

        {/* LinkedIn + Portfolio */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">LinkedIn URL</label>
            <input value={form.linkedinUrl} onChange={(e) => set("linkedinUrl", e.target.value)} placeholder="https://linkedin.com/in/..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Portfolio URL</label>
            <input value={form.portfolioUrl} onChange={(e) => set("portfolioUrl", e.target.value)} placeholder="https://..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
          </div>
        </div>

        {/* Resume upload */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Resume / CV</label>
          {resumeFile ? (
            <div className="flex items-center gap-3 px-4 py-3 border border-green-300 bg-green-50 rounded-lg">
              <Upload className="h-5 w-5 text-green-600" />
              <span className="flex-1 text-sm text-green-700 truncate">{resumeFile.name}</span>
              <button onClick={() => setResumeFile(null)} className="text-gray-400 hover:text-red-500"><X className="h-4 w-4" /></button>
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center px-4 py-6 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-green-400 hover:bg-green-50 transition-colors">
              <Upload className="h-7 w-7 text-gray-400 mb-2" />
              <span className="text-sm text-gray-500">Click to upload PDF or DOCX</span>
              <input
                type="file" accept=".pdf,.doc,.docx" className="hidden"
                onChange={(e) => setResumeFile(e.target.files?.[0] ?? null)}
              />
            </label>
          )}
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Internal Notes</label>
          <textarea
            value={form.notes} onChange={(e) => set("notes", e.target.value)}
            rows={3} placeholder="Any recruiter notes about this candidate..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
          />
        </div>

        {errors._ && <p className="text-sm text-red-600">{errors._}</p>}

        <div className="flex gap-3 pt-2">
          <button onClick={submit} disabled={saving}
            className="px-5 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50">
            {saving ? "Adding..." : "Add Candidate"}
          </button>
          <Link href={`/dashboard/jobs/${jobId}`} className="px-5 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50">
            Cancel
          </Link>
        </div>
      </div>
    </div>
  );
}
