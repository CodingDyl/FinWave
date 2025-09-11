import axios from "axios";
import { getCorrelationId } from "./correlation";

// Default to Vite proxy for local/dev. Override with VITE_API_BASE if needed.
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE || "/api",
  withCredentials: true, // cookie session from backend
});

/** --- module augmentation: add a few convenience options --- */
declare module "axios" {
  // These are optional per-request flags you can pass to `api.get/post/...`
  export interface AxiosRequestConfig {
    /** If set, sends as 'Idempotency-Key' header (auto-generates if empty string) */
    idempotencyKey?: string | null;
    /** Simple in-memory GET cache TTL in ms (ex: 10000). */
    cacheTTL?: number;
  }
}

/** --- token helpers (works if your API returns a JWT; harmless if cookie-only) --- */
const TOKEN_KEY = "auth.token";
export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (t: string | null) => {
  if (t) localStorage.setItem(TOKEN_KEY, t);
  else localStorage.removeItem(TOKEN_KEY);
};

export const generateIdempotencyKey = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
};

/** --- tiny GET cache --- */
type CacheEntry = { exp: number; data: any };
const cache = new Map<string, CacheEntry>();
const cacheKey = (url: string, params?: any) =>
  `${url}?${params ? new URLSearchParams(params as any).toString() : ""}`;

/** --- 401 listeners so the app can redirect to /login globally --- */
const unauthorizedListeners = new Set<() => void>();
export function onUnauthorized(cb: () => void) {
  unauthorizedListeners.add(cb);
  return () => unauthorizedListeners.delete(cb);
}

/** --- request interceptor --- */
api.interceptors.request.use((config) => {
  // Correlation ID
  (config.headers as any).set?.("X-Correlation-ID", getCorrelationId()) ||
    ((config.headers as any)["X-Correlation-ID"] = getCorrelationId());

  // Authorization (unless explicitly disabled)
  const wantsAuth = !(config as any).skipAuth;
  const token = getToken();
  const hasAuth =
    (config.headers as any).has?.("Authorization") ||
    (config.headers as any)["Authorization"];

  if (wantsAuth && token && !hasAuth) {
    (config.headers as any).set?.("Authorization", `Bearer ${token}`) ||
      ((config.headers as any)["Authorization"] = `Bearer ${token}`);
  }

  // Idempotency-Key (opt-in). If you pass idempotencyKey: "", we auto-generate.
  const method = (config.method || "get").toLowerCase();
  if (["post", "put", "patch"].includes(method)) {
    const key =
      config.idempotencyKey === ""
        ? generateIdempotencyKey()
        : config.idempotencyKey ?? undefined;
    if (key) {
      (config.headers as any).set?.("Idempotency-Key", key) ||
        ((config.headers as any)["Idempotency-Key"] = key);
    }
  }

  // Simple GET cache
  if (method === "get" && config.cacheTTL && config.url) {
    const key = cacheKey(config.url, config.params);
    const hit = cache.get(key);
    if (hit && hit.exp > Date.now()) {
      // short-circuit via a special error we convert to a resolved response
      return Promise.reject({ __fromCache: true, config, data: hit.data });
    }
  }

  return config;
});

/** --- response interceptor --- */
api.interceptors.response.use(
  (res) => {
    const cfg: any = res.config;
    if (cfg?.method?.toLowerCase() === "get" && cfg.cacheTTL && cfg.url) {
      const key = cacheKey(cfg.url, cfg.params);
      cache.set(key, { exp: Date.now() + Number(cfg.cacheTTL), data: res.data });
    }
    return res;
  },
  (err) => {
    // serve cached result
    if (err && err.__fromCache) {
      return Promise.resolve({
        data: err.data,
        status: 200,
        statusText: "OK (cache)",
        headers: {},
        config: err.config,
      } as any);
    }

    const status = err?.response?.status;
    if (status === 401) unauthorizedListeners.forEach((fn) => fn());
    return Promise.reject(err);
  }
);

/** --- normalized error helper --- */
export function normalizeApiError(e: unknown): { status?: number; message: string; detail?: any } {
  const anyErr = e as any;
  const status = anyErr?.response?.status ?? anyErr?.status;
  
  // Enhanced error message extraction
  let detail = "Request failed";
  
  if (anyErr?.response?.data?.detail) {
    detail = anyErr.response.data.detail;
  } else if (anyErr?.response?.data?.message) {
    detail = anyErr.response.data.message;
  } else if (anyErr?.response?.data?.error) {
    detail = anyErr.response.data.error;
  } else if (anyErr?.message) {
    detail = anyErr.message;
  } else if (anyErr?.error) {
    detail = anyErr.error;
  }

  // Log the full error for debugging
  console.error("API Error:", {
    status,
    message: detail,
    originalError: anyErr,
    response: anyErr?.response?.data,
  });

  return { status, message: String(detail), detail: anyErr?.response?.data };
}

// API helpers for beneficiaries and destinations
export const listBeneficiaries = () => api.get("/api/v1/beneficiaries").then(r => r.data);
export const createBeneficiary = (payload: any) => api.post("/api/v1/beneficiaries", payload).then(r => r.data);
export const updateBeneficiary = (beneficiaryId: string, payload: any) => api.put(`/api/v1/beneficiaries/${beneficiaryId}`, payload).then(r => r.data);
export const deleteBeneficiary = (beneficiaryId: string) => api.delete(`/api/v1/beneficiaries/${beneficiaryId}`).then(r => r.data);
export const listDestinations = (beneficiaryId: string) => api.get(`/api/v1/beneficiaries/${beneficiaryId}/destinations`).then(r => r.data);
export const createBankDestination = (beneficiaryId: string, payload: any) => api.post(`/api/v1/beneficiaries/${beneficiaryId}/destinations`, payload).then(r => r.data);
export const updateDestination = (destinationId: string, payload: any) => api.put(`/api/v1/destinations/${destinationId}`, payload).then(r => r.data);
export const deleteDestination = (destinationId: string) => api.delete(`/api/v1/destinations/${destinationId}`).then(r => r.data);
export const createPayout = (payload: any) => api.post("/api/v1/payouts", payload, { idempotencyKey: "" }).then(r => r.data);
export const processPayout = (payoutId: string) => api.post(`/api/v1/payouts/${payoutId}/process`).then(r => r.data);
export const cancelPayout = (payoutId: string) => api.post(`/api/v1/payouts/${payoutId}/cancel`).then(r => r.data);
export const getPayoutStatus = (payoutId: string) => api.get(`/api/v1/payouts/${payoutId}/status`).then(r => r.data);

export default api;
