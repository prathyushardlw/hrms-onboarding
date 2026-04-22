"use client";

import { useEffect, useState } from "react";
import { useAuthFetch } from "@/context/AuthContext";
import Link from "next/link";
import { Search, Filter, Plus } from "lucide-react";
import type { Onboarding, OnboardingStatus } from "@/lib/types";

const statusConfig: Record<string, { label: string; color: string }> = {
  initiated: { label: "Initiated", color: "bg-gray-100 text-gray-700" },
  sent: { label: "Sent", color: "bg-emerald-100 text-emerald-800" },
  in_progress: { label: "In Progress", color: "bg-yellow-100 text-yellow-700" },
  submitted: { label: "Submitted", color: "bg-purple-100 text-purple-700" },
  verified: { label: "Verified", color: "bg-green-100 text-green-700" },
  completed: { label: "Completed", color: "bg-emerald-100 text-emerald-700" },
};

export default function OnboardingListPage() {
  const authFetch = useAuthFetch();
  const [onboardings, setOnboardings] = useState<Onboarding[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    const data = await authFetch("/api/onboarding");
    if (data.success) setOnboardings(data.data);
    setLoading(false);
  }

  const filtered = onboardings.filter((o) => {
    const matchesSearch =
      !search ||
      o.candidate.name.toLowerCase().includes(search.toLowerCase()) ||
      o.candidate.email.toLowerCase().includes(search.toLowerCase()) ||
      o.department.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || o.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">Onboardings</h2>
        <Link
          href="/dashboard/onboarding/new"
          className="bg-[#0e382b] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#18471c] transition-colors flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Initiate Onboarding
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name, email, department..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
        >
          <option value="all">All Statuses</option>
          {Object.entries(statusConfig).map(([key, val]) => (
            <option key={key} value={key}>{val.label}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <p className="font-medium">No onboardings found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">
                  <th className="px-5 py-3">Candidate</th>
                  <th className="px-5 py-3">Type</th>
                  <th className="px-5 py-3">Department</th>
                  <th className="px-5 py-3">Joining Date</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Docs</th>
                  <th className="px-5 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((o) => {
                  const status = statusConfig[o.status];
                  const completedDocs = o.documents.filter(
                    (d) => ["signed", "uploaded", "verified", "filled"].includes(d.status)
                  ).length;
                  return (
                    <tr key={o.id} className="hover:bg-gray-50">
                      <td className="px-5 py-3">
                        <p className="font-medium text-gray-900">{o.candidate.name}</p>
                        <p className="text-xs text-gray-500">{o.candidate.email}</p>
                      </td>
                      <td className="px-5 py-3 text-sm text-gray-600 capitalize">
                        {o.employmentType.replace("-", " ")}
                      </td>
                      <td className="px-5 py-3 text-sm text-gray-600">{o.department}</td>
                      <td className="px-5 py-3 text-sm text-gray-600">
                        {new Date(o.joiningDate).toLocaleDateString()}
                      </td>
                      <td className="px-5 py-3">
                        <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${status?.color}`}>
                          {status?.label}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-sm text-gray-600">
                        {completedDocs}/{o.documents.length}
                      </td>
                      <td className="px-5 py-3">
                        <Link
                          href={`/dashboard/onboarding/${o.id}`}
                          className="text-emerald-700 hover:text-emerald-900 text-sm font-medium"
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
