"use client";

import { useEffect, useState } from "react";
import { useAuthFetch } from "@/context/AuthContext";
import { Plus, X, Pencil, Check, Loader2 } from "lucide-react";
import type { EmployeeTypeDocRule, DocumentTemplate, Company, EmploymentType } from "@/lib/types";

const employmentTypes: EmploymentType[] = ["full-time", "part-time", "contract", "intern"];

type EditState = {
  requiredDocuments: string[];
  optionalDocuments: string[];
};

export default function SettingsPage() {
  const authFetch = useAuthFetch();
  const [rules, setRules] = useState<EmployeeTypeDocRule[]>([]);
  const [templates, setTemplates] = useState<DocumentTemplate[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCompany, setSelectedCompany] = useState("");
  const [editingType, setEditingType] = useState<EmploymentType | null>(null);
  const [editState, setEditState] = useState<EditState>({ requiredDocuments: [], optionalDocuments: [] });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    const [rData, tData, cData] = await Promise.all([
      authFetch("/api/doc-rules"),
      authFetch("/api/templates"),
      authFetch("/api/companies"),
    ]);
    if (rData.success) setRules(rData.data);
    if (tData.success) setTemplates(tData.data);
    if (cData.success) {
      setCompanies(cData.data);
      if (cData.data.length > 0 && !selectedCompany) setSelectedCompany(cData.data[0].id);
    }
    setLoading(false);
  }

  const companyRules = rules.filter((r) => r.companyId === selectedCompany);
  const companyTemplates = templates.filter((t) => t.companyId === selectedCompany);

  function startEdit(type: EmploymentType) {
    const rule = companyRules.find((r) => r.employmentType === type);
    setEditState({
      requiredDocuments: rule?.requiredDocuments ?? [],
      optionalDocuments: rule?.optionalDocuments ?? [],
    });
    setEditingType(type);
    setSaveError(null);
  }

  function toggleDoc(docId: string, bucket: "requiredDocuments" | "optionalDocuments") {
    setEditState((prev) => {
      const inBucket = prev[bucket].includes(docId);
      const other = bucket === "requiredDocuments" ? "optionalDocuments" : "requiredDocuments";
      if (inBucket) {
        return { ...prev, [bucket]: prev[bucket].filter((id) => id !== docId) };
      }
      // Remove from the other bucket if present, then add to this one
      return {
        ...prev,
        [other]: prev[other].filter((id) => id !== docId),
        [bucket]: [...prev[bucket], docId],
      };
    });
  }

  async function saveRule(type: EmploymentType) {
    setSaving(true);
    setSaveError(null);
    const existing = companyRules.find((r) => r.employmentType === type);

    if (existing) {
      const res = await authFetch(`/api/doc-rules/${existing.id}`, {
        method: "PUT",
        body: JSON.stringify(editState),
      });
      if (res.success) {
        setRules((prev) => prev.map((r) => r.id === existing.id ? res.data : r));
        setEditingType(null);
      } else {
        setSaveError(res.error ?? "Failed to save");
      }
    } else {
      const res = await authFetch("/api/doc-rules", {
        method: "POST",
        body: JSON.stringify({ companyId: selectedCompany, employmentType: type, ...editState }),
      });
      if (res.success) {
        setRules((prev) => [...prev, res.data]);
        setEditingType(null);
      } else {
        setSaveError(res.error ?? "Failed to save");
      }
    }
    setSaving(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">Settings</h2>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="font-semibold text-gray-900 mb-1">Document Rules by Employment Type</h3>
        <p className="text-sm text-gray-500 mb-4">Configure which documents are required or optional for each employment type during onboarding.</p>

        <div className="mb-5">
          <label className="block text-sm font-medium text-gray-700 mb-1">Company</label>
          <select
            value={selectedCompany}
            onChange={(e) => { setSelectedCompany(e.target.value); setEditingType(null); }}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
          >
            {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        <div className="space-y-4">
          {employmentTypes.map((type) => {
            const rule = companyRules.find((r) => r.employmentType === type);
            const isEditing = editingType === type;

            return (
              <div key={type} className="border border-gray-200 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium text-gray-900 capitalize">{type.replace("-", " ")}</h4>
                  {!isEditing ? (
                    <button
                      onClick={() => startEdit(type)}
                      className="flex items-center gap-1.5 text-xs px-3 py-1.5 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50"
                    >
                      <Pencil className="h-3 w-3" /> Edit
                    </button>
                  ) : (
                    <div className="flex items-center gap-2">
                      {saveError && <span className="text-xs text-red-600">{saveError}</span>}
                      <button
                        onClick={() => setEditingType(null)}
                        className="text-xs px-3 py-1.5 border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => saveRule(type)}
                        disabled={saving}
                        className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50"
                      >
                        {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                        Save
                      </button>
                    </div>
                  )}
                </div>

                {isEditing ? (
                  <div className="space-y-4">
                    {(["requiredDocuments", "optionalDocuments"] as const).map((bucket) => (
                      <div key={bucket}>
                        <p className="text-xs font-medium uppercase text-gray-500 mb-2">
                          {bucket === "requiredDocuments" ? "Required Documents" : "Optional Documents"}
                        </p>
                        {/* Selected docs */}
                        <div className="flex flex-wrap gap-1.5 mb-2 min-h-[28px]">
                          {editState[bucket].length === 0 && (
                            <span className="text-xs text-gray-400 italic">None selected</span>
                          )}
                          {editState[bucket].map((id) => {
                            const t = companyTemplates.find((tmpl) => tmpl.id === id);
                            return (
                              <span
                                key={id}
                                className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${bucket === "requiredDocuments" ? "bg-red-50 text-red-700" : "bg-gray-100 text-gray-700"}`}
                              >
                                {t?.name || id}
                                <button onClick={() => toggleDoc(id, bucket)} className="hover:opacity-70">
                                  <X className="h-3 w-3" />
                                </button>
                              </span>
                            );
                          })}
                        </div>
                        {/* Available to add */}
                        <div className="flex flex-wrap gap-1.5">
                          {companyTemplates
                            .filter((t) => !editState.requiredDocuments.includes(t.id) && !editState.optionalDocuments.includes(t.id))
                            .map((t) => (
                              <button
                                key={t.id}
                                onClick={() => toggleDoc(t.id, bucket)}
                                className="flex items-center gap-1 text-xs px-2 py-0.5 border border-dashed border-gray-300 rounded-full text-gray-500 hover:border-emerald-400 hover:text-emerald-700"
                              >
                                <Plus className="h-3 w-3" /> {t.name}
                              </button>
                            ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div>
                      <p className="text-xs text-gray-400 font-medium uppercase mb-1">Required</p>
                      <div className="flex flex-wrap gap-1.5">
                        {(rule?.requiredDocuments ?? []).map((id) => {
                          const t = companyTemplates.find((tmpl) => tmpl.id === id);
                          return <span key={id} className="text-xs bg-red-50 text-red-700 px-2 py-0.5 rounded-full">{t?.name || id}</span>;
                        })}
                        {!rule?.requiredDocuments?.length && <span className="text-xs text-gray-400">None</span>}
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 font-medium uppercase mb-1">Optional</p>
                      <div className="flex flex-wrap gap-1.5">
                        {(rule?.optionalDocuments ?? []).map((id) => {
                          const t = companyTemplates.find((tmpl) => tmpl.id === id);
                          return <span key={id} className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full">{t?.name || id}</span>;
                        })}
                        {!rule?.optionalDocuments?.length && <span className="text-xs text-gray-400">None</span>}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
