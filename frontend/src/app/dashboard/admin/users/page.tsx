"use client";

import { useEffect, useState } from "react";
import { useAuth, useAuthFetch } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { Users, Plus, Pencil, Trash2 } from "lucide-react";

interface HRUser {
  id: string;
  name: string;
  email: string;
  role: string;
  companyIds: string[];
}

interface Company {
  id: string;
  name: string;
  isActive: boolean;
}

export default function AdminUsersPage() {
  const { isSuperAdmin, isLoading } = useAuth();
  const authFetch = useAuthFetch();
  const router = useRouter();

  const [users, setUsers] = useState<HRUser[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "admin", companyIds: [] as string[] });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isLoading && !isSuperAdmin) router.replace("/dashboard");
  }, [isLoading, isSuperAdmin, router]);

  const load = async () => {
    const [u, c] = await Promise.all([
      authFetch("/api/admin/users"),
      authFetch("/api/admin/companies"),
    ]);
    if (u.success) setUsers(u.data);
    if (c.success) setCompanies(c.data);
    setLoading(false);
  };

  useEffect(() => { if (isSuperAdmin) load(); }, [isSuperAdmin]);

  const openAdd = () => {
    setEditId(null);
    setForm({ name: "", email: "", password: "", role: "admin", companyIds: [] });
    setError("");
    setShowForm(true);
  };

  const openEdit = (u: HRUser) => {
    setEditId(u.id);
    setForm({ name: u.name, email: u.email, password: "", role: u.role, companyIds: u.companyIds });
    setError("");
    setShowForm(true);
  };

  const toggleCompany = (id: string) => {
    setForm((f) => ({
      ...f,
      companyIds: f.companyIds.includes(id) ? f.companyIds.filter((c) => c !== id) : [...f.companyIds, id],
    }));
  };

  const save = async () => {
    if (!form.name.trim()) { setError("Name is required"); return; }
    if (!editId && !form.email.trim()) { setError("Email is required"); return; }
    if (!editId && form.password.length < 6) { setError("Password must be at least 6 characters"); return; }
    if (form.companyIds.length === 0) { setError("Assign at least one company"); return; }

    setSaving(true);
    setError("");

    const res = editId
      ? await authFetch(`/api/admin/users/${editId}`, {
          method: "PATCH",
          body: JSON.stringify({ name: form.name, role: form.role, companyIds: form.companyIds }),
        })
      : await authFetch("/api/admin/users", {
          method: "POST",
          body: JSON.stringify(form),
        });

    if (res.success) {
      setShowForm(false);
      load();
    } else {
      setError(res.error ?? "Failed to save");
    }
    setSaving(false);
  };

  const deleteUser = async (id: string) => {
    if (!confirm("Delete this user? This cannot be undone.")) return;
    await authFetch(`/api/admin/users/${id}`, { method: "DELETE" });
    load();
  };

  const companyName = (id: string) => companies.find((c) => c.id === id)?.name ?? id;

  if (isLoading || loading) {
    return <div className="flex items-center justify-center h-40"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600" /></div>;
  }

  // Filter out super admins from the list
  const hrUsers = users.filter((u) => u.role !== "super_admin");

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Users</h2>
          <p className="text-gray-500 mt-1">{hrUsers.length} HR users across all companies</p>
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700">
          <Plus className="h-4 w-4" /> Add User
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <h3 className="font-semibold text-gray-900">{editId ? "Edit User" : "Add HR User"}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input type="text" placeholder="Full name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
            <input type="email" placeholder="Email address" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              disabled={!!editId} className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 disabled:bg-gray-50" />
            {!editId && (
              <input type="password" placeholder="Password (min 6 chars)" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
            )}
            <select value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
              <option value="admin">Admin</option>
              <option value="hr">HR</option>
              <option value="viewer">Viewer</option>
            </select>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">Assign to companies</p>
            <div className="flex flex-wrap gap-2">
              {companies.filter((c) => c.isActive).map((c) => (
                <button key={c.id} type="button" onClick={() => toggleCompany(c.id)}
                  className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                    form.companyIds.includes(c.id)
                      ? "bg-green-600 text-white border-green-600"
                      : "bg-white text-gray-700 border-gray-300 hover:border-green-400"
                  }`}>
                  {c.name}
                </button>
              ))}
            </div>
          </div>
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
        {hrUsers.map((u) => (
          <div key={u.id} className="flex items-center gap-4 px-5 py-4">
            <div className="h-9 w-9 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 font-medium text-sm">
              {u.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-900">{u.name}</p>
              <p className="text-sm text-gray-500">{u.email}</p>
              <div className="flex flex-wrap gap-1 mt-1">
                {u.companyIds.map((cid) => (
                  <span key={cid} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{companyName(cid)}</span>
                ))}
              </div>
            </div>
            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-medium capitalize">{u.role}</span>
            <div className="flex gap-1">
              <button onClick={() => openEdit(u)} className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-50 rounded-lg">
                <Pencil className="h-4 w-4" />
              </button>
              <button onClick={() => deleteUser(u.id)} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
        {hrUsers.length === 0 && (
          <div className="p-10 text-center text-gray-400">No users yet. Add one above.</div>
        )}
      </div>
    </div>
  );
}
