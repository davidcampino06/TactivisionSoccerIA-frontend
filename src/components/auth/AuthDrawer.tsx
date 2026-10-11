import { useEffect, useRef, useState } from "react";
import { es } from "../../i18n/es";
import type { User } from "../../types";
import { LoginForm, RegisterForm } from "./AuthForms";

export type AuthMode = "login" | "register";

type Props = {
  open: boolean;
  mode: AuthMode;
  onModeChange: (mode: AuthMode) => void;
  onClose: () => void;
  onAuthenticated: (user: User) => void;
  /** Message shown in the login form when the panel opens (e.g. the session expired). */
  initialNotice?: string;
};

/** Side panel with the login / register forms. Closes with Escape or by clicking outside. */
export default function AuthDrawer({ open, mode, onModeChange, onClose, onAuthenticated, initialNotice = "" }: Props) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [notice, setNotice] = useState<{ text: string; tone: "success" | "warning" }>(
    { text: initialNotice, tone: "warning" },
  );

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    window.setTimeout(() => panelRef.current?.querySelector<HTMLInputElement>("input")?.focus(), 320);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      previous?.focus();
    };
  }, [open, onClose]);

  const switchMode = (next: AuthMode) => {
    setNotice({ text: "", tone: "success" });
    onModeChange(next);
  };

  return (
    <div className={`drawer${open ? " open" : ""}`} aria-hidden={!open} inert={!open}>
      <div className="drawer-backdrop" onClick={onClose} />
      <div ref={panelRef} className="drawer-panel" role="dialog" aria-modal="true" aria-label={mode === "login" ? es.auth.loginTab : es.auth.registerTab}>
        <div className="drawer-head">
          <div className="auth-tabs" role="tablist">
            {(["login", "register"] as const).map((tab) => (
              <button key={tab} type="button" role="tab" aria-selected={mode === tab}
                className={mode === tab ? "active" : undefined} onClick={() => switchMode(tab)}>
                {tab === "login" ? es.auth.loginTab : es.auth.registerTab}
              </button>
            ))}
          </div>
          <button type="button" className="drawer-close" onClick={onClose} aria-label={es.landing.close}>
            <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 6l12 12M18 6 6 18" /></svg>
          </button>
        </div>
        {open && (mode === "login" ? (
          <LoginForm key="login" notice={notice.text} noticeTone={notice.tone} onAuthenticated={onAuthenticated} />
        ) : (
          <RegisterForm
            key="register"
            onRegistered={() => {
              setNotice({ text: es.auth.registered, tone: "success" });
              onModeChange("login");
            }}
          />
        ))}
      </div>
    </div>
  );
}
