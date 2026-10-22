// Single HTTP client. The frontend talks ONLY to the Backend (never to the AI Service).
import { notifySessionExpired } from "../security/session";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";
const TOKEN_KEY = "tactivision_token";

export class ApiError extends Error {
  readonly status: number;
  /** Stable error code from the backend (e.g. INVALID_CREDENTIALS); translated in i18n/errors.ts. */
  readonly code: string | null;
  /** Extra fields sent with the error (e.g. failed_rules, retry_after_seconds). */
  readonly data: Record<string, unknown>;

  constructor(status: number, message: string, code: string | null = null, data: Record<string, unknown> = {}) {
    super(message);
    this.status = status;
    this.code = code;
    this.data = data;
  }
}

export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (token: string) => localStorage.setItem(TOKEN_KEY, token),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  const token = tokenStore.get();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (options.body && !(options.body instanceof FormData)) headers.set("Content-Type", "application/json");

  const response = await fetch(`${API_URL}${path}`, { ...options, headers });
  if (response.status === 204) return undefined as T;
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail = typeof body.detail === "string" ? body.detail : "Request failed";
    const code = typeof body.code === "string" ? body.code : null;
    if (response.status === 401 && token) {
      tokenStore.clear();
      notifySessionExpired();
    }
    throw new ApiError(response.status, detail, code, body);
  }
  return body as T;
}

/**
 * Downloads a file from the API (exports need the Authorization header, so a plain link would fail)
 * and saves it with `fileName`.
 */
export async function download(path: string, fileName: string): Promise<void> {
  const token = tokenStore.get();
  const response = await fetch(`${API_URL}${path}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    if (response.status === 401 && token) {
      tokenStore.clear();
      notifySessionExpired();
    }
    throw new ApiError(response.status, typeof body.detail === "string" ? body.detail : "Download failed",
      typeof body.code === "string" ? body.code : null, body);
  }
  const url = URL.createObjectURL(await response.blob());
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** An image or file from the API as a Blob (needs the Authorization header, so not a plain <img src>). */
export async function fetchBlob(path: string): Promise<Blob> {
  const token = tokenStore.get();
  const response = await fetch(`${API_URL}${path}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new ApiError(response.status, typeof body.detail === "string" ? body.detail : "Request failed",
      typeof body.code === "string" ? body.code : null, body);
  }
  return response.blob();
}

export const json = (data: unknown) => JSON.stringify(data);
