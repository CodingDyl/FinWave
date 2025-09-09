import axios from "axios";
import { getCorrelationId } from "./correlation";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE || "http://localhost:8000",
  withCredentials: true, // cookie session from backend
});

api.interceptors.request.use((config) => {
  config.headers.set("X-Correlation-ID", getCorrelationId());
  return config;
});

export default api;
