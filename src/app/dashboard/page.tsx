"use client";

import { useEffect, useState } from "react";
import { useAuthFetch } from "@/context/AuthContext";
import { Users, Clock, CheckCircle, AlertCircle, Send, FileCheck } from "lucide-react";
import Link from "next/link";
import type { Onboarding } from "@/lib/types";

const statusConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  initiated: { label: "Initiated", color: "bg-gray-100 text-gray-700", icon: Clock },
  sent: { label: "Sent", color: "bg-blue-100 text-blue-700", icon: Send },
  in_progress: { label: "In Progress", color: "bg-yellow-100 text-yellow-700", icon: Clock },
  submitted: { label: "Submitted", color: "bg-purple-100 text-purple-700", icon: FileCheck },
  verified: { label: "Verified", color: "bg-green-100 text-green-700", icon: CheckCircle },
  completed: { label: "Completed", color: "bg-emerald-100 text-emerald-700", icon: CheckCircle },
};

export default function DashboardPage() {
  const authFetch = useAuthFetch();
  const [onboardings, setOnboardings] = useState<Onboarding[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    authFetch("/api/onboarding").then((data) => {
      if (data.success) setOnboardings(data.data);
      setLoading(false);
    });
  }, [authFetch]);

  const stats = {
    total: onboardings.length,
    inProgress: onboardings.filter((o) => ["sent", "in_progress"].includes(o.status)).length,
    submitted: onboardings.filter((o) => o.status === "submitted").length,
    completed: onboardings.filter((o) => ["verified", "completed"].includes(o.status)).length,
  };

  const statCards = [
    { label: "Total Onboardings", value: stats.total, icon: Users, color: "text-[#0e382b] bg-emerald-50" },
    { label: "In Progress", value: stats.inProgress, icon: Clock, color: "text-yellow-600 bg-yellow-50" },
    { label: "Awaiting Review", value: stats.submitted, icon: AlertCircle, color: "text-purple-600 bg-purple-50" },
    { label: "Completed", value: stats.completed, icon: CheckCircle, color: "text-green-600 bg-green-50" },
  ];

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
        <h2 className="text-xl font-bold text-gray-900">Dashboard</h2>
        <Link
          href="/dashboard/onboarding/new"
          className="bg-[#0e382b] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#18471c] transition-colors"
        >
          + New Onboarding
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${card.color}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{card.value}</p>
                  <p className="text-sm text-gray-500">{card.label}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Recent onboardings */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">Recent Onboardings</h3>
        </div>
        {onboardings.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <Users className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p className="font-medium">No onboardings yet</p>
            <p className="text-sm mt-1">Create your first onboarding to get started.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <th className="px-5 py-3">Candidate</th>
                  <th className="px-5 py-3">Department</th>
                  <th className="px-5 py-3">Designation</th>
                  <th className="px-5 py-3">Joining Date</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Documents</th>
                  <th className="px-5 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {onboardings.slice(0, 10).map((onboarding) => {
                  const status = statusConfig[onboarding.status] || statusConfig.initiated;
                  const completedDocs = onboarding.documents.filter(
                    (d) => ["signed", "uploaded", "verified", "filled"].includes(d.status)
                  ).length;
                  return (
                    <tr key={onboarding.id} className="hover:bg-gray-50">
                      <td className="px-5 py-3">
                        <div>
                          <p className="font-medium text-gray-900">{onboarding.candidate.name}</p>
                          <p className="text-xs text-gray-500">{onboarding.candidate.email}</p>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-sm text-gray-600">{onboarding.department}</td>
                      <td className="px-5 py-3 text-sm text-gray-600">{onboarding.designation}</td>
                      <td className="px-5 py-3 text-sm text-gray-600">
                        {new Date(onboarding.joiningDate).toLocaleDateString()}
                      </td>
                      <td className="px-5 py-3">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${status.color}`}>
                          {status.label}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-sm text-gray-600">
                        {completedDocs}/{onboarding.documents.length}
                      </td>
                      <td className="px-5 py-3">
                        <Link
                          href={`/dashboard/onboarding/${onboarding.id}`}
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
