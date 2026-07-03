"use client";

import { useEffect, useState } from "react";
import { useAuthFetch } from "@/context/AuthContext";
import Link from "next/link";
import { Briefcase, Plus, Users, MapPin, Clock, ChevronRight } from "lucide-react";
import type { Job } from "@/lib/types";

const STATUS_COLORS: Record<string, string> = {
  open: "bg-green-100 text-green-700",
  closed: "bg-gray-100 text-gray-500",
  draft: "bg-yellow-100 text-yellow-700",
};

const TYPE_LABELS: Record<string, string> = {
  "full-time": "Full-time",
  "part-time": "Part-time",
  contract: "Contract",
  intern: "Intern",
};

export default function JobsPage() {
  const authFetch = useAuthFetch();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [candidateCounts, setCandidateCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "open" | "closed" | "draft">("all");

  useEffect(() => {
    authFetch("/api/jobs").then((data) => {
      if (data.success) {
        setJobs(data.data);
        // Fetch candidate counts in parallel
        Promise.all(
          data.data.map((j: Job) =>
            authFetch(`/api/jobs/${j.id}/candidates`).then((r) => ({
              jobId: j.id,
              count: r.success ? r.data.length : 0,
            }))
          )
        ).then((counts) => {
          const map: Record<string, number> = {};
          counts.forEach(({ jobId, count }) => { map[jobId] = count; });
          setCandidateCounts(map);
        });
      }
      setLoading(false);
    });
  }, [authFetch]);

  const filtered = filter === "all" ? jobs : jobs.filter((j) => j.status === filter);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-40">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Recruitment</h2>
          <p className="text-gray-500 mt-1">{jobs.length} job posting{jobs.length !== 1 ? "s" : ""}</p>
        </div>
        <Link
          href="/dashboard/jobs/new"
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700"
        >
          <Plus className="h-4 w-4" /> Post a Job
        </Link>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
        {(["all", "open", "draft", "closed"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium capitalize transition-colors ${
              filter === s ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {s === "all" ? `All (${jobs.length})` : `${s.charAt(0).toUpperCase() + s.slice(1)} (${jobs.filter((j) => j.status === s).length})`}
          </button>
        ))}
      </div>

      {/* Job cards */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-16 text-center">
          <Briefcase className="h-10 w-10 text-gray-300 mx-auto mb-3" />
          <p className="font-medium text-gray-500">No job postings yet</p>
          <p className="text-sm text-gray-400 mt-1">Click "Post a Job" to create your first opening</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((job) => (
            <Link
              key={job.id}
              href={`/dashboard/jobs/${job.id}`}
              className="block bg-white rounded-xl border border-gray-200 p-5 hover:border-green-400 hover:shadow-sm transition-all group"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-gray-900 group-hover:text-green-700 text-lg">
                      {job.title}
                    </h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[job.status]}`}>
                      {job.status}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">{job.department}</p>
                  <div className="flex items-center gap-4 mt-3 text-sm text-gray-400 flex-wrap">
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" /> {job.location}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" /> {TYPE_LABELS[job.employmentType] ?? job.employmentType}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="h-3.5 w-3.5" />
                      {candidateCounts[job.id] ?? 0} candidate{candidateCounts[job.id] !== 1 ? "s" : ""}
                    </span>
                  </div>
                  {(job.requiredSkills?.length ?? 0) > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {(job.requiredSkills ?? []).slice(0, 5).map((skill) => (
                        <span key={skill} className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-md">
                          {skill}
                        </span>
                      ))}
                      {(job.requiredSkills?.length ?? 0) > 5 && (
                        <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-400 rounded-md">
                          +{(job.requiredSkills?.length ?? 0) - 5} more
                        </span>
                      )}
                    </div>
                  )}
                </div>
                <ChevronRight className="h-5 w-5 text-gray-300 group-hover:text-green-500 flex-shrink-0 mt-1" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
