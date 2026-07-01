"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const { login } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      router.push("/dashboard");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleSeed = async () => {
    setSeeding(true);
    try {
      const res = await fetch("/api/seed", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setEmail("admin@mlx.com");
        setPassword("password123");
      } else {
        setError(data.error || "Seed failed");
      }
    } catch {
      setError("Failed to seed data");
    } finally {
      setSeeding(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-white">
      {/* Left brand panel */}
      <div className="hidden lg:flex w-[42%] bg-[#0a2d22] flex-col items-center justify-center p-14 relative overflow-hidden">
        {/* Subtle background circles */}
        <div className="absolute -top-24 -left-24 w-80 h-80 rounded-full bg-white/[0.03]" />
        <div className="absolute -bottom-20 -right-20 w-72 h-72 rounded-full bg-white/[0.03]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[420px] h-[420px] rounded-full bg-emerald-500/[0.04]" />

        <div className="relative text-center z-10">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-white/10 mb-8 shadow-lg">
            <span className="text-4xl">📋</span>
          </div>
          <h1 className="text-[32px] font-bold text-white tracking-tight mb-2">HRMS</h1>
          <p className="text-emerald-300 text-lg font-semibold mb-4">E-Onboarding Platform</p>
          <p className="text-white/40 text-[14px] leading-relaxed max-w-[280px] mx-auto">
            Streamline employee onboarding with digital documents, e-signatures, and real-time tracking.
          </p>

          <div className="mt-10 grid grid-cols-3 gap-5 text-center">
            {[
              { value: "100%", label: "Paperless" },
              { value: "e-Sign", label: "Documents" },
              { value: "Live", label: "Tracking" },
            ].map((f) => (
              <div key={f.label} className="px-3 py-3 rounded-xl bg-white/[0.06]">
                <p className="text-white font-bold text-[15px]">{f.value}</p>
                <p className="text-white/40 text-[11px] mt-0.5">{f.label}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="absolute bottom-6 text-white/20 text-xs">© 2026 HRMS · All rights reserved</p>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center bg-[#f6f8fa] px-6 py-12">
        <div className="w-full max-w-[400px]">
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#0a2d22] mb-3">
              <span className="text-2xl">📋</span>
            </div>
            <h1 className="text-xl font-bold text-gray-900">HRMS</h1>
          </div>

          <div className="bg-white rounded-2xl shadow-[0_4px_24px_rgba(0,0,0,0.07)] border border-gray-100 px-8 py-9">
            <h2 className="text-[22px] font-bold text-gray-900 mb-1">Welcome back</h2>
            <p className="text-[14px] text-gray-500 mb-7">Sign in to your account to continue</p>

            {error && (
              <div className="bg-red-50 border border-red-100 text-red-600 text-[13px] px-4 py-3 rounded-xl mb-5 flex items-center gap-2">
                <span className="text-red-400">⚠</span> {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-[13px] font-semibold text-gray-700 mb-1.5">
                  Email address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-[14px] text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 outline-none bg-gray-50/50"
                  placeholder="you@company.com"
                  required
                />
              </div>
              <div>
                <label className="block text-[13px] font-semibold text-gray-700 mb-1.5">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-[14px] text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 outline-none bg-gray-50/50"
                  placeholder="••••••••"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#0e382b] text-white py-2.5 rounded-xl text-[14px] font-semibold hover:bg-[#18471c] disabled:opacity-50 transition-colors shadow-sm mt-1"
              >
                {loading ? "Signing in…" : "Sign In"}
              </button>
            </form>
          </div>

          <div className="mt-5 text-center">
            <button
              onClick={handleSeed}
              disabled={seeding}
              className="text-[13px] text-gray-400 hover:text-emerald-700 transition-colors"
            >
              {seeding ? "Seeding…" : "↺ Initialize demo data"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
