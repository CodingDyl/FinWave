import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

export type ToastVariant = "default" | "success" | "error" | "warning" | "info";
export type Toast = {
  id: string;
  title?: string;
  description?: string;
  variant?: ToastVariant;
  duration?: number; // ms
};

type ToastAPI = {
  push: (t: Omit<Toast, "id">) => string;
  dismiss: (id: string) => void;
  success: (t: Omit<Toast, "id" | "variant">) => string;
  error: (t: Omit<Toast, "id" | "variant">) => string;
  info: (t: Omit<Toast, "id" | "variant">) => string;
  warning: (t: Omit<Toast, "id" | "variant">) => string;
};

const ToastContext = createContext<ToastAPI | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timers = useRef<Record<string, number>>({});

  const dismiss = useCallback((id: string) => {
    setToasts((t) => t.filter((x) => x.id !== id));
    if (timers.current[id]) {
      window.clearTimeout(timers.current[id]);
      delete timers.current[id];
    }
  }, []);

  const push = useCallback(
    (t: Omit<Toast, "id">) => {
      const id = crypto.randomUUID?.() ?? Math.random().toString(36).slice(2);
      const toast: Toast = {
        id,
        variant: "default",
        duration: 4200,
        ...t,
      };
      setToasts((prev) => [...prev, toast]);
      if (toast.duration !== Infinity && toast.duration! > 0) {
        timers.current[id] = window.setTimeout(() => dismiss(id), toast.duration);
      }
      return id;
    },
    [dismiss]
  );

  const api: ToastAPI = useMemo(
    () => ({
      push,
      dismiss,
      success: (t) => push({ ...t, variant: "success" }),
      error: (t) => push({ ...t, variant: "error" }),
      info: (t) => push({ ...t, variant: "info" }),
      warning: (t) => push({ ...t, variant: "warning" }),
    }),
    [push, dismiss]
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      {createPortal(
        <ToastViewport toasts={toasts} onDismiss={dismiss} />,
        document.body
      )}
    </ToastContext.Provider>
  );
}

function ToastViewport({
  toasts,
  onDismiss,
}: {
  toasts: Toast[];
  onDismiss: (id: string) => void;
}) {
  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-full max-w-sm flex-col gap-2">
      {toasts.map((t) => (
        <ToastCard key={t.id} toast={t} onDismiss={() => onDismiss(t.id)} />
      ))}
    </div>
  );
}

function ToastCard({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  const { title, description, variant = "default" } = toast;
  const icon = {
    default: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
        <path fill="currentColor" d="M12 2a10 10 0 1 0 .001 20.001A10 10 0 0 0 12 2Zm1 15h-2v-6h2v6Zm0-8h-2V7h2v2Z"/>
      </svg>
    ),
    success: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
        <path fill="currentColor" d="M12 2a10 10 0 1 0 .001 20.001A10 10 0 0 0 12 2Zm-1 14-4-4 1.4-1.4L11 12.2l4.6-4.6L17 9l-6 7Z"/>
      </svg>
    ),
    error: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
        <path fill="currentColor" d="M11 7h2v6h-2V7Zm0 8h2v2h-2v-2Zm1-13a10 10 0 1 0 .001 20.001A10 10 0 0 0 12 2Z"/>
      </svg>
    ),
    warning: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
        <path fill="currentColor" d="M1 21h22L12 2 1 21Zm12-3h-2v-2h2v2Zm0-4h-2v-4h2v4Z"/>
      </svg>
    ),
    info: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
        <path fill="currentColor" d="M12 2a10 10 0 1 0 .001 20.001A10 10 0 0 0 12 2Zm1 15h-2v-6h2v6Zm0-8h-2V7h2v2Z"/>
      </svg>
    ),
  }[variant];

  const tone = {
    default: "border-border bg-popover text-popover-foreground",
    success: "border-green-500/30 bg-green-500/10 text-green-700 dark:text-green-300",
    error: "border-destructive/30 bg-destructive/10 text-destructive",
    warning: "border-yellow-500/30 bg-yellow-500/10 text-yellow-700 dark:text-yellow-300",
    info: "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300",
  }[variant];

  return (
    <div
      role="status"
      className={[
        "pointer-events-auto rounded-[var(--radius)] border shadow-lg backdrop-blur-sm",
        "p-3 flex gap-3 items-start",
        "transition-all data-[state=open]:animate-in data-[state=open]:fade-in data-[state=open]:slide-in-from-bottom-2",
        tone,
      ].join(" ")}
      data-state="open"
    >
      <div className="mt-0.5">{icon}</div>
      <div className="min-w-0 flex-1">
        {title && <div className="font-medium leading-tight">{title}</div>}
        {description && (
          <div className="text-sm text-muted-foreground leading-snug">{description}</div>
        )}
      </div>
      <button
        aria-label="Close"
        className="btn btn-ghost h-7 px-2"
        onClick={onDismiss}
      >
        ×
      </button>
    </div>
  );
}
