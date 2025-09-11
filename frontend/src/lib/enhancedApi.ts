/**
 * Enhanced API client with comprehensive error handling, logging, and idempotency.
 * Extends the base API client with structured error handling and retry logic.
 */

import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { getCorrelationId } from './correlation';
import { 
  FinwaveError, 
  handleApiError, 
  isRetryableError, 
  getRetryDelay,
  logError
} from './errorHandler';

// Default to Vite proxy for local/dev. Override with VITE_API_BASE if needed.
const api: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE || "/api",
  withCredentials: true, // cookie session from backend
  timeout: 30000, // 30 second timeout
});

/** --- module augmentation: add convenience options --- */
declare module "axios" {
  export interface AxiosRequestConfig {
    /** If set, sends as 'Idempotency-Key' header (auto-generates if empty string) */
    idempotencyKey?: string | null;
    /** Simple in-memory GET cache TTL in ms (ex: 10000). */
    cacheTTL?: number;
    /** Retry configuration for failed requests */
    retryConfig?: {
      maxRetries?: number;
      retryDelay?: number;
      retryCondition?: (error: any) => boolean;
    };
    /** Skip error handling for this request */
    skipErrorHandling?: boolean;
  }
}

/** --- token helpers --- */
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

/** --- 401 listeners --- */
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

  // Request ID for tracking
  const requestId = `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  (config.headers as any).set?.("X-Request-ID", requestId) ||
    ((config.headers as any)["X-Request-ID"] = requestId);

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

  // Log request
  console.debug('API Request:', {
    method: config.method?.toUpperCase(),
    url: config.url,
    requestId,
    idempotencyKey: config.idempotencyKey
  });

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

    // Log successful response
    console.debug('API Response:', {
      method: cfg?.method?.toUpperCase(),
      url: cfg?.url,
      status: res.status,
      requestId: res.headers['x-request-id']
    });

    return res;
  },
  async (err) => {
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
    const config = err?.config;
    const requestId = err?.response?.headers?.['x-request-id'] || config?.headers?.['X-Request-ID'];

    // Log error
    console.error('API Error:', {
      method: config?.method?.toUpperCase(),
      url: config?.url,
      status,
      requestId,
      error: err.message
    });

    // Handle 401 unauthorized
    if (status === 401) {
      unauthorizedListeners.forEach((fn) => fn());
    }

    // Skip error handling if requested
    if (config?.skipErrorHandling) {
      return Promise.reject(err);
    }

    // Handle retry logic
    const retryConfig = config?.retryConfig || { maxRetries: 0 };
    const maxRetries = retryConfig.maxRetries || 0;
    const retryCount = config._retryCount || 0;

    if (retryCount < maxRetries) {
      const shouldRetry = retryConfig.retryCondition 
        ? retryConfig.retryCondition(err)
        : isRetryableError(handleApiError(err));

      if (shouldRetry) {
        const delay = retryConfig.retryDelay || getRetryDelay(retryCount + 1);
        
        console.log(`Retrying request in ${delay}ms (attempt ${retryCount + 1}/${maxRetries})`);
        
        await new Promise(resolve => setTimeout(resolve, delay));
        
        // Update retry count
        config._retryCount = retryCount + 1;
        
        // Retry the request
        return api(config);
      }
    }

    // Convert to structured error
    const structuredError = handleApiError(err, {
      method: config?.method?.toUpperCase(),
      url: config?.url,
      requestId
    });

    return Promise.reject(structuredError);
  }
);

/** --- enhanced error helper --- */
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

  return { status, message: String(detail), detail: anyErr?.response?.data };
}

/** --- enhanced API helpers with error handling --- */

// Generic API call wrapper with error handling
async function apiCall<T>(
  apiCall: () => Promise<AxiosResponse<T>>,
  context?: Record<string, any>
): Promise<T> {
  try {
    const response = await apiCall();
    return response.data;
  } catch (error) {
    const structuredError = handleApiError(error, context);
    throw structuredError;
  }
}

// Beneficiaries API
export const listBeneficiaries = (context?: Record<string, any>) => 
  apiCall(() => api.get("/api/v1/beneficiaries"), context);

export const createBeneficiary = (payload: any, context?: Record<string, any>) => 
  apiCall(() => api.post("/api/v1/beneficiaries", payload), context);

export const updateBeneficiary = (beneficiaryId: string, payload: any, context?: Record<string, any>) => 
  apiCall(() => api.put(`/api/v1/beneficiaries/${beneficiaryId}`, payload), context);

export const deleteBeneficiary = (beneficiaryId: string, context?: Record<string, any>) => 
  apiCall(() => api.delete(`/api/v1/beneficiaries/${beneficiaryId}`), context);

// Destinations API
export const listDestinations = (beneficiaryId: string, context?: Record<string, any>) => 
  apiCall(() => api.get(`/api/v1/beneficiaries/${beneficiaryId}/destinations`), context);

export const createBankDestination = (beneficiaryId: string, payload: any, context?: Record<string, any>) => 
  apiCall(() => api.post(`/api/v1/beneficiaries/${beneficiaryId}/destinations`, payload), context);

export const updateDestination = (destinationId: string, payload: any, context?: Record<string, any>) => 
  apiCall(() => api.put(`/api/v1/destinations/${destinationId}`, payload), context);

export const deleteDestination = (destinationId: string, context?: Record<string, any>) => 
  apiCall(() => api.delete(`/api/v1/destinations/${destinationId}`), context);

// Payouts API with idempotency
export const listPayouts = (context?: Record<string, any>) => 
  apiCall(() => api.get("/api/v1/payouts"), context);

export const createPayout = (payload: any, idempotencyKey?: string, context?: Record<string, any>) => 
  apiCall(() => api.post("/api/v1/payouts", payload, { 
    idempotencyKey: idempotencyKey || "",
    retryConfig: { maxRetries: 2 } // Retry payout creation
  }), context);

export const processPayout = (payoutId: string, context?: Record<string, any>) => 
  apiCall(() => api.post(`/api/v1/payouts/${payoutId}/process`), context);

export const cancelPayout = (payoutId: string, context?: Record<string, any>) => 
  apiCall(() => api.post(`/api/v1/payouts/${payoutId}/cancel`), context);

export const getPayoutStatus = (payoutId: string, context?: Record<string, any>) => 
  apiCall(() => api.get(`/api/v1/payouts/${payoutId}/status`), context);

// Connected Accounts API
export const listConnectedAccounts = (context?: Record<string, any>) => 
  apiCall(() => api.get("/api/v1/connected-accounts"), context);

export const createExpressAccount = (payload: any, context?: Record<string, any>) => 
  apiCall(() => api.post("/api/v1/connected-accounts/create-express", payload), context);

export const createAccountLink = (accountId: string, refreshUrl?: string, returnUrl?: string, context?: Record<string, any>) => 
  apiCall(() => api.post(`/api/v1/connected-accounts/create-account-link?account_id=${accountId}&refresh_url=${refreshUrl || 'http://localhost:5173/connected-accounts'}&return_url=${returnUrl || 'http://localhost:5173/connected-accounts'}`), context);

export const addBankAccount = (accountId: string, payload: any, context?: Record<string, any>) => 
  apiCall(() => api.post(`/api/v1/connected-accounts/add-bank-account?account_id=${accountId}`, payload), context);

export const listExternalAccounts = (accountId: string, context?: Record<string, any>) => 
  apiCall(() => api.get(`/api/v1/connected-accounts/${accountId}/external-accounts`), context);

export const setDefaultAccount = (accountId: string, context?: Record<string, any>) => 
  apiCall(() => api.post(`/api/v1/connected-accounts/set-default?account_id=${accountId}`), context);

export const getSupportedCurrencies = (context?: Record<string, any>) => 
  apiCall(() => api.get("/api/v1/connected-accounts/supported-currencies"), context);

// User Profile API
export const getUserProfile = (context?: Record<string, any>) => 
  apiCall(() => api.get("/api/v1/auth/me"), context);

export default api;
