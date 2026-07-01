"use client";

import { useEffect, useState } from "react";
import { useAuth, useAuthFetch } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Building2, Users, Shield } from "lucide-react";

export default function AdminOverviewPage() {
  const { isSuperAdmin, isLoading } = useAuth();
  const authFetch = useAuthFetch();
  const router = useRouter();
  const [companies, setCompanies] = useState<{ id: string; name: string; isActive: boolean }[]>([]);
  const [users, setUsers] = useState<{ id: string; role: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoading && !isSuperAdmin) router.replace("/dashboard");
  }, [isLoading, isSuperAdmin, router]);

  useEffect(() => {
    if (!isSuperAdmin) return;
    Promise.all([
      authFetch("/api/admin/companies"),
      authFetch("/api/admin/users"),
    ]).then(([c, u]) => {
      if (c.success) setCompanies(c.data);
      if (u.success) setUsers(u.data);
      setLoading(false);
    });
  }, [isSuperAdmin, authFetch]);

  if (isLoading || loading) {
    return <div className="flex items-center justify-center h-40"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600" /></div>;
  }

  const activeCompanies = companies.filter((c) => c.isActive).length;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Platform Overview</h2>
        <p className="text-gray-500 mt-1">Manage all companies and users across the platform.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4">
          <div className="h-12 w-12 rounded-lg bg-green-50 flex items-center justify-center">
            <Building2 className="h-6 w-6 text-green-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{activeCompanies}</p>
            <p className="text-sm text-gray-500">Active Companies</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4">
          <div className="h-12 w-12 rounded-lg bg-blue-50 flex items-center justify-center">
            <Users className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{users.length}</p>
            <p className="text-sm text-gray-500">Total Users</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4">
          <div className="h-12 w-12 rounded-lg bg-purple-50 flex items-center justify-center">
            <Shield className="h-6 w-6 text-purple-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{companies.length}</p>
            <p className="text-sm text-gray-500">Total Companies</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link href="/dashboard/admin/companies" className="bg-white rounded-xl border border-gray-200 p-6 hover:border-green-400 transition-colors group">
          <Building2 className="h-7 w-7 text-green-600 mb-3" />
          <h3 className="font-semibold text-gray-900 group-hover:text-green-700">Manage Companies</h3>
          <p className="text-sm text-gray-500 mt-1">Add, edit, or deactivate companies</p>
        </Link>
        <Link href="/dashboard/admin/users" className="bg-white rounded-xl border border-gray-200 p-6 hover:border-blue-400 transition-colors group">
          <Users className="h-7 w-7 text-blue-600 mb-3" />
          <h3 className="font-semibold text-gray-900 group-hover:text-blue-700">Manage Users</h3>
          <p className="text-sm text-gray-500 mt-1">Create HR admins and assign them to companies</p>
        </Link>
      </div>
    </div>
  );
}
