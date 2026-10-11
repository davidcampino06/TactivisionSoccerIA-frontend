import { useState, type ReactNode } from "react";
import { NavLink, Outlet, useLocation } from "react-router";
import Logo from "../components/Logo";
import { es } from "../i18n/es";
import { label } from "../i18n/labels";
import { useTeam } from "./teamState";

type NavItem = { to: string; text: string; icon: ReactNode; needsTeam?: boolean };

const icon = (path: string) => (
  <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor"
    strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d={path} /></svg>
);

const ICONS = {
  home: icon("M3 11.5 12 4l9 7.5M5.5 10v9.5h13V10"),
  team: icon("M16 19v-1.5a3.5 3.5 0 0 0-3.5-3.5h-5A3.5 3.5 0 0 0 4 17.5V19M10 10.5a3 3 0 1 0 0-6 3 3 0 0 0 0 6M20 19v-1.5a3.5 3.5 0 0 0-2.5-3.35M15.5 4.6a3 3 0 0 1 0 5.8"),
  matches: icon("M4 5h16v14H4zM4 12h16M12 5v14M8.5 12a3.5 3.5 0 1 0 7 0 3.5 3.5 0 1 0-7 0"),
  players: icon("M9 3l3 2 3-2 4 3-2 4h-2v11H9V10H7L5 6z"),
  tactics: icon("M5 5l4 4M9 5 5 9M15 15l4 4M19 15l-4 4M7 17c3 0 4-3 6-6s3-4 6-4"),
  comparison: icon("M6 20V10M12 20V4M18 20v-7"),
  evolution: icon("M3 17l6-6 4 4 8-8M15 7h6v6"),
  reports: icon("M7 3h7l5 5v13H7zM14 3v5h5M10 13h6M10 17h6"),
  admin: icon("M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6zM9 12l2 2 4-4"),
  profile: icon("M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8M4 20c1.5-3.5 4.5-5 8-5s6.5 1.5 8 5"),
};

/** App shell: side navigation (collapses to a top bar on phones) and the page area. */
export default function AppLayout({ onLogout }: { onLogout: () => void }) {
  const { user, team } = useTeam();
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const [lastPath, setLastPath] = useState(location.pathname);
  if (lastPath !== location.pathname) {
    setLastPath(location.pathname);
    setMenuOpen(false);
  }

  const groups: { title: string; items: NavItem[] }[] = user.role === "ADMINISTRATOR"
    ? [{ title: es.app.nav.admin, items: [{ to: "/admin", text: es.app.nav.admin, icon: ICONS.admin }] }]
    : [
      { title: es.app.nav.sectionWork, items: [
        { to: "/panel", text: es.app.nav.home, icon: ICONS.home, needsTeam: true },
        { to: "/partidos", text: es.app.nav.matches, icon: ICONS.matches, needsTeam: true },
        { to: "/diseno-tactico", text: es.app.nav.tactics, icon: ICONS.tactics, needsTeam: true },
      ] },
      { title: es.app.nav.sectionTeam, items: [
        { to: "/equipo", text: es.app.nav.team, icon: ICONS.team },
        { to: "/jugadores", text: es.app.nav.players, icon: ICONS.players, needsTeam: true },
      ] },
      { title: es.app.nav.sectionInsights, items: [
        { to: "/comparacion", text: es.app.nav.comparison, icon: ICONS.comparison, needsTeam: true },
        { to: "/evolucion", text: es.app.nav.evolution, icon: ICONS.evolution, needsTeam: true },
        { to: "/reportes", text: es.app.nav.reports, icon: ICONS.reports, needsTeam: true },
      ] },
    ];

  return (
    <div className={`app-shell${menuOpen ? " menu-open" : ""}`}>
      <aside className="sidebar">
        <div className="sidebar-top">
          <NavLink to="/" className="sidebar-brand">
            <Logo size={30} />
            <span>{es.brand.name}</span>
          </NavLink>
          <button type="button" className="menu-toggle" aria-expanded={menuOpen}
            aria-label={menuOpen ? es.landing.close : "Menú"} onClick={() => setMenuOpen((open) => !open)}>
            <span /><span /><span />
          </button>
        </div>

        <div className="sidebar-body">
          {team && (
            <div className="sidebar-team">
              <span className="sidebar-team-label">{es.app.nav.team}</span>
              <strong>{team.name}</strong>
            </div>
          )}
          <nav aria-label={es.brand.name}>
            {groups.map((group) => (
              <div className="nav-group" key={group.title}>
                <p className="nav-group-title">{group.title}</p>
                {group.items.map((item) => {
                  const disabled = item.needsTeam && !team && user.role !== "ADMINISTRATOR";
                  return disabled ? (
                    <span key={item.to} className="nav-link disabled" title={es.app.nav.team}>
                      {item.icon}{item.text}
                    </span>
                  ) : (
                    <NavLink key={item.to} to={item.to} className="nav-link">
                      {item.icon}{item.text}
                    </NavLink>
                  );
                })}
              </div>
            ))}
          </nav>

          <div className="sidebar-user">
            <NavLink to="/perfil" className="user-card">
              <span className="avatar" aria-hidden="true">{user.first_name[0]}{user.last_name[0]}</span>
              <span className="user-text">
                <strong>{user.first_name} {user.last_name}</strong>
                <small>{label("role", user.role)}</small>
              </span>
            </NavLink>
            <button type="button" className="btn btn-ghost btn-sm btn-block" onClick={onLogout}>{es.app.logout}</button>
          </div>
        </div>
      </aside>

      <main className="app-main">
        <Outlet />
      </main>
    </div>
  );
}
