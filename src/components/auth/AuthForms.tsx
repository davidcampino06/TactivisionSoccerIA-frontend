import { useRef, useState, type FormEvent } from "react";
import { ApiError, api, json, tokenStore } from "../../api/client";
import { es } from "../../i18n/es";
import { toUserMessage } from "../../i18n/errors";
import { withEncryptedPasswords } from "../../security/crypto";
import type { Role, User } from "../../types";
import PasswordInput from "../PasswordInput";
import NewPasswordFields from "./NewPasswordFields";

type SelfRegisterRole = Exclude<Role, "ADMINISTRATOR">;

/** Sends a request with the password encrypted (RSA-OAEP); retries once if the server key changed. */
const withEncryptedPassword = <T,>(password: string, request: (encrypted: string) => Promise<T>) =>
  withEncryptedPasswords([password], ([encrypted]) => request(encrypted));

// ---------------------------------------------------------------- login

type LoginFormProps = {
  notice: string;
  noticeTone?: "success" | "warning";
  onAuthenticated: (user: User) => void;
  onForgotPassword: () => void;
};

export function LoginForm({ notice, noticeTone = "success", onAuthenticated, onForgotPassword }: LoginFormProps) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const passwordRef = useRef<HTMLInputElement>(null);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const passwordInput = passwordRef.current;
    if (!passwordInput) return;
    setBusy(true);
    setError("");
    try {
      const result = await withEncryptedPassword(passwordInput.value, (password) =>
        api<{ access_token: string; user: User }>("/api/auth/login", {
          method: "POST",
          body: json({ email: email.trim(), password }),
        }),
      );
      passwordInput.value = "";
      setEmail("");
      tokenStore.set(result.access_token);
      onAuthenticated(result.user);
    } catch (caught) {
      passwordInput.value = ""; // failed attempt: never keep the password around
      setError(toUserMessage(caught));
      passwordInput.focus();
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="auth-form" onSubmit={submit}>
      <div className="auth-heading">
        <h2>{es.auth.loginTitle}</h2>
        <p>{es.auth.loginSubtitle}</p>
      </div>
      {notice && <p className={`auth-notice ${noticeTone}`} role="status">{notice}</p>}
      <TextField label={es.auth.email} type="email" autoComplete="email" value={email} onChange={setEmail}
        placeholder={es.auth.emailPlaceholder} maxLength={254} />
      <PasswordInput label={es.auth.password} name="password" autoComplete="current-password" inputRef={passwordRef} />
      <button type="button" className="auth-link" onClick={onForgotPassword}>{es.auth.forgotPassword}</button>
      {error && <p className="auth-error" role="alert">{error}</p>}
      <button className="auth-submit" disabled={busy}>{busy ? es.auth.working : es.auth.loginButton}</button>
    </form>
  );
}

// ---------------------------------------------------------------- register

export function RegisterForm({ onRegistered }: { onRegistered: () => void }) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<SelfRegisterRole>("COACH");
  const [passwordValid, setPasswordValid] = useState(false);
  const [passwordKey, setPasswordKey] = useState(0);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const passwordRef = useRef<HTMLInputElement>(null);
  const confirmRef = useRef<HTMLInputElement>(null);

  // Remounting the password block empties both fields and their checks.
  const clearPasswords = () => {
    setPasswordKey((key) => key + 1);
    setPasswordValid(false);
  };

  const canSubmit = Boolean(firstName.trim() && lastName.trim() && email.trim()) && passwordValid;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!passwordValid) return setError(es.auth.passwordInvalid);
    setBusy(true);
    setError("");
    try {
      await withEncryptedPassword(passwordRef.current?.value ?? "", (password) =>
        api("/api/auth/register", {
          method: "POST",
          body: json({ first_name: firstName.trim(), last_name: lastName.trim(), email: email.trim(), password, role }),
        }),
      );
      // Registration does not log in: every field is cleared and the user signs in explicitly.
      clearPasswords();
      setFirstName("");
      setLastName("");
      setEmail("");
      onRegistered();
    } catch (caught) {
      clearPasswords();
      setError(toUserMessage(caught));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="auth-form" onSubmit={submit}>
      <div className="auth-heading">
        <h2>{es.auth.registerTitle}</h2>
        <p>{es.auth.registerSubtitle}</p>
      </div>

      <div className="field-row">
        <TextField label={es.auth.firstName} autoComplete="given-name" value={firstName} maxLength={60} onChange={setFirstName} />
        <TextField label={es.auth.lastName} autoComplete="family-name" value={lastName} maxLength={60} onChange={setLastName} />
      </div>

      <fieldset className="role-picker">
        <legend>{es.auth.role}</legend>
        {(["COACH", "ANALYST"] as const).map((option) => (
          <label key={option} className={role === option ? "selected" : undefined}>
            <input type="radio" name="role" value={option} checked={role === option} onChange={() => setRole(option)} />
            <strong>{es.auth.roles[option].label}</strong>
            <small>{es.auth.roles[option].hint}</small>
          </label>
        ))}
      </fieldset>

      <TextField label={es.auth.email} type="email" autoComplete="email" value={email} maxLength={254}
        placeholder={es.auth.emailPlaceholder} onChange={setEmail} />

      <NewPasswordFields key={passwordKey} personal={{ email, firstName, lastName }} passwordRef={passwordRef}
        confirmRef={confirmRef} onValidityChange={setPasswordValid} idPrefix="register" />

      {error && <p className="auth-error" role="alert">{error}</p>}
      <button className="auth-submit" disabled={busy || !canSubmit}>{busy ? es.auth.working : es.auth.registerButton}</button>
    </form>
  );
}

