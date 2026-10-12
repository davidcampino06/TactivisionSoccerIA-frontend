import { useEffect, useRef, useState, type FormEvent } from "react";
import { api, json, tokenStore } from "../../api/client";
import { useTeam } from "../../app/teamState";
import NewPasswordFields from "../../components/auth/NewPasswordFields";
import PasswordInput from "../../components/PasswordInput";
import { ErrorBanner, PageHeader, Pill, Section } from "../../components/ui";
import { es } from "../../i18n/es";
import { formatServerDate, label } from "../../i18n/labels";
import { withEncryptedPasswords } from "../../security/crypto";
import { tokenExpiresAt } from "../../security/session";
import type { User } from "../../types";

const t = es.pages.profile;
// Same rule as the backend (schemas.ProfileUpdate): digits, spaces, dashes, parentheses and an optional +.
const PHONE_PATTERN = /^\+?[0-9][0-9 ()-]{6,19}$/;

export default function ProfilePage({ onLogout }: { onLogout: () => void }) {
  const { user, team } = useTeam();
  const initials = `${user.first_name[0] ?? ""}${user.last_name[0] ?? ""}`;

  return (
    <div className="page">
      <PageHeader eyebrow={t.eyebrow} title={es.app.nav.profile} />

      <section className="profile-hero" aria-label={`${user.first_name} ${user.last_name}`}>
        <span className="profile-avatar" aria-hidden="true">{initials}</span>
        <div className="profile-identity">
          <h2>{user.first_name} {user.last_name}</h2>
          <p>{user.email}</p>
          <div className="profile-tags">
            <Pill tone="info">{label("role", user.role)}</Pill>
            {user.role !== "ADMINISTRATOR" && <Pill>{team?.name ?? t.noTeam}</Pill>}
            {user.created_at && <span className="muted small">{t.memberSince(formatServerDate(user.created_at))}</span>}
          </div>
        </div>
      </section>

      <div className="profile-grid">
        <PersonalData />
        <ChangePassword />
        <SessionCard onLogout={onLogout} />
      </div>
    </div>
  );
}

function PersonalData() {
  const { user, updateUser } = useTeam();
  const [firstName, setFirstName] = useState(user.first_name);
  const [lastName, setLastName] = useState(user.last_name);
  const [phone, setPhone] = useState(user.phone ?? "");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState<unknown>(null);

  const phoneOk = !phone.trim() || PHONE_PATTERN.test(phone.trim());
  const changed = firstName.trim() !== user.first_name || lastName.trim() !== user.last_name
    || phone.trim() !== (user.phone ?? "");
  const valid = Boolean(firstName.trim() && lastName.trim()) && phoneOk;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setNotice("");
    setError(null);
    try {
      const saved = await api<User>("/api/auth/me", { method: "PUT", body: json({
        first_name: firstName.trim(), last_name: lastName.trim(), phone: phone.trim(),
      }) });
      updateUser(saved);
      setFirstName(saved.first_name);
      setLastName(saved.last_name);
      setPhone(saved.phone ?? "");
      setNotice(t.saved);
    } catch (caught) {
      setError(caught);
    } finally {
      setBusy(false);
    }
  };

  const edit = (setter: (value: string) => void) => (value: string) => {
    setter(value);
    setNotice("");
  };

  return (
    <Section title={t.personalTitle} className="profile-personal">
      <p className="muted small">{t.personalHint}</p>
      <form className="profile-form" onSubmit={submit}>
        <div className="field-row">
          <label className="field">
            <span>{es.auth.firstName}</span>
            <input value={firstName} onChange={(e) => edit(setFirstName)(e.target.value)} autoComplete="given-name" maxLength={60} required />
          </label>
          <label className="field">
            <span>{es.auth.lastName}</span>
            <input value={lastName} onChange={(e) => edit(setLastName)(e.target.value)} autoComplete="family-name" maxLength={60} required />
          </label>
        </div>
        <label className="field">
          <span>{t.phone}</span>
          <input type="tel" value={phone} onChange={(e) => edit(setPhone)(e.target.value)} autoComplete="tel" maxLength={20}
            placeholder={t.phonePlaceholder} aria-invalid={!phoneOk || undefined} />
          {!phoneOk && <small className="field-error">{t.phoneInvalid}</small>}
        </label>
        <label className="field">
          <span>{t.email}</span>
          <input type="email" value={user.email} readOnly aria-describedby="profile-email-locked" />
          <small id="profile-email-locked" className="muted">{t.emailLocked}</small>
        </label>
        {notice && <p className="notice" role="status">{notice}</p>}
        <ErrorBanner error={error} />
        <div className="form-actions">
          <button className="btn btn-primary" disabled={busy || !changed || !valid}>
            {busy ? t.saving : changed ? t.save : t.noChanges}
          </button>
        </div>
      </form>
    </Section>
  );
}

