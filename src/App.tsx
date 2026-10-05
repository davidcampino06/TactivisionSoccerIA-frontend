import "./App.css";
import { useEffect, useState } from "react";
import { api, tokenStore } from "./api/client";
import SystemStatus from "./components/SystemStatus";
import AuthPage from "./pages/AuthPage";
import DashboardPage from "./pages/DashboardPage";
import type { User } from "./types";

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [checkingSession, setCheckingSession] = useState(Boolean(tokenStore.get()));

  useEffect(() => {
    if (!tokenStore.get()) return;
    api<User>("/api/auth/me")
      .then(setUser)
      .catch(() => tokenStore.clear())
      .finally(() => setCheckingSession(false));
  }, []);

  const logout = async () => {
    await api("/api/auth/logout", { method: "POST" }).catch(() => undefined);
    tokenStore.clear();
    setUser(null);
  };

  if (user) return <DashboardPage user={user} onLogout={logout} />;

  return (
    <div className="app-shell">
      <div className="panel">
        <p className="eyebrow">Prototype</p>
        <h1>TACTIVISION IA</h1>
        <p className="subtitle">Intelligent Soccer Tactical Analysis</p>
        <SystemStatus />
        {!checkingSession && <AuthPage onAuthenticated={setUser} />}
      </div>
    </div>
  );
}

export default App;