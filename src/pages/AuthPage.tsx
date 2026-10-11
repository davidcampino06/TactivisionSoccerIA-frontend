import "./AuthPage.css";
import { useCallback, useState } from "react";
import AuthDrawer, { type AuthMode } from "../components/auth/AuthDrawer";
import Logo from "../components/Logo";
import { es } from "../i18n/es";
import HeroSlideshow from "../landing/HeroSlideshow";
import PhilosophyFooter from "../landing/PhilosophyFooter";
import type { User } from "../types";

type Props = { onAuthenticated: (user: User) => void; sessionNotice?: string };

/** Public landing: hero slideshow, philosophy footer and the login / register drawer. */
export default function AuthPage({ onAuthenticated, sessionNotice = "" }: Props) {
  // When the session just expired, the login panel opens right away with the explanation.
  const [drawer, setDrawer] = useState<{ open: boolean; mode: AuthMode }>({ open: Boolean(sessionNotice), mode: "login" });
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
      />
    </div>
  );
}
