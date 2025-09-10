import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import api from "../../lib/api";
import { useToast } from "../../components/toast/ToastProvider";
import { useGlobalLoading } from "../../components/loading/GlobalLoading";

// Backend returns user_id and email_hash from /me endpoint
export type User = { 
  user_id: number; 
  email_hash: string; 
  email?: string; // Optional, might be available from OAuth
};

type AuthCtx = {
  user: User | null;
  loading: boolean;
  loginWithGoogle: () => void;
  logout: () => Promise<void>;
  refreshMe: () => Promise<void>;
};

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [booted, setBooted] = useState(false);
  const { wrap } = useGlobalLoading();
  const toast = useToast();

  const refreshMe = useCallback(async () => {
    try {
      const { data: me } = await api.get<{ user_id: number; email_hash: string }>("/api/v1/auth/me");
      // Only set user if we have a valid user_id (not 0)
      if (me && me.user_id > 0) {
        setUser(me);
      } else {
        setUser(null);
      }
    } catch (e: any) {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    (async () => {
      await refreshMe();
      setBooted(true);
    })();
  }, [refreshMe]);

  const loginWithGoogle = useCallback(() => {
    // Redirect to backend OAuth endpoint
    window.location.href = "/api/v1/auth/login";
  }, []);

  const logout = useCallback(async () => {
    try { 
      await wrap(api.post("/api/v1/auth/logout"));
    } catch (e) {
      // Ignore errors, still clear local state
    }
    setUser(null);
    toast.success({ title: "Signed out" });
  }, [toast, wrap]);

  const value = useMemo<AuthCtx>(() => ({
    user, 
    loading: !booted, 
    loginWithGoogle, 
    logout, 
    refreshMe
  }), [user, booted, loginWithGoogle, logout, refreshMe]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