// ---------------------------------------------------------------- forgot password

type RecoveryResponse = { message: string; reset_token?: string };

/** Asks for a recovery link. The answer is the same whether the e-mail exists or not. */
export function ForgotPasswordForm({ onBack, onDevelopmentToken }: { onBack: () => void; onDevelopmentToken: (token: string) => void }) {
  const [email, setEmail] = useState("");
  const [sentTo, setSentTo] = useState("");
  const [devToken, setDevToken] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const result = await api<RecoveryResponse>("/api/auth/password-recovery", {
        method: "POST", body: json({ email: email.trim() }),
      });
      setSentTo(email.trim());
      setDevToken(result.reset_token ?? "");
      setEmail("");
    } catch (caught) {
      setError(toUserMessage(caught));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="auth-form" onSubmit={submit}>
      <div className="auth-heading">
        <h2>{es.auth.forgotTitle}</h2>
        <p>{es.auth.forgotSubtitle}</p>
      </div>
      {sentTo ? (
        <>
          <p className="auth-notice" role="status">{es.auth.recoverySent(sentTo)}</p>
          <p className="auth-small">{es.auth.recoveryHint}</p>
          {devToken && (
            <div className="auth-dev">
              <strong>{es.auth.devModeTitle}</strong>
              <p>{es.auth.devModeBody}</p>
              <button type="button" className="auth-submit auth-submit-ghost" onClick={() => onDevelopmentToken(devToken)}>
                {es.auth.devModeOpen}
              </button>
            </div>
          )}
          <button type="button" className="auth-link" onClick={() => setSentTo("")}>{es.auth.recoveryRetry}</button>
        </>
      ) : (
        <>
          <TextField label={es.auth.email} type="email" autoComplete="email" value={email} onChange={setEmail}
            placeholder={es.auth.emailPlaceholder} maxLength={254} />
          {error && <p className="auth-error" role="alert">{error}</p>}
          <button className="auth-submit" disabled={busy || !email.trim()}>{busy ? es.auth.working : es.auth.sendLink}</button>
        </>
      )}
      <button type="button" className="auth-link" onClick={onBack}>← {es.auth.backToLogin}</button>
    </form>
  );
}

// ---------------------------------------------------------------- reset password

/** Sets a new password with the one-time token from the recovery link. */
export function ResetPasswordForm({ token, onDone, onRequestNewLink }: { token: string; onDone: () => void; onRequestNewLink: () => void }) {
  const [passwordValid, setPasswordValid] = useState(false);
  const [passwordKey, setPasswordKey] = useState(0);
  const [error, setError] = useState("");
  const [expired, setExpired] = useState(false);
  const [busy, setBusy] = useState(false);
  const passwordRef = useRef<HTMLInputElement>(null);
  const confirmRef = useRef<HTMLInputElement>(null);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!passwordValid) return setError(es.auth.passwordInvalid);
    setBusy(true);
    setError("");
    try {
      await withEncryptedPassword(passwordRef.current?.value ?? "", (password) =>
        api("/api/auth/password-reset", { method: "POST", body: json({ token, new_password: password }) }),
      );
      setPasswordKey((key) => key + 1);
      onDone();
    } catch (caught) {
      setPasswordKey((key) => key + 1);
      setPasswordValid(false);
      setExpired(caught instanceof ApiError && caught.code === "INVALID_RESET_TOKEN");
      setError(toUserMessage(caught));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="auth-form" onSubmit={submit}>
      <div className="auth-heading">
        <h2>{es.auth.resetTitle}</h2>
        <p>{es.auth.resetSubtitle}</p>
      </div>
      {/* The server checks that it does not contain the user's name or e-mail. */}
      <NewPasswordFields key={passwordKey} personal={{ email: "", firstName: "", lastName: "" }} passwordRef={passwordRef}
        confirmRef={confirmRef} onValidityChange={setPasswordValid} label={es.auth.newPassword} idPrefix="reset" />
      {error && <p className="auth-error" role="alert">{error}</p>}
      {expired ? (
        <button type="button" className="auth-submit" onClick={onRequestNewLink}>{es.auth.requestNewLink}</button>
      ) : (
        <button className="auth-submit" disabled={busy || !passwordValid}>{busy ? es.auth.working : es.auth.resetButton}</button>
      )}
    </form>
  );
}

// ---------------------------------------------------------------- pieces

type TextFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: "text" | "email";
  autoComplete: string;
  placeholder?: string;
  maxLength: number;
};

function TextField({ label, value, onChange, type = "text", autoComplete, placeholder, maxLength }: TextFieldProps) {
  const id = `field-${autoComplete}`;
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <input id={id} type={type} autoComplete={autoComplete} value={value} placeholder={placeholder}
        maxLength={maxLength} onChange={(event) => onChange(event.target.value)} required />
    </div>
  );
}
