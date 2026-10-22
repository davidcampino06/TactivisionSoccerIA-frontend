import "./App.css";
import "./glass.css";
import { useCallback, useEffect, useState } from "react";
import { ApiError, api, tokenStore } from "./api/client";
import Logo from "./components/Logo";
import { es } from "./i18n/es";
import AuthPage from "./pages/AuthPage";
import AppRoutes from "./app/AppRoutes";
import { isTokenExpired, onSessionExpired, scheduleExpiry } from "./security/session";
import type { User } from "./types";

/** Reads the stored token once at start-up; an expired token is discarded with a notice. */
function readStoredSession(): { hasToken: boolean; expired: boolean } {
  const token = tokenStore.get();
  if (!token) return { hasToken: false, expired: false };
  if (isTokenExpired(token)) {
    tokenStore.clear();
    return { hasToken: false, expired: true };
  }
  return { hasToken: true, expired: false };
}

function App() {
  const [initial] = useState(readStoredSession);
  const [user, setUser] = useState<User | null>(null);
  const [checkingSession, setCheckingSession] = useState(initial.hasToken);
  const [sessionNotice, setSessionNotice] = useState(initial.expired ? es.errors.sessionExpired : "");

  const expireSession = useCallback(() => {
    tokenStore.clear();
    setUser(null);
    setSessionNotice(es.errors.sessionExpired);
  }, []);

  // Restore the session on load (only when a valid token is stored).
  useEffect(() => {
    if (!initial.hasToken) return;
    api<User>("/api/auth/me")
      .then(setUser)
      .catch((error: unknown) => {
        tokenStore.clear();
        // Rejected token (expired, password changed on another device, account disabled): say why.
        if (error instanceof ApiError && error.status === 401) setSessionNotice(es.errors.sessionExpired);
      })
      .finally(() => setCheckingSession(false));
  }, [initial.hasToken]);

  // While logged in: log out exactly when the token expires, or when the backend rejects it.
  useEffect(() => {
    const token = tokenStore.get();
    if (!user || !token) return;
    const cancelTimer = scheduleExpiry(token, expireSession);
    const stopListening = onSessionExpired(expireSession);
    return () => {
      cancelTimer();
      stopListening();
    };
  }, [user, expireSession]);

  const authenticate = (next: User) => {
    setSessionNotice("");
    setUser(next);
  };

  const logout = async () => {
    await api("/api/auth/logout", { method: "POST" }).catch(() => undefined);
    tokenStore.clear();
    setSessionNotice("");
    setUser(null);
  };

  if (user) return <AppRoutes user={user} onUserChange={setUser} onLogout={() => void logout()} />;

  if (checkingSession) {
    return (
      <div className="session-check" role="status">
        <Logo size={44} />
        <span>{es.auth.checkingSession}</span>
      </div>
    );
  }

  return <AuthPage onAuthenticated={authenticate} sessionNotice={sessionNotice} />;
}

export default App;
