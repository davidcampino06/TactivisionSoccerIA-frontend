import "./AuthPage.css";
import { useCallback, useState } from "react";
import AuthDrawer, { type AuthMode } from "../components/auth/AuthDrawer";
import Logo from "../components/Logo";
import { es } from "../i18n/es";
import HeroSlideshow from "../landing/HeroSlideshow";
import PhilosophyFooter from "../landing/PhilosophyFooter";
import type { User } from "../types";

type Props = { onAuthenticated: (user: User) => void; sessionNotice?: string };

const RESET_PATH = "/restablecer";

/**
 * Token of a recovery link (/restablecer#token=...). It travels in the URL fragment, which the
 * browser never sends to a server. It is read once when the app loads and removed from the
 * address bar, so it does not stay in the history or get copied by accident.
 */
let pendingResetToken = (() => {
  if (window.location.pathname !== RESET_PATH) return "";
  const token = new URLSearchParams(window.location.hash.slice(1)).get("token") ?? "";
  window.history.replaceState(null, "", "/");
  return token;
})();

/** Hands the token over once (a later visit to the landing, e.g. after logout, does not reuse it). */
function takeResetToken(): string {
  const token = pendingResetToken;
  pendingResetToken = "";
  return token;
}

/** Public landing: hero slideshow, philosophy footer and the login / register drawer. */
export default function AuthPage({ onAuthenticated, sessionNotice = "" }: Props) {
  const [resetToken, setResetToken] = useState(takeResetToken);
  // A recovery link opens the "new password" form; an expired session opens the login with the explanation.
  const [drawer, setDrawer] = useState<{ open: boolean; mode: AuthMode }>(() => (
    resetToken ? { open: true, mode: "reset" } : { open: Boolean(sessionNotice), mode: "login" }
  ));
  const openDrawer = (mode: AuthMode) => setDrawer({ open: true, mode });
  const closeDrawer = useCallback(() => setDrawer((current) => ({ ...current, open: false })), []);

  return (
    <div className="landing">
      <header className="topbar-landing">
        <a className="brand" href="#inicio" aria-label={es.brand.name}>
          <Logo size={34} />
          <span>{es.brand.name}</span>
        </a>
        <nav className="topnav" aria-label={es.brand.name}>
          <a href="#inicio">{es.landing.nav.platform}</a>
          <a href="#filosofia">{es.landing.nav.philosophy}</a>
        </nav>
        <div className="topbar-actions">
          <button type="button" className="cta-ghost small" onClick={() => openDrawer("login")}>{es.landing.login}</button>
          <button type="button" className="cta-primary small" onClick={() => openDrawer("register")}>{es.landing.register}</button>
        </div>
      </header>

      <HeroSlideshow paused={drawer.open} onStart={() => openDrawer("register")} onLogin={() => openDrawer("login")} />
      <PhilosophyFooter />

      <AuthDrawer
        open={drawer.open}
        mode={drawer.mode}
        onModeChange={(mode) => setDrawer({ open: true, mode })}
        onClose={closeDrawer}
        onAuthenticated={onAuthenticated}
        initialNotice={sessionNotice}
        resetToken={resetToken}
        onResetToken={(token) => {
          setResetToken(token);
          openDrawer("reset");
        }}
      />
    </div>
  );
}
