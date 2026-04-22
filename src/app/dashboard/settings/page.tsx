"use client";

import { useEffect, useState } from "react";
import { useAuthFetch } from "@/context/AuthContext";
import type { EmployeeTypeDocRule, DocumentTemplate, Company, EmploymentType } from "@/lib/types";

const employmentTypes: EmploymentType[] = ["full-time", "part-time", "contract", "intern"];

export default function SettingsPage() {
  const authFetch = useAuthFetch();
  const [rules, setRules] = useState<EmployeeTypeDocRule[]>([]);
  const [templates, setTemplates] = useState<DocumentTemplate[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCompany, setSelectedCompany] = useState("");

  useEffect(() => {
    loadData();
  }, []);

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
      if (cData.data.length > 0 && !selectedCompany) {
        setSelectedCompany(cData.data[0].id);
      }
    }
    setLoading(false);
  }

  const companyRules = rules.filter((r) => r.companyId === selectedCompany);
  const companyTemplates = templates.filter((t) => t.companyId === selectedCompany);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">Settings</h2>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="font-semibold text-gray-900 mb-4">
          Document Rules by Employment Type
        </h3>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Company</label>
          <select
            value={selectedCompany}
            onChange={(e) => setSelectedCompany(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
          >
            {companies.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        <div className="space-y-6">
          {employmentTypes.map((type) => {
            const rule = companyRules.find((r) => r.employmentType === type);
            return (
              <div key={type} className="border border-gray-100 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 capitalize mb-3">
                  {type.replace("-", " ")}
                </h4>
                {rule ? (
                  <div className="space-y-2">
                    <div>
                      <p className="text-xs text-gray-500 font-medium uppercase mb-1">
                        Required Documents
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {rule.requiredDocuments.map((id) => {
                          const t = companyTemplates.find((tmpl) => tmpl.id === id);
                          return (
                            <span
                              key={id}
                              className="text-xs bg-red-50 text-red-700 px-2 py-0.5 rounded"
                            >
                              {t?.name || id}
                            </span>
                          );
                        })}
                        {rule.requiredDocuments.length === 0 && (
                          <span className="text-xs text-gray-400">None</span>
                        )}
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 font-medium uppercase mb-1">
                        Optional Documents
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {rule.optionalDocuments.map((id) => {
                          const t = companyTemplates.find((tmpl) => tmpl.id === id);
                          return (
                            <span
                              key={id}
                              className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded"
                            >
                              {t?.name || id}
                            </span>
                          );
                        })}
                        {rule.optionalDocuments.length === 0 && (
                          <span className="text-xs text-gray-400">None</span>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-gray-400">No rules configured</p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
