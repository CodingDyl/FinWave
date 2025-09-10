// src/components/auth/AuthProvider.tsx
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import api, { onUnauthorized, setToken } from "../../lib/api";
import { useToast } from "../toast/ToastProvider";

type User = {
  id: string;
  email?: string;
  name?: string;
};

type AuthState = "loading" | "authenticated" | "unauthenticated";

type AuthContextValue = {
  user: User | null;
  status: AuthState;
  refresh: () => Promise<void>;
  login: (payload: { email: string; password: string }) => Promise<void>;
  register: (payload: { email: string; password: string; name?: string }) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<AuthState>("loading");
  const toast = useToast();

  async function refresh() {
    try {
      const { data } = await api.get("/v1/auth/me", { cacheTTL: 0 });
      setUser(data);
      setStatus("authenticated");
    } catch {
      setUser(null);
      setStatus("unauthenticated");
    }
  }

  async function login(payload: { email: string; password: string }) {
    // Most backends set a cookie here; some also return a JWT
    const { data } = await api.post("/v1/auth/login", payload);
    if (data?.access_token) setToken(data.access_token); // optional JWT path
    await refresh();
    toast.success({ title: "Welcome back" });
  }

  async function register(payload: { email: string; password: string; name?: string }) {
    const { data } = await api.post("/v1/auth/register", payload);
    if (data?.access_token) setToken(data.access_token); // optional JWT path
    await refresh();
    toast.success({ title: "Account created" });
  }

  async function logout() {
    try {
      await api.post("/v1/auth/logout");
    } catch {
      // ignore
    }
    setToken(null);
    setUser(null);
    setStatus("unauthenticated");
    toast.success({ title: "Signed out" });
  }

  // Initial session check
  useEffect(() => {
    refresh();
  }, []);

  // Global 401 -> drop session + hard redirect to /login (Provider sits outside Router)
  useEffect(() => {
    const unsub = onUnauthorized(() => {
      setUser(null);
      setStatus("unauthenticated");
      // avoid useNavigate here, provider is above RouterProvider
      if (!window.location.pathname.startsWith("/login")) {
        const next = encodeURIComponent(window.location.pathname + window.location.search);
        window.location.replace(`/login?next=${next}`);
      }
    });
    return () => {
      unsub();
    };
  }, []);

  const value = useMemo(
    () => ({ user, status, refresh, login, register, logout }),
    [user, status]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}
