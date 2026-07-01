"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuthFetch } from "@/context/AuthContext";
import Link from "next/link";
import { Users, Search, ChevronRight } from "lucide-react";
import type { Employee } from "@/lib/types";

const STATUS_COLORS: Record<string, string> = {
  active:     "bg-green-100 text-green-700",
  probation:  "bg-yellow-100 text-yellow-700",
  notice:     "bg-orange-100 text-orange-700",
  resigned:   "bg-gray-100 text-gray-500",
  terminated: "bg-red-100 text-red-600",
};

const STATUS_LABELS: Record<string, string> = {
  active: "Active", probation: "Probation", notice: "On Notice",
  resigned: "Resigned", terminated: "Terminated",
};

const TYPE_LABELS: Record<string, string> = {
  "full-time": "Full-time", "part-time": "Part-time",
  contract: "Contract", intern: "Intern",
};

export default function EmployeesPage() {
  const authFetch = useAuthFetch();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const load = useCallback(async () => {
    const res = await authFetch("/api/employees");
    if (res.success) setEmployees(res.data);
    setLoading(false);
  }, [authFetch]);

  useEffect(() => { load(); }, [load]);

  const filtered = employees.filter((e) => {
    const matchStatus = statusFilter === "all" || e.status === statusFilter;
    const matchSearch = !search || [e.name, e.email, e.employeeId, e.department, e.designation]
      .some((f) => f?.toLowerCase().includes(search.toLowerCase()));
    return matchStatus && matchSearch;
  });

  const counts = ["active", "probation", "notice", "resigned", "terminated"].reduce((acc, s) => {
    acc[s] = employees.filter((e) => e.status === s).length;
    return acc;
  }, {} as Record<string, number>);

  if (loading) return (
    <div className="flex items-center justify-center h-40">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600" />
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Employees</h2>
          <p className="text-gray-500 mt-1">{employees.filter(e => e.status === "active" || e.status === "probation").length} active · {employees.length} total</p>
        </div>
      </div>

      {/* Status summary cards */}
      <div className="grid grid-cols-5 gap-3">
        {(["active", "probation", "notice", "resigned", "terminated"] as const).map((s) => (
          <button key={s} onClick={() => setStatusFilter(statusFilter === s ? "all" : s)}
            className={`bg-white rounded-xl border p-3 text-center transition-all ${statusFilter === s ? "border-green-400 shadow-sm" : "border-gray-200 hover:border-gray-300"}`}>
            <p className="text-2xl font-bold text-gray-900">{counts[s] ?? 0}</p>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium mt-1 inline-block ${STATUS_COLORS[s]}`}>{STATUS_LABELS[s]}</span>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, ID, department, designation..."
          className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
        />
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-16 text-center">
          <Users className="h-10 w-10 text-gray-300 mx-auto mb-3" />
          <p className="font-medium text-gray-500">{employees.length === 0 ? "No employees yet" : "No employees match your search"}</p>
          {employees.length === 0 && (
            <p className="text-sm text-gray-400 mt-1">Employees are created automatically when an onboarding is completed</p>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {["ID", "Name", "Department", "Designation", "Type", "Joining Date", "Status", ""].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((emp) => (
                <tr key={emp.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-gray-500 font-medium">{emp.employeeId}</td>
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-medium text-gray-900">{emp.name}</p>
                      <p className="text-xs text-gray-400">{emp.email}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-700">{emp.department}</td>
                  <td className="px-4 py-3 text-gray-700">{emp.designation}</td>
                  <td className="px-4 py-3">
                    <span className="text-xs text-gray-500">{TYPE_LABELS[emp.employmentType] ?? emp.employmentType}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {new Date(emp.joiningDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[emp.status]}`}>{STATUS_LABELS[emp.status]}</span>
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/dashboard/employees/${emp.id}`} className="text-gray-400 hover:text-green-600">
                      <ChevronRight className="h-4 w-4" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
