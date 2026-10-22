import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { NavLink, Outlet, useLocation } from "react-router";
import Logo from "../components/Logo";
import NotificationBell from "../components/notifications/NotificationBell";
import ThemeToggle from "../components/ThemeToggle";
import { es } from "../i18n/es";
import { label } from "../i18n/labels";
import { useTeam } from "./teamState";
import TeamCrest from "../components/team/TeamCrest";
import StadiumBackdrop from "../components/backdrop/StadiumBackdrop";
import { teamAccent } from "../theme/teamAccent";

type NavItem = { to: string; text: string; icon: ReactNode; needsTeam?: boolean; end?: boolean };

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
  overview: icon("M4 4h7v7H4zM13 4h7v4h-7zM13 10h7v10h-7zM4 13h7v7H4z"),
  users: icon("M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7M3 20c.8-3.4 3.2-5 6-5s5.2 1.6 6 5M16 4.4a3.5 3.5 0 0 1 0 6.2M18 15c1.6.6 2.6 2.2 3 5"),
  teams: icon("M12 3 5 6v5c0 4.4 3 7.8 7 9 4-1.2 7-4.6 7-9V6zM12 8v8M8.5 11.5h7"),
  system: icon("M4 5h16v6H4zM4 13h16v6H4zM7.5 8h.01M7.5 16h.01M11 8h5M11 16h5"),
  profile: icon("M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8M4 20c1.5-3.5 4.5-5 8-5s6.5 1.5 8 5"),
  structures: icon("M10 3.5h4v4h-4zM3.5 16.5h4v4h-4zM10 16.5h4v4h-4zM16.5 16.5h4v4h-4zM12 7.5v9M5.5 16.5V12h13v4.5"),
};

const COLLAPSE_KEY = "tactivision-sidebar";

function savedCollapsed(): boolean {
  try {
    return localStorage.getItem(COLLAPSE_KEY) === "1";
  } catch {
    return false;
  }
}

/**
 * App shell: side navigation and the page area. On desktop the sidebar collapses to an icon rail
 * (button or Ctrl+B, remembered in this browser); on phones it becomes a top bar with a menu.
 */
export default function AppLayout({ onLogout }: { onLogout: () => void }) {
  const { user, team } = useTeam();
  const [menuOpen, setMenuOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(savedCollapsed);
  const toggleCollapsed = () => setCollapsed((value) => {
    try {
      localStorage.setItem(COLLAPSE_KEY, value ? "0" : "1");
    } catch {
      /* still toggles for this visit */
    }
    return !value;
  });

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "b"
        && !(event.target as HTMLElement).closest("input, textarea, select, [contenteditable]")) {
        event.preventDefault();
        toggleCollapsed();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  const location = useLocation();
  const [lastPath, setLastPath] = useState(location.pathname);
  if (lastPath !== location.pathname) {
    setLastPath(location.pathname);
    setMenuOpen(false);
  }

  const groups: { title: string; items: NavItem[] }[] = user.role === "ADMINISTRATOR"
    ? [{ title: es.app.nav.admin, items: [
        { to: "/admin", text: es.app.nav.adminOverview, icon: ICONS.overview, end: true },
        { to: "/admin/usuarios", text: es.app.nav.adminUsers, icon: ICONS.users },
        { to: "/admin/equipos", text: es.app.nav.adminTeams, icon: ICONS.teams },
        { to: "/admin/sistema", text: es.app.nav.adminSystem, icon: ICONS.system },
      ] }]
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
      { title: es.app.nav.sectionProject, items: [
        { to: "/estructuras", text: es.app.nav.structures, icon: ICONS.structures, needsTeam: true },
      ] },
    ];

  // The team's kit colour tints the highlights of the app (glass.css reads these two variables).
  const accent = teamAccent(team?.kit_color);
  const accentStyle = accent
    ? ({ "--team-accent": accent.onDark, "--team-accent-light": accent.onLight } as CSSProperties)
    : undefined;

  return (
    <div className={`app-shell${menuOpen ? " menu-open" : ""}${collapsed ? " is-collapsed" : ""}`} style={accentStyle}>
      <StadiumBackdrop />
      <aside className="sidebar">
        <div className="sidebar-top">
          <NavLink to="/" className="sidebar-brand">
            <Logo size={30} />
            <span>{es.brand.name}</span>
          </NavLink>
          {user.role !== "ADMINISTRATOR" && <NotificationBell />}
          <button type="button" className="collapse-toggle" onClick={toggleCollapsed} aria-expanded={!collapsed}
            aria-label={collapsed ? es.app.sidebar.expand : es.app.sidebar.collapse}
            title={`${collapsed ? es.app.sidebar.expand : es.app.sidebar.collapse} (${es.app.sidebar.shortcut})`}>
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8"
              strokeLinecap="round" strokeLinejoin="round"><rect x="3.5" y="4.5" width="17" height="15" rx="3" /><path d="M9.5 4.5v15M15.5 10l-2 2 2 2" /></svg>
          </button>
          <button type="button" className="menu-toggle" aria-expanded={menuOpen}
            aria-label={menuOpen ? es.landing.close : "Menú"} onClick={() => setMenuOpen((open) => !open)}>
            <span /><span /><span />
          </button>
        </div>

        <div className="sidebar-body">
          {team && (
            <div className="sidebar-team" title={team.name}>
              <TeamCrest team={team} />
              <span className="sidebar-team-text">
                <span className="sidebar-team-label">{es.app.nav.team}</span>
                <strong>{team.name}</strong>
              </span>
            </div>
          )}
          <nav aria-label={es.brand.name}>
            {groups.map((group) => (
              <div className="nav-group" key={group.title}>
                <p className="nav-group-title">{group.title}</p>
                {group.items.map((item) => {
                  const disabled = item.needsTeam && !team && user.role !== "ADMINISTRATOR";
                  return disabled ? (
                    <span key={item.to} className="nav-link disabled" title={es.app.nav.team} data-label={item.text}>
                      {item.icon}<span className="nav-text">{item.text}</span>
                    </span>
                  ) : (
                    <NavLink key={item.to} to={item.to} end={item.end} className="nav-link" data-label={item.text} aria-label={collapsed ? item.text : undefined}>
                      {item.icon}<span className="nav-text">{item.text}</span>
                    </NavLink>
                  );
                })}
              </div>
            ))}
          </nav>

          <div className="sidebar-user">
            <ThemeToggle compact={collapsed} />
            <NavLink to="/perfil" className="user-card" data-label={`${user.first_name} ${user.last_name}`}>
              <span className="avatar" aria-hidden="true">{user.first_name[0]}{user.last_name[0]}</span>
              <span className="user-text">
                <strong>{user.first_name} {user.last_name}</strong>
                <small>{label("role", user.role)}</small>
              </span>
            </NavLink>
            <button type="button" className="btn btn-ghost btn-sm btn-block logout-button" onClick={onLogout} aria-label={es.app.logout}
              data-label={es.app.logout}>
              <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.9"
                strokeLinecap="round" strokeLinejoin="round"><path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4M10 16l-4-4 4-4M6 12h10" /></svg>
              <span className="nav-text">{es.app.logout}</span>
            </button>
          </div>
        </div>
      </aside>

      <main className="app-main">
        <Outlet />
      </main>
    </div>
  );
}
