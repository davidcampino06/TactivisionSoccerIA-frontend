// Session lifetime: the app logs out by itself when the JWT expires, and also when the backend
// answers 401 to a request made with a token (expired, account disabled, server key changed).

export const SESSION_EXPIRED_EVENT = "tactivision:session-expired";

/** Expiration time of a JWT in milliseconds since epoch, or null if it cannot be read. */
export function tokenExpiresAt(token: string): number | null {
  try {
    const payload = token.split(".")[1];
    const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    const exp = (JSON.parse(json) as { exp?: number }).exp;
    return typeof exp === "number" ? exp * 1000 : null;
  } catch {
    return null;
  }
}

export function isTokenExpired(token: string, now = Date.now()): boolean {
  const expiresAt = tokenExpiresAt(token);
  return expiresAt !== null && expiresAt <= now;
}

export function notifySessionExpired(): void {
  window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
}

export function onSessionExpired(listener: () => void): () => void {
  window.addEventListener(SESSION_EXPIRED_EVENT, listener);
  return () => window.removeEventListener(SESSION_EXPIRED_EVENT, listener);
}

// setTimeout breaks above ~24.8 days; the token lasts hours, but stay safe.
const MAX_TIMEOUT_MS = 2_147_483_647;

/** Calls `onExpire` when the token expires. Returns a cancel function. */
export function scheduleExpiry(token: string, onExpire: () => void): () => void {
  const expiresAt = tokenExpiresAt(token);
  if (expiresAt === null) return () => undefined;
  const timer = window.setTimeout(onExpire, Math.min(MAX_TIMEOUT_MS, Math.max(0, expiresAt - Date.now())));
  return () => window.clearTimeout(timer);
}
