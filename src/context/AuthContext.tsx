"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  companyIds: string[];
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  activeCompanyId: string | null;
  activeCompanyName: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  switchCompany: (companyId: string, companyName: string) => Promise<void>;
  isLoading: boolean;
  isSuperAdmin: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  activeCompanyId: null,
  activeCompanyName: null,
  login: async () => {},
  logout: () => {},
  switchCompany: async () => {},
  isLoading: true,
  isSuperAdmin: false,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [activeCompanyId, setActiveCompanyId] = useState<string | null>(null);
  const [activeCompanyName, setActiveCompanyName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem("auth");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setUser(parsed.user);
        setToken(parsed.token);
        setActiveCompanyId(parsed.activeCompanyId ?? null);
        setActiveCompanyName(parsed.activeCompanyName ?? null);
      } catch {
        localStorage.removeItem("auth");
      }
    }
    setIsLoading(false);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error);

    const { user: u, token: t, activeCompanyId: cid, activeCompanyName: cname } = data.data;
    setUser(u);
    setToken(t);
    setActiveCompanyId(cid ?? null);
    setActiveCompanyName(cname ?? null);
    localStorage.setItem("auth", JSON.stringify(data.data));
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
    setActiveCompanyId(null);
    setActiveCompanyName(null);
    localStorage.removeItem("auth");
  }, []);

  const switchCompany = useCallback(async (companyId: string, companyName: string) => {
    const res = await fetch("/api/auth/switch-company", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ companyId }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error);

    const newToken = data.data.token;
    setToken(newToken);
    setActiveCompanyId(companyId);
    setActiveCompanyName(companyName);
    const stored = localStorage.getItem("auth");
    if (stored) {
      const parsed = JSON.parse(stored);
      localStorage.setItem("auth", JSON.stringify({
        ...parsed,
        token: newToken,
        activeCompanyId: companyId,
        activeCompanyName: companyName,
      }));
    }
  }, [token]);

  const isSuperAdmin = user?.role === "super_admin";

  return (
    <AuthContext.Provider value={{
      user,
      token,
      activeCompanyId,
      activeCompanyName,
      login,
      logout,
      switchCompany,
      isLoading,
      isSuperAdmin,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

export function useAuthFetch() {
  const { token } = useAuth();

  return useCallback(
    async (url: string, options: RequestInit = {}) => {
      const headers = new Headers(options.headers);
      if (token) {
        headers.set("Authorization", `Bearer ${token}`);
      }
      if (!headers.has("Content-Type") && !(options.body instanceof FormData)) {
        headers.set("Content-Type", "application/json");
      }
      const res = await fetch(url, { ...options, headers });
      try {
        return await res.json();
      } catch {
        return { success: false, error: `Request failed with status ${res.status}` };
      }
    },
    [token]
  );
}
