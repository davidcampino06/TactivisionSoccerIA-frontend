import { describe, expect, it, vi } from "vitest";
import { isTokenExpired, notifySessionExpired, SESSION_EXPIRED_EVENT, tokenExpiresAt } from "./session";

const base64url = (value: object) =>
  btoa(JSON.stringify(value)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const jwt = (payload: object) => `${base64url({ alg: "RS256", typ: "JWT" })}.${base64url(payload)}.signature`;

describe("session lifetime (JWT expiration)", () => {
  it("reads the expiration time of the token", () => {
    expect(tokenExpiresAt(jwt({ sub: "u1", exp: 1_800_000_000 }))).toBe(1_800_000_000_000);
  });

  it("knows when the token has expired", () => {
    const token = jwt({ exp: 1_000 });
    expect(isTokenExpired(token, 999_999)).toBe(false);
    expect(isTokenExpired(token, 1_000_000)).toBe(true);
  });

  it("a token it cannot read is not treated as expired (the backend decides with a 401)", () => {
    for (const token of ["not-a-jwt", "a.%%%.c", jwt({ sub: "no-exp" })]) {
      expect(tokenExpiresAt(token)).toBeNull();
      expect(isTokenExpired(token)).toBe(false);
    }
  });

  it("announces the expired session so the app logs out", () => {
    const target = new EventTarget();
    vi.stubGlobal("window", target);
    const listener = vi.fn();
    target.addEventListener(SESSION_EXPIRED_EVENT, listener);
    notifySessionExpired();
    expect(listener).toHaveBeenCalledTimes(1);
    vi.unstubAllGlobals();
  });
});
