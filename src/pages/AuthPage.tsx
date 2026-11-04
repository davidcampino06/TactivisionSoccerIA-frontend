import "./AuthPage.css";
import { useCallback, useEffect, useState } from "react";
import AuthDrawer, { type AuthMode } from "../components/auth/AuthDrawer";
import Logo from "../components/Logo";
import { es } from "../i18n/es";
import "../landing/landing.css";
import "../landing/slideshow.css";
import HeroSlideshow from "../landing/HeroSlideshow";
import HowItWorks from "../landing/HowItWorks";
import PhilosophyFooter from "../landing/PhilosophyFooter";
import VideoHero from "../landing/VideoHero";
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

/**
 * Public pages, in two screens:
 *   landing  the video hero with real detections, how it works and the philosophy;
 *   auth     the moving photo slideshow behind the login / register drawer. "Empezar ahora",
 *            "Iniciar sesión" and "Crear cuenta" open it; the logo goes back to the landing.
 * A recovery link or an expired session opens the auth screen directly.
 */
export default function AuthPage({ onAuthenticated, sessionNotice = "" }: Props) {
  const [resetToken, setResetToken] = useState(takeResetToken);
  // A recovery link opens the "new password" form; an expired session opens the login with the explanation.
  const [drawer, setDrawer] = useState<{ open: boolean; mode: AuthMode }>(() => (
    resetToken ? { open: true, mode: "reset" } : { open: Boolean(sessionNotice), mode: "login" }
  ));
  const [screen, setScreen] = useState<"landing" | "auth">(() => (drawer.open ? "auth" : "landing"));
  const [scrollTo, setScrollTo] = useState<string | null>(null);
  const openDrawer = (mode: AuthMode) => {
    setScreen("auth");
    setDrawer({ open: true, mode });
  };
  const closeDrawer = useCallback(() => setDrawer((current) => ({ ...current, open: false })), []);
  const backToLanding = (section: string | null = null) => {
    setDrawer((current) => ({ ...current, open: false }));
    setScreen("landing");
    setScrollTo(section);
  };

  // Each screen starts at its top; going back to the philosophy scrolls to it once the landing is shown.
  useEffect(() => {
    if (scrollTo) document.getElementById(scrollTo)?.scrollIntoView();
    else window.scrollTo(0, 0);
  }, [screen, scrollTo]);

  return (
    <div className={`landing is-${screen}`}>
      <header className="topbar-landing">
        <a className="brand" href="#inicio" aria-label={screen === "auth" ? es.landing.backToLanding : es.brand.name}
          onClick={(event) => {
            if (screen === "landing") return;
            event.preventDefault();
            backToLanding();
          }}>
          <Logo size={34} />
          <span>{es.brand.name}</span>
        </a>
        {screen === "landing" ? (
          <nav className="topnav" aria-label={es.brand.name}>
            <a href="#como-funciona">{es.landing.nav.how}</a>
            <a href="#filosofia">{es.landing.nav.philosophy}</a>
          </nav>
        ) : (
          <nav className="topnav" aria-label={es.brand.name}>
            <a href="#inicio" onClick={(event) => { event.preventDefault(); backToLanding(); }}>← {es.landing.backToLanding}</a>
          </nav>
        )}
        <div className="topbar-actions">
          <button type="button" className="cta-ghost small" onClick={() => openDrawer("login")}>{es.landing.login}</button>
          <button type="button" className="cta-primary small" onClick={() => openDrawer("register")}>{es.landing.register}</button>
        </div>
      </header>

      {screen === "landing" ? (
        <div className="screen-fade" key="landing">
          <VideoHero paused={drawer.open} onStart={() => openDrawer("register")} />
          <HowItWorks />
          <PhilosophyFooter />
        </div>
      ) : (
        <div className="screen-fade" key="auth">
          <HeroSlideshow paused={drawer.open} onStart={() => openDrawer("register")} onLogin={() => openDrawer("login")}
            onPhilosophy={() => backToLanding("filosofia")} />
        </div>
      )}

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
