"use client";

import { useEffect, useState } from "react";
import { useAuthFetch } from "@/context/AuthContext";
import { Plus, FileText, Trash2, Edit } from "lucide-react";
import type { DocumentTemplate, Company } from "@/lib/types";

export default function TemplatesPage() {
  const authFetch = useAuthFetch();
  const [templates, setTemplates] = useState<DocumentTemplate[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: "",
    category: "compliance" as DocumentTemplate["category"],
    companyId: "",
    templateType: "pdf" as "pdf" | "html",
    uploadRequired: false,
  });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    const [tData, cData] = await Promise.all([
      authFetch("/api/templates"),
      authFetch("/api/companies"),
    ]);
    if (tData.success) setTemplates(tData.data);
    if (cData.success) {
      setCompanies(cData.data);
      if (cData.data.length > 0 && !form.companyId) {
        setForm((f) => ({ ...f, companyId: cData.data[0].id }));
      }
    }
    setLoading(false);
  }

  const handleCreate = async () => {
    const res = await authFetch("/api/templates", {
      method: "POST",
      body: JSON.stringify({
        ...form,
        placeholders: [],
        signatureFields: [],
      }),
    });
    if (res.success) {
      setShowForm(false);
      setForm({ name: "", category: "compliance", companyId: form.companyId, templateType: "pdf", uploadRequired: false });
      loadData();
    }
  };

  const handleDelete = async (id: string) => {
    await authFetch(`/api/templates/${id}`, { method: "DELETE" });
    loadData();
  };

  const categoryColors: Record<string, string> = {
    compliance: "bg-blue-50 text-blue-700",
    banking: "bg-green-50 text-green-700",
    agreement: "bg-purple-50 text-purple-700",
    identity: "bg-orange-50 text-orange-700",
    other: "bg-gray-50 text-gray-700",
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">Document Templates</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Add Template
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <h3 className="font-semibold text-gray-900">New Template</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Template Name
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="e.g. W-4 Form"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Category
              </label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value as DocumentTemplate["category"] })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="compliance">Compliance</option>
                <option value="banking">Banking</option>
                <option value="agreement">Agreement</option>
                <option value="identity">Identity</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Company
              </label>
              <select
                value={form.companyId}
                onChange={(e) => setForm({ ...form, companyId: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              >
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="flex items-end gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.uploadRequired}
                  onChange={(e) => setForm({ ...form, uploadRequired: e.target.checked })}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <span className="text-sm text-gray-700">Requires file upload</span>
              </label>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleCreate}
              disabled={!form.name}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              Create Template
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {templates.map((t) => (
          <div
            key={t.id}
            className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-sm transition-shadow"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gray-50 rounded-lg">
                  <FileText className="h-5 w-5 text-gray-500" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">{t.name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {t.templateType.toUpperCase()}
                    {t.uploadRequired ? " · Upload required" : ""}
                  </p>
                </div>
              </div>
              <button
                onClick={() => handleDelete(t.id)}
                className="text-gray-400 hover:text-red-500 transition-colors"
                title="Delete"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-3">
              <span
                className={`inline-block text-xs font-medium px-2.5 py-1 rounded-full capitalize ${
                  categoryColors[t.category] || categoryColors.other
                }`}
              >
                {t.category}
              </span>
            </div>
          </div>
        ))}
      </div>

      {templates.length === 0 && !showForm && (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <FileText className="h-12 w-12 mx-auto mb-3 text-gray-300" />
          <p className="font-medium text-gray-700">No templates yet</p>
          <p className="text-sm text-gray-500 mt-1">
            Create your first document template to get started.
          </p>
        </div>
      )}
    </div>
  );
}