function ChangePassword() {
  const { user, updateUser } = useTeam();
  const [formKey, setFormKey] = useState(0);
  const [newValid, setNewValid] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState<unknown>(null);
  const currentRef = useRef<HTMLInputElement>(null);
  const newRef = useRef<HTMLInputElement>(null);
  const confirmRef = useRef<HTMLInputElement>(null);

  /** Remounting the fields empties them: no password stays in the page after a submit. */
  const clearFields = () => {
    setFormKey((key) => key + 1);
    setNewValid(false);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const current = currentRef.current?.value ?? "";
    const next = newRef.current?.value ?? "";
    if (!current || !newValid) return;
    setBusy(true);
    setNotice("");
    setError(null);
    try {
      const session = await withEncryptedPasswords([current, next], ([currentPassword, newPassword]) =>
        api<{ access_token: string; user: User }>("/api/auth/change-password", {
          method: "POST", body: json({ current_password: currentPassword, new_password: newPassword }),
        }),
      );
      // The old token stopped working; keep the session alive with the new one.
      tokenStore.set(session.access_token);
      updateUser(session.user);
      setNotice(t.passwordChanged);
    } catch (caught) {
      setError(caught);
    } finally {
      clearFields();
      setBusy(false);
    }
  };

  return (
    <Section title={t.passwordTitle} className="profile-password">
      <p className="muted small">{t.passwordHint}</p>
      <form className="profile-form" onSubmit={submit} key={formKey}>
        <PasswordInput label={t.currentPassword} name="current-password" autoComplete="current-password" inputRef={currentRef}
          onValueChange={() => { setNotice(""); setError(null); }} />
        <NewPasswordFields personal={{ email: user.email, firstName: user.first_name, lastName: user.last_name }}
          passwordRef={newRef} confirmRef={confirmRef} onValidityChange={setNewValid} label={t.newPassword} idPrefix="profile" />
        <div className="form-actions">
          <button className="btn btn-primary" disabled={busy || !newValid}>{busy ? t.changing : t.changePassword}</button>
        </div>
      </form>
      {notice && <p className="notice" role="status">{notice}</p>}
      <ErrorBanner error={error} />
    </Section>
  );
}

function SessionCard({ onLogout }: { onLogout: () => void }) {
  const [now, setNow] = useState(() => Date.now());
  // Read on every render: after a password change the token is new (and the user object too,
  // which re-renders this card).
  const expiresAt = tokenExpiresAt(tokenStore.get() ?? "");

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const minutesLeft = expiresAt === null ? null : Math.max(0, Math.ceil((expiresAt - now) / 60_000));
  const time = expiresAt === null ? "" : new Date(expiresAt).toLocaleTimeString("es-CO", { hour: "numeric", minute: "2-digit" });

  return (
    <Section title={t.sessionTitle} className="profile-session">
      {expiresAt === null ? <p className="muted">{t.sessionUnknown}</p> : (
        <div className="session-time">
          <strong>{t.sessionEnds(time)}</strong>
          <span className="muted small">{t.sessionLeft(minutesLeft ?? 0)}</span>
        </div>
      )}
      <h3 className="profile-subtitle">{t.securityTitle}</h3>
      <ul className="security-list">
        {t.security.map((item) => (
          <li key={item}>
            <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.2"
              strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5 10 17l9-10" /></svg>
            {item}
          </li>
        ))}
      </ul>
      <button type="button" className="btn btn-ghost btn-block" onClick={onLogout}>{es.app.logout}</button>
    </Section>
  );
}
