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
    { label: "Total Onboardings", value: stats.total, icon: Users, iconColor: "text-emerald-700 bg-emerald-50", accent: "bg-emerald-500" },
    { label: "In Progress", value: stats.inProgress, icon: Clock, iconColor: "text-amber-600 bg-amber-50", accent: "bg-amber-400" },
    { label: "Awaiting Review", value: stats.submitted, icon: AlertCircle, iconColor: "text-violet-600 bg-violet-50", accent: "bg-violet-500" },
    { label: "Completed", value: stats.completed, icon: CheckCircle, iconColor: "text-green-700 bg-green-50", accent: "bg-green-500" },
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
        <div>
          <h2 className="text-xl font-bold text-gray-900">Dashboard</h2>
          <p className="text-sm text-gray-500 mt-0.5">Welcome back — here's what's happening</p>
        </div>
        <Link
          href="/dashboard/onboarding/new"
          className="bg-[#0e382b] text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-[#18471c] transition-colors flex items-center gap-2 shadow-sm"
        >
          <span className="text-base leading-none">+</span> New Onboarding
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="bg-white rounded-xl border border-gray-100 p-5 relative overflow-hidden shadow-[0_1px_4px_rgba(0,0,0,0.04)]">
              <div className={`absolute inset-x-0 top-0 h-[3px] ${card.accent}`} />
              <div className="flex items-start justify-between gap-3 pt-1">
                <div>
                  <p className="text-[28px] font-bold text-gray-900 leading-none tracking-tight">{card.value}</p>
                  <p className="text-[13px] text-gray-500 mt-2 leading-snug">{card.label}</p>
                </div>
                <div className={`p-2.5 rounded-xl flex-shrink-0 ${card.iconColor}`}>
                  <Icon className="h-4.5 w-4.5" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Recent onboardings */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-[0_1px_4px_rgba(0,0,0,0.04)]">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">Recent Onboardings</h3>
          <Link href="/dashboard/onboarding" className="text-[13px] text-emerald-700 font-medium hover:text-emerald-900">View all →</Link>
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
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-6 py-3 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-widest">Candidate</th>
                  <th className="px-6 py-3 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-widest">Department</th>
                  <th className="px-6 py-3 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-widest">Designation</th>
                  <th className="px-6 py-3 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-widest">Joining Date</th>
                  <th className="px-6 py-3 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-widest">Status</th>
                  <th className="px-6 py-3 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-widest">Docs</th>
                  <th className="px-6 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {onboardings.slice(0, 10).map((onboarding) => {
                  const status = statusConfig[onboarding.status] || statusConfig.initiated;
                  const completedDocs = onboarding.documents.filter(
                    (d) => ["signed", "uploaded", "verified", "filled"].includes(d.status)
                  ).length;
                  return (
                    <tr key={onboarding.id} className="hover:bg-gray-50/70 transition-colors">
                      <td className="px-6 py-3.5">
                        <div>
                          <p className="text-[13.5px] font-semibold text-gray-900 leading-snug">{onboarding.candidate.name}</p>
                          <p className="text-[12px] text-gray-400 mt-0.5">{onboarding.candidate.email}</p>
                        </div>
                      </td>
                      <td className="px-6 py-3.5 text-[13px] text-gray-600">{onboarding.department}</td>
                      <td className="px-6 py-3.5 text-[13px] text-gray-600">{onboarding.designation}</td>
                      <td className="px-6 py-3.5 text-[13px] text-gray-600">
                        {new Date(onboarding.joiningDate).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-3.5">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11.5px] font-semibold ${status.color}`}>
                          {status.label}
                        </span>
                      </td>
                      <td className="px-6 py-3.5">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden w-12">
                            <div
                              className="h-full bg-emerald-500 rounded-full"
                              style={{ width: onboarding.documents.length ? `${(completedDocs / onboarding.documents.length) * 100}%` : "0%" }}
                            />
                          </div>
                          <span className="text-[12px] text-gray-500 whitespace-nowrap">{completedDocs}/{onboarding.documents.length}</span>
                        </div>
                      </td>
                      <td className="px-6 py-3.5 text-right">
                        <Link
                          href={`/dashboard/onboarding/${onboarding.id}`}
                          className="text-[13px] font-semibold text-emerald-700 hover:text-emerald-900"
                        >
                          View →
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
