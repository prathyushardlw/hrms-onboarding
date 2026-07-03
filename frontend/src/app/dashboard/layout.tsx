"use client";

import { useAuth } from "@/context/AuthContext";
import { apiUrl } from "@/lib/api";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useEffect, useState, useCallback } from "react";
import {
  LayoutDashboard,
  UserPlus,
  FileText,
  Settings,
  LogOut,
  Building2,
  ChevronDown,
  Shield,
  Menu,
  Briefcase,
  Users,
} from "lucide-react";

const hrNavItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/jobs", label: "Recruitment", icon: Briefcase },
  { href: "/dashboard/onboarding", label: "Onboarding", icon: UserPlus },
  { href: "/dashboard/employees", label: "Employees", icon: Users },
  { href: "/dashboard/templates", label: "Templates", icon: FileText },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

const adminNavItems = [
  { href: "/dashboard/admin", label: "Overview", icon: Shield },
  { href: "/dashboard/admin/companies", label: "Companies", icon: Building2 },
  { href: "/dashboard/admin/users", label: "Users", icon: UserPlus },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, logout, isLoading, isSuperAdmin, activeCompanyId, activeCompanyName, switchCompany } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [companies, setCompanies] = useState<{ id: string; name: string }[]>([]);
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [switching, setSwitching] = useState(false);

  const navItems = isSuperAdmin ? adminNavItems : hrNavItems;

  const fetchCompanies = useCallback(async () => {
    if (!user) return;
    try {
      const stored = localStorage.getItem("auth");
      const token = stored ? JSON.parse(stored).token : null;
      const res = await fetch(apiUrl("/api/companies"), {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) setCompanies(data.data);
    } catch (_) { /* ignore */ }
  }, [user]);

  useEffect(() => { fetchCompanies(); }, [fetchCompanies]);

  const handleSwitch = async (companyId: string, companyName: string) => {
    setSwitching(true);
    try {
      await switchCompany(companyId, companyName);
      setSwitcherOpen(false);
      router.push("/dashboard");
    } catch (_) { /* ignore */ } finally {
      setSwitching(false);
    }
  };

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login");
    }
  }, [user, isLoading, router]);

  // Map pathname to a human-readable page title for the mobile header
  const pageTitle = (() => {
    if (pathname === "/dashboard") return "Dashboard";
    if (pathname.startsWith("/dashboard/onboarding")) return "Onboarding";
    if (pathname.startsWith("/dashboard/jobs")) return "Recruitment";
    if (pathname.startsWith("/dashboard/employees")) return "Employees";
    if (pathname.startsWith("/dashboard/templates")) return "Templates";
    if (pathname.startsWith("/dashboard/settings")) return "Settings";
    if (pathname.startsWith("/dashboard/admin/users")) return "Users";
    if (pathname.startsWith("/dashboard/admin/companies")) return "Companies";
    if (pathname.startsWith("/dashboard/admin")) return "Admin";
    return isSuperAdmin ? "Super Admin" : "HRMS";
  })();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f6f8fa]">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-emerald-600 border-t-transparent" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-[#f6f8fa] flex">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-60 bg-[#0a2d22] flex flex-col transform transition-transform duration-200 lg:translate-x-0 lg:static lg:inset-auto ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 py-5 border-b border-white/[0.07]">
          <div className="w-9 h-9 rounded-xl bg-emerald-400/20 flex items-center justify-center text-xl flex-shrink-0">
            📋
          </div>
          <div className="min-w-0">
            <span className="font-bold text-[15px] text-white tracking-tight block">HRMS</span>
            {isSuperAdmin ? (
              <span className="text-[11px] font-medium text-emerald-400">Super Admin</span>
            ) : (
              <span className="text-[11px] text-white/40 truncate block">{activeCompanyName ?? "—"}</span>
            )}
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13.5px] font-medium transition-all ${
                  isActive
                    ? "bg-white text-[#0e382b] shadow-sm"
                    : "text-white/60 hover:bg-white/[0.07] hover:text-white"
                }`}
              >
                <Icon className="h-[17px] w-[17px] flex-shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* User profile */}
        <div className="px-3 pb-4 pt-2 border-t border-white/[0.07]">
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-white/[0.05]">
            <div className="h-8 w-8 rounded-full bg-emerald-400/20 flex items-center justify-center text-emerald-400 font-semibold text-sm flex-shrink-0">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold text-white truncate leading-tight">{user.name}</p>
              <p className="text-[11px] text-white/40 capitalize">{user.role.replace("_", " ")}</p>
            </div>
            <button
              onClick={() => { logout(); router.push("/login"); }}
              className="text-white/25 hover:text-red-400"
              title="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3 lg:px-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden text-gray-500 hover:text-gray-800"
          >
            <Menu className="h-5 w-5" />
          </button>
          <h1 className="text-[15px] font-semibold text-gray-800 flex-1 lg:hidden">
            {pageTitle}
          </h1>

          {/* Company Switcher — only for non-super-admin with multiple companies */}
          {!isSuperAdmin && companies.length > 1 && (
            <div className="relative ml-auto">
              <button
                onClick={() => setSwitcherOpen((o) => !o)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 hover:border-gray-300"
              >
                <Building2 className="h-3.5 w-3.5 text-gray-400" />
                <span className="max-w-[140px] truncate font-medium">{activeCompanyName ?? "Select company"}</span>
                <ChevronDown className="h-3.5 w-3.5 text-gray-400" />
              </button>
              {switcherOpen && (
                <div className="absolute right-0 top-full mt-1.5 w-56 bg-white border border-gray-200 rounded-xl shadow-xl z-50 overflow-hidden">
                  <div className="px-3 py-2 border-b border-gray-100">
                    <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Switch company</p>
                  </div>
                  {companies.map((c) => (
                    <button
                      key={c.id}
                      disabled={switching || c.id === activeCompanyId}
                      onClick={() => handleSwitch(c.id, c.name)}
                      className={`w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 ${
                        c.id === activeCompanyId ? "font-semibold text-emerald-700 bg-emerald-50/60" : "text-gray-700"
                      }`}
                    >
                      {c.name}
                      {c.id === activeCompanyId && <span className="ml-2 text-xs text-emerald-500">● Active</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </header>

        <main className="flex-1 p-5 lg:p-7 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
