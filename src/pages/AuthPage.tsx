import { useState, type FormEvent } from "react";
import { api, json, tokenStore } from "../api/client";
import type { User } from "../types";

type Props = { onAuthenticated: (user: User) => void };

export default function AuthPage({ onAuthenticated }: Props) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [form, setForm] = useState({ first_name: "", last_name: "", email: "", password: "", role: "COACH" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const update = (field: string, value: string) => setForm((current) => ({ ...current, [field]: value }));

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const path = mode === "login" ? "/api/auth/login" : "/api/auth/register";
      const body = mode === "login" ? { email: form.email, password: form.password } : form;
      const result = await api<{ access_token: string; user: User }>(path, { method: "POST", body: json(body) });
      tokenStore.set(result.access_token);
      onAuthenticated(result.user);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unexpected error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="card form" onSubmit={submit}>
      <h2>{mode === "login" ? "Login" : "Create account"}</h2>
      {mode === "register" && (
        <>
          <input placeholder="First name" value={form.first_name} onChange={(e) => update("first_name", e.target.value)} required />
          <input placeholder="Last name" value={form.last_name} onChange={(e) => update("last_name", e.target.value)} required />
          <select value={form.role} onChange={(e) => update("role", e.target.value)}>
            <option value="COACH">Coach</option>
            <option value="ANALYST">Analyst</option>
          </select>
        </>
      )}
      <input type="email" placeholder="Email" value={form.email} onChange={(e) => update("email", e.target.value)} required />
      <input type="password" placeholder="Password (min. 8)" minLength={8} value={form.password}
        onChange={(e) => update("password", e.target.value)} required />
      {error && <p className="error">{error}</p>}
      <button className="primary-button" disabled={busy}>{busy ? "Please wait..." : mode === "login" ? "Login" : "Register"}</button>
      <button type="button" className="link-button" onClick={() => setMode(mode === "login" ? "register" : "login")}>
        {mode === "login" ? "No account? Register" : "Already registered? Login"}
      </button>
    </form>
  );
}
