"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthFetch } from "@/context/AuthContext";
import { ArrowLeft, Plus, X } from "lucide-react";
import Link from "next/link";

const EMPLOYMENT_TYPES = [
  { value: "full-time", label: "Full-time" },
  { value: "part-time", label: "Part-time" },
  { value: "contract", label: "Contract" },
  { value: "intern", label: "Intern" },
];

export default function NewJobPage() {
  const authFetch = useAuthFetch();
  const router = useRouter();

  const [form, setForm] = useState({
    title: "",
    department: "",
    employmentType: "full-time",
    location: "",
    description: "",
  });
  const [skillInput, setSkillInput] = useState("");
  const [skills, setSkills] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const set = (key: string, value: string) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: "" }));
  };

  const addSkill = () => {
    const s = skillInput.trim();
    if (s && !skills.includes(s)) {
      setSkills((prev) => [...prev, s]);
    }
    setSkillInput("");
  };

  const removeSkill = (s: string) => setSkills((prev) => prev.filter((x) => x !== s));

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.title.trim()) e.title = "Job title is required";
    if (!form.department.trim()) e.department = "Department is required";
    if (!form.location.trim()) e.location = "Location is required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async () => {
    if (!validate()) return;
    setSaving(true);
    const res = await authFetch("/api/jobs", {
      method: "POST",
      body: JSON.stringify({ ...form, requiredSkills: skills }),
    });
    if (res.success) {
      router.push(`/dashboard/jobs/${res.data.id}`);
    } else {
      setErrors({ _: res.error ?? "Failed to create job" });
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/jobs" className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Post a Job</h2>
          <p className="text-gray-500 text-sm mt-0.5">Create a new job opening</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Job Title <span className="text-red-500">*</span></label>
          <input
            value={form.title}
            onChange={(e) => set("title", e.target.value)}
            placeholder="e.g. Senior React Developer"
            className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 ${errors.title ? "border-red-400" : "border-gray-300"}`}
          />
          {errors.title && <p className="text-xs text-red-500 mt-1">{errors.title}</p>}
        </div>

        {/* Department + Type */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Department <span className="text-red-500">*</span></label>
            <input
              value={form.department}
              onChange={(e) => set("department", e.target.value)}
              placeholder="e.g. Engineering"
              className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 ${errors.department ? "border-red-400" : "border-gray-300"}`}
            />
            {errors.department && <p className="text-xs text-red-500 mt-1">{errors.department}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Employment Type</label>
            <select
              value={form.employmentType}
              onChange={(e) => set("employmentType", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              {EMPLOYMENT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Location */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Location <span className="text-red-500">*</span></label>
          <input
            value={form.location}
            onChange={(e) => set("location", e.target.value)}
            placeholder="e.g. Hyderabad / Remote / Hybrid"
            className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 ${errors.location ? "border-red-400" : "border-gray-300"}`}
          />
          {errors.location && <p className="text-xs text-red-500 mt-1">{errors.location}</p>}
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Job Description</label>
          <textarea
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
            rows={5}
            placeholder="Describe the role, responsibilities, and requirements..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
          />
        </div>

        {/* Skills */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Required Skills</label>
          <div className="flex gap-2">
            <input
              value={skillInput}
              onChange={(e) => setSkillInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addSkill(); } }}
              placeholder="Type a skill and press Enter"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
            <button onClick={addSkill} className="px-3 py-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50">
              <Plus className="h-4 w-4" />
            </button>
          </div>
          {skills.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {skills.map((s) => (
                <span key={s} className="flex items-center gap-1 px-2.5 py-1 bg-green-50 text-green-700 text-sm rounded-lg border border-green-200">
                  {s}
                  <button onClick={() => removeSkill(s)} className="hover:text-red-500">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {errors._ && <p className="text-sm text-red-600">{errors._}</p>}

        <div className="flex gap-3 pt-2">
          <button
            onClick={submit}
            disabled={saving}
            className="px-5 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50"
          >
            {saving ? "Creating..." : "Create Job Posting"}
          </button>
          <Link href="/dashboard/jobs" className="px-5 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50">
            Cancel
          </Link>
        </div>
      </div>
    </div>
  );
}
