"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth, useAuthFetch } from "@/context/AuthContext";
import { ArrowLeft, ArrowRight, Check, Loader2 } from "lucide-react";
import type { Company, DocumentTemplate, EmployeeTypeDocRule, EmploymentType } from "@/lib/types";

const steps = ["Candidate Info", "Select Documents", "Review & Send"];

export default function NewOnboardingPage() {
  const router = useRouter();
  const { user } = useAuth();
  const authFetch = useAuthFetch();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Data
  const [companies, setCompanies] = useState<Company[]>([]);
  const [templates, setTemplates] = useState<DocumentTemplate[]>([]);
  const [docRules, setDocRules] = useState<EmployeeTypeDocRule[]>([]);

  // Form
  const [form, setForm] = useState({
    companyId: "",
    candidateName: "",
    candidateEmail: "",
    candidatePhone: "",
    candidateAddress: "",
    employmentType: "full-time" as EmploymentType,
    department: "",
    designation: "",
    joiningDate: "",
  });
  const [selectedDocs, setSelectedDocs] = useState<Set<string>>(new Set());

  useEffect(() => {
    Promise.all([
      authFetch("/api/companies"),
      authFetch("/api/templates"),
      authFetch("/api/doc-rules"),
    ]).then(([compData, templData, rulesData]) => {
      if (compData.success) {
        setCompanies(compData.data);
        if (compData.data.length > 0 && !form.companyId) {
          const companyId = compData.data[0].id;
          setForm((f) => ({ ...f, companyId }));

          // Pre-select docs immediately since docRules state isn't set yet
          if (rulesData.success) {
            const rule = rulesData.data.find(
              (r: EmployeeTypeDocRule) => r.companyId === companyId && r.employmentType === form.employmentType
            );
            if (rule) {
              setSelectedDocs(new Set([...rule.requiredDocuments, ...rule.optionalDocuments]));
            }
          }
        }
      }
      if (templData.success) setTemplates(templData.data);
      if (rulesData.success) setDocRules(rulesData.data);
    });
  }, [authFetch]);

  // Auto-select documents when employment type changes
  useEffect(() => {
    const rule = docRules.find(
      (r) => r.companyId === form.companyId && r.employmentType === form.employmentType
    );
    if (rule) {
      setSelectedDocs(new Set([...rule.requiredDocuments, ...rule.optionalDocuments]));
    }
  }, [form.employmentType, form.companyId, docRules]);

  const updateForm = (key: string, value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  const toggleDoc = (id: string) => {
    setSelectedDocs((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const canProceed = () => {
    if (step === 0) {
      return (
        form.companyId &&
        form.candidateName &&
        form.candidateEmail &&
        form.candidatePhone &&
        form.department &&
        form.designation &&
        form.joiningDate
      );
    }
    if (step === 1) return selectedDocs.size > 0;
    return true;
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError("");

    const res = await authFetch("/api/onboarding", {
      method: "POST",
      body: JSON.stringify({
        companyId: form.companyId,
        candidate: {
          name: form.candidateName,
          email: form.candidateEmail,
          phone: form.candidatePhone,
          address: form.candidateAddress,
        },
        employmentType: form.employmentType,
        department: form.department,
        designation: form.designation,
        joiningDate: form.joiningDate,
        documentTemplateIds: Array.from(selectedDocs),
      }),
    });

    if (res.success) {
      router.push(`/dashboard/onboarding/${res.data.id}`);
    } else {
      setError(res.error || "Failed to create onboarding");
      setLoading(false);
    }
  };

  const companyTemplates = templates.filter((t) => t.companyId === form.companyId);
  const rule = docRules.find(
    (r) => r.companyId === form.companyId && r.employmentType === form.employmentType
  );
  const requiredIds = new Set(rule?.requiredDocuments || []);

  return (
    <div className="max-w-3xl mx-auto">
      <button
        onClick={() => router.back()}
        className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4"
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      <h2 className="text-xl font-bold text-gray-900 mb-6">Initiate Onboarding</h2>

      {/* Step indicator */}
      <div className="flex items-center mb-8">
        {steps.map((s, i) => (
          <div key={s} className="flex items-center flex-1">
            <div
              className={`flex items-center justify-center h-8 w-8 rounded-full text-sm font-medium ${
                i <= step
                  ? "bg-blue-600 text-white"
                  : "bg-gray-200 text-gray-500"
              }`}
            >
              {i < step ? <Check className="h-4 w-4" /> : i + 1}
            </div>
            <span
              className={`ml-2 text-sm font-medium ${
                i <= step ? "text-gray-900" : "text-gray-400"
              }`}
            >
              {s}
            </span>
            {i < steps.length - 1 && (
              <div
                className={`flex-1 h-0.5 mx-4 ${
                  i < step ? "bg-blue-600" : "bg-gray-200"
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg mb-4">
          {error}
        </div>
      )}

      {/* Step 1: Candidate Info */}
      {step === 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Company *
              </label>
              <select
                value={form.companyId}
                onChange={(e) => updateForm("companyId", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              >
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Employment Type *
              </label>
              <select
                value={form.employmentType}
                onChange={(e) => updateForm("employmentType", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="full-time">Full Time</option>
                <option value="part-time">Part Time</option>
                <option value="contract">Contract</option>
                <option value="intern">Intern</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Candidate Name *
              </label>
              <input
                type="text"
                value={form.candidateName}
                onChange={(e) => updateForm("candidateName", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="John Doe"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email Address *
              </label>
              <input
                type="email"
                value={form.candidateEmail}
                onChange={(e) => updateForm("candidateEmail", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="john@example.com"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone Number *
              </label>
              <input
                type="tel"
                value={form.candidatePhone}
                onChange={(e) => updateForm("candidatePhone", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="+1 555-0123"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Address
              </label>
              <input
                type="text"
                value={form.candidateAddress}
                onChange={(e) => updateForm("candidateAddress", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="123 Main St, City, State"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Department *
              </label>
              <input
                type="text"
                value={form.department}
                onChange={(e) => updateForm("department", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="Engineering"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Designation *
              </label>
              <input
                type="text"
                value={form.designation}
                onChange={(e) => updateForm("designation", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="Software Engineer"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Joining Date *
              </label>
              <input
                type="date"
                value={form.joiningDate}
                onChange={(e) => updateForm("joiningDate", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Select Documents */}
      {step === 1 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <p className="text-sm text-gray-500 mb-4">
            Documents are pre-selected based on employment type rules. You can customize the selection.
          </p>
          <div className="space-y-2">
            {companyTemplates.map((template) => {
              const isRequired = requiredIds.has(template.id);
              const isSelected = selectedDocs.has(template.id);
              return (
                <label
                  key={template.id}
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    isSelected
                      ? "border-blue-200 bg-blue-50"
                      : "border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleDoc(template.id)}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">
                      {template.name}
                    </p>
                    <p className="text-xs text-gray-500 capitalize">
                      {template.category}
                      {template.uploadRequired && " • Upload required"}
                    </p>
                  </div>
                  {isRequired && (
                    <span className="text-xs font-medium text-red-600 bg-red-50 px-2 py-0.5 rounded">
                      Required
                    </span>
                  )}
                </label>
              );
            })}
            {companyTemplates.length === 0 && (
              <p className="text-gray-500 text-sm text-center py-8">
                No templates found. Add templates in Settings first.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Step 3: Review */}
      {step === 2 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <h3 className="font-semibold text-gray-900">Review Onboarding Details</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-500">Candidate</p>
              <p className="font-medium">{form.candidateName}</p>
            </div>
            <div>
              <p className="text-gray-500">Email</p>
              <p className="font-medium">{form.candidateEmail}</p>
            </div>
            <div>
              <p className="text-gray-500">Phone</p>
              <p className="font-medium">{form.candidatePhone}</p>
            </div>
            <div>
              <p className="text-gray-500">Employment Type</p>
              <p className="font-medium capitalize">{form.employmentType.replace("-", " ")}</p>
            </div>
            <div>
              <p className="text-gray-500">Department</p>
              <p className="font-medium">{form.department}</p>
            </div>
            <div>
              <p className="text-gray-500">Designation</p>
              <p className="font-medium">{form.designation}</p>
            </div>
            <div>
              <p className="text-gray-500">Joining Date</p>
              <p className="font-medium">
                {form.joiningDate ? new Date(form.joiningDate).toLocaleDateString() : "-"}
              </p>
            </div>
            <div>
              <p className="text-gray-500">Company</p>
              <p className="font-medium">
                {companies.find((c) => c.id === form.companyId)?.name}
              </p>
            </div>
          </div>

          <div className="pt-4 border-t border-gray-100">
            <p className="text-gray-500 text-sm mb-2">
              Selected Documents ({selectedDocs.size})
            </p>
            <div className="flex flex-wrap gap-2">
              {Array.from(selectedDocs).map((id) => {
                const t = templates.find((tmpl) => tmpl.id === id);
                return (
                  <span
                    key={id}
                    className="text-xs bg-gray-100 text-gray-700 px-2.5 py-1 rounded-full"
                  >
                    {t?.name}
                  </span>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between mt-6">
        <button
          onClick={() => setStep((s) => s - 1)}
          disabled={step === 0}
          className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 disabled:opacity-30"
        >
          <ArrowLeft className="h-4 w-4 inline mr-1" /> Previous
        </button>

        {step < steps.length - 1 ? (
          <button
            onClick={() => setStep((s) => s + 1)}
            disabled={!canProceed()}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1"
          >
            Next <ArrowRight className="h-4 w-4" />
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={loading || !canProceed()}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Create Onboarding
          </button>
        )}
      </div>
    </div>
  );
}
