"use client";

import { useEffect, useState } from "react";
import { useAuth, useAuthFetch } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { Building2, Plus, Pencil, Power, PowerOff } from "lucide-react";

interface Company {
  id: string;
  name: string;
  isActive: boolean;
  createdAt: string;
}

export default function AdminCompaniesPage() {
  const { isSuperAdmin, isLoading } = useAuth();
  const authFetch = useAuthFetch();
  const router = useRouter();

  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [formName, setFormName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isLoading && !isSuperAdmin) router.replace("/dashboard");
  }, [isLoading, isSuperAdmin, router]);

  const load = async () => {
    const data = await authFetch("/api/admin/companies");
    if (data.success) setCompanies(data.data);
    setLoading(false);
  };

  useEffect(() => { if (isSuperAdmin) load(); }, [isSuperAdmin]);

  const openAdd = () => { setEditId(null); setFormName(""); setError(""); setShowForm(true); };
  const openEdit = (c: Company) => { setEditId(c.id); setFormName(c.name); setError(""); setShowForm(true); };

  const save = async () => {
    if (!formName.trim()) { setError("Name is required"); return; }
    setSaving(true);
    setError("");
    const res = editId
      ? await authFetch(`/api/admin/companies/${editId}`, { method: "PATCH", body: JSON.stringify({ name: formName }) })
      : await authFetch("/api/admin/companies", { method: "POST", body: JSON.stringify({ name: formName }) });
    if (res.success) {
      setShowForm(false);
      load();
    } else {
      setError(res.error ?? "Failed to save");
    }
    setSaving(false);
  };

  const toggleActive = async (c: Company) => {
    await authFetch(`/api/admin/companies/${c.id}`, {
      method: "PATCH",
      body: JSON.stringify({ isActive: !c.isActive }),
    });
    load();
  };

  if (isLoading || loading) {
    return <div className="flex items-center justify-center h-40"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600" /></div>;
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Companies</h2>
          <p className="text-gray-500 mt-1">{companies.length} total companies</p>
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700">
          <Plus className="h-4 w-4" /> Add Company
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
          <h3 className="font-semibold text-gray-900">{editId ? "Edit Company" : "Add Company"}</h3>
          <input
            type="text"
            value={formName}
            onChange={(e) => setFormName(e.target.value)}
            placeholder="Company name"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-2">
            <button onClick={save} disabled={saving} className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50">
              {saving ? "Saving..." : "Save"}
            </button>
            <button onClick={() => setShowForm(false)} className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50">
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
        {companies.map((c) => (
          <div key={c.id} className="flex items-center gap-4 px-5 py-4">
            <div className="h-9 w-9 rounded-lg bg-green-50 flex items-center justify-center">
              <Building2 className="h-5 w-5 text-green-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-900">{c.name}</p>
              <p className="text-xs text-gray-400">Created {new Date(c.createdAt).toLocaleDateString()}</p>
            </div>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${c.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
              {c.isActive ? "Active" : "Inactive"}
            </span>
            <div className="flex gap-1">
              <button onClick={() => openEdit(c)} className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-50 rounded-lg">
                <Pencil className="h-4 w-4" />
              </button>
              <button onClick={() => toggleActive(c)} className={`p-2 rounded-lg ${c.isActive ? "text-red-400 hover:text-red-600 hover:bg-red-50" : "text-green-400 hover:text-green-600 hover:bg-green-50"}`}>
                {c.isActive ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
              </button>
            </div>
          </div>
        ))}
        {companies.length === 0 && (
          <div className="p-10 text-center text-gray-400">No companies yet. Add one above.</div>
        )}
      </div>
    </div>
  );
}
