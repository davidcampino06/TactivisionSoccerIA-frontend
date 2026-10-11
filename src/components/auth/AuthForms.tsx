import { useRef, useState, type FormEvent } from "react";
import { ApiError, api, json, tokenStore } from "../../api/client";
import { es } from "../../i18n/es";
import { toUserMessage } from "../../i18n/errors";
import {
  evaluatePassword, isPasswordValid, passwordStrength, type PasswordEvaluation, type PasswordRuleId,
} from "../../security/passwordRules";
import { encryptPassword, forgetPublicKey } from "../../security/crypto";
import type { Role, User } from "../../types";
import PasswordInput from "../PasswordInput";

type SelfRegisterRole = Exclude<Role, "ADMINISTRATOR">;

const EMPTY_EVALUATION = evaluatePassword("", { email: "", firstName: "", lastName: "" });
const RULE_IDS = Object.keys(es.passwordRules) as PasswordRuleId[];

/** Sends a request with the password encrypted; if the backend restarted with a new key, retries once. */
async function withEncryptedPassword<T>(password: string, request: (encrypted: string) => Promise<T>): Promise<T> {
  try {
    return await request(await encryptPassword(password));
  } catch (error) {
    if (error instanceof ApiError && error.code === "PASSWORD_DECRYPTION_FAILED") {
      forgetPublicKey();
      return request(await encryptPassword(password));
    }
    throw error;
  }
}

// ---------------------------------------------------------------- login

type LoginFormProps = {
  notice: string;
  noticeTone?: "success" | "warning";
  onAuthenticated: (user: User) => void;
};

export function LoginForm({ notice, noticeTone = "success", onAuthenticated }: LoginFormProps) {
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
  const [evaluation, setEvaluation] = useState<PasswordEvaluation>(EMPTY_EVALUATION);
  const [passwordLength, setPasswordLength] = useState(0);
  const [confirmState, setConfirmState] = useState<"empty" | "match" | "mismatch">("empty");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const passwordRef = useRef<HTMLInputElement>(null);
  const confirmRef = useRef<HTMLInputElement>(null);

  // Only booleans derived from the password are kept in state, never the password itself.
  const refreshPasswordChecks = (personal = { email, firstName, lastName }) => {
    const password = passwordRef.current?.value ?? "";
    const confirm = confirmRef.current?.value ?? "";
    setEvaluation(evaluatePassword(password, personal));
    setPasswordLength(password.length);
    setConfirmState(confirm ? (confirm === password ? "match" : "mismatch") : "empty");
  };

  const updatePersonal = (field: "firstName" | "lastName" | "email", value: string) => {
    const personal = { email, firstName, lastName, [field]: value };
    if (field === "firstName") setFirstName(value);
    if (field === "lastName") setLastName(value);
    if (field === "email") setEmail(value);
    refreshPasswordChecks(personal);
  };

  const clearPasswords = () => {
    if (passwordRef.current) passwordRef.current.value = "";
    if (confirmRef.current) confirmRef.current.value = "";
    setEvaluation(EMPTY_EVALUATION);
    setPasswordLength(0);
    setConfirmState("empty");
  };

  const passwordOk = isPasswordValid(evaluation);
  const canSubmit = Boolean(firstName.trim() && lastName.trim() && email.trim()) && passwordOk && confirmState === "match";

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!passwordOk) return setError(es.auth.passwordInvalid);
    if (confirmState !== "match") return setError(es.auth.passwordsDontMatch);
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

  const strength = passwordStrength(evaluation, passwordLength);

  return (
    <form className="auth-form" onSubmit={submit}>
      <div className="auth-heading">
        <h2>{es.auth.registerTitle}</h2>
        <p>{es.auth.registerSubtitle}</p>
      </div>

      <div className="field-row">
        <TextField label={es.auth.firstName} autoComplete="given-name" value={firstName} maxLength={60}
          onChange={(value) => updatePersonal("firstName", value)} />
        <TextField label={es.auth.lastName} autoComplete="family-name" value={lastName} maxLength={60}
          onChange={(value) => updatePersonal("lastName", value)} />
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
        placeholder={es.auth.emailPlaceholder} onChange={(value) => updatePersonal("email", value)} />

      <PasswordInput label={es.auth.password} name="new-password" autoComplete="new-password" inputRef={passwordRef}
        onValueChange={() => refreshPasswordChecks()} invalid={passwordLength > 0 && !passwordOk} describedBy="password-rules" />

      <div className="strength" data-level={strength} aria-hidden={passwordLength === 0}>
        <div className="strength-bar"><span /><span /><span /><span /></div>
        <small>{passwordLength ? es.auth.strength[strength] : " "}</small>
      </div>

      <ul className="rules" id="password-rules">
        {RULE_IDS.map((rule) => (
          <li key={rule} className={evaluation[rule] ? "ok" : undefined}>
            <span aria-hidden="true">{evaluation[rule] ? "✓" : "•"}</span>
            {es.passwordRules[rule]}
          </li>
        ))}
      </ul>

      <PasswordInput label={es.auth.confirmPassword} name="confirm-password" autoComplete="new-password" inputRef={confirmRef}
        onValueChange={() => refreshPasswordChecks()} invalid={confirmState === "mismatch"} />
      {confirmState === "mismatch" && <p className="auth-hint-error">{es.auth.passwordsDontMatch}</p>}

      {error && <p className="auth-error" role="alert">{error}</p>}
      <button className="auth-submit" disabled={busy || !canSubmit}>{busy ? es.auth.working : es.auth.registerButton}</button>
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
