import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

type Ctx = {
  pending: number;
  begin: () => void;
  end: () => void;
  wrap<T>(p: Promise<T>): Promise<T>;
};

const LoadingCtx = createContext<Ctx | null>(null);

export function useGlobalLoading() {
  const ctx = useContext(LoadingCtx);
  if (!ctx) throw new Error("useGlobalLoading must be used inside <LoadingProvider>");
  return ctx;
}

function shouldTrack(url: any) {
  try {
    const u = typeof url === "string" ? url : String(url?.url ?? "");
    // ignore vite/dev pings & HMR, local assets
    return !(
      u.includes("__vite") ||
      u.includes("@react-refresh") ||
      u.includes("hot-update") ||
      u.startsWith("/@fs") ||
      u.startsWith("/@id") ||
      u.startsWith("/src/") ||
      u.startsWith("/node_modules/")
    );
  } catch {
    return true;
  }
}

export function LoadingProvider({ children }: { children: React.ReactNode }) {
  const [pending, setPending] = useState(0);
  const begin = useCallback(() => setPending((n) => n + 1), []);
  const end = useCallback(() => setPending((n) => Math.max(0, n - 1)), []);
  const wrap = useCallback(async <T,>(p: Promise<T>) => {
    begin();
    try { return await p; } finally { end(); }
  }, [begin, end]);

  // Patch window.fetch to auto-track network requests
  const patchedRef = useRef(false);
  useEffect(() => {
    if (patchedRef.current || typeof window === "undefined" || !window.fetch) return;
    patchedRef.current = true;
    const orig = window.fetch.bind(window);
    window.fetch = async (...args: Parameters<typeof fetch>) => {
      const track = shouldTrack(args[0]);
      if (track) begin();
      try {
        return await orig(...args);
      } finally {
        if (track) end();
      }
    };
  }, [begin, end]);

  return (
    <LoadingCtx.Provider value={{ pending, begin, end, wrap }}>
      {children}
      <GlobalLoadingBar visible={pending > 0} />
    </LoadingCtx.Provider>
  );
}

export function GlobalLoadingBar({ visible }: { visible: boolean }) {
  return (
    <div className={`fixed left-0 right-0 top-0 z-[80] h-1 ${visible ? "" : "opacity-0 pointer-events-none"} transition-opacity`}>
      {/* track */}
      <div className="relative h-full overflow-hidden bg-primary/10">
        {/* animated indicator */}
        <div className="absolute h-full w-1/2 bg-primary animate-[tw-indeterminate_1.2s_cubic-bezier(.4,0,.2,1)_infinite]" />
      </div>
    </div>
  );
}
