import { useEffect, useRef, useState } from "react";
import { api, json } from "../../api/client";
import Donut from "../../components/dashboard/Donut";
import { ConfirmButton, EmptyState, ErrorBanner, Loading, PageHeader, Pill, Section, type Tone } from "../../components/ui";
import { useLoad } from "../../hooks/useLoad";
import { es } from "../../i18n/es";
import { formatServerDate, formatTimestamp, label } from "../../i18n/labels";
import type { AdminOverview, AdminTeam, AdminUser, Role } from "../../types";

const t = es.pages.admin;
export type AdminSection = "overview" | "users" | "teams" | "system";
const REFRESH_MS = 5000;

const HEADERS: Record<AdminSection, { title: string; body: string }> = {
  overview: { title: t.overviewTitle, body: t.overviewBody },
  users: { title: t.usersTitle, body: t.usersBody },
  teams: { title: t.teamsTitle, body: t.teamsBody },
  system: { title: t.systemTitle, body: t.systemBody },
};

export default function AdminPage({ section }: { section: AdminSection }) {
  return (
    <div className="page page-wide">
      <PageHeader eyebrow={t.eyebrow} title={HEADERS[section].title} description={HEADERS[section].body} />
      {section === "overview" && <Overview />}
      {section === "users" && <Users />}
      {section === "teams" && <Teams />}
      {section === "system" && <SystemSection />}
    </div>
  );
}

/** Reloads the overview every few seconds so the queue is live. */
function useOverview() {
  const overview = useLoad(() => api<AdminOverview>("/api/admin/overview"), "admin-overview");
  const { reload } = overview;
  useEffect(() => {
    const timer = window.setInterval(reload, REFRESH_MS);
    return () => window.clearInterval(timer);
  }, [reload]);
  return overview;
}

function Overview() {
  const overview = useOverview();
  if (overview.error && !overview.data) return <ErrorBanner error={overview.error} onRetry={overview.reload} />;
  if (!overview.data) return <Loading />;
  const data = overview.data;
  const roles: Role[] = ["COACH", "ANALYST", "ADMINISTRATOR"];
  const real = data.analyses.by_mode.REAL_VIDEO_ANALYSIS ?? 0;
  const statuses = ["COMPLETED", "PROCESSING", "PENDING", "FAILED", "CANCELLED"];
  const maxStatus = Math.max(1, ...statuses.map((item) => data.analyses.by_status[item] ?? 0));

  return (
    <div className="stack">
      <div className="stat-grid">
        <Stat value={data.users.total} label={t.users} foot={data.users.inactive ? t.inactive(data.users.inactive) : undefined} />
        <Stat value={data.teams} label={t.teams} />
        <Stat value={data.matches} label={t.matches} />
        <Stat value={data.videos} label={t.videos} />
        <Stat value={data.analyses.total} label={t.analyses} />
      </div>

      <div className="admin-grid">
        <Section title={t.byRole}>
          <div className="role-bar" role="img" aria-label={roles.map((role) => `${label("role", role)}: ${data.users.by_role[role] ?? 0}`).join(", ")}>
            {roles.map((role, index) => (data.users.by_role[role] ?? 0) > 0 && (
              <span key={role} className={`series-bg-${index + 1}`} style={{ flex: data.users.by_role[role] }} />
            ))}
          </div>
          <ul className="legend-list">
            {roles.map((role, index) => (
              <li key={role}><span className={`swatch series-${index + 1}`} aria-hidden="true" />{label("role", role)}<strong>{data.users.by_role[role] ?? 0}</strong></li>
            ))}
          </ul>
        </Section>

        <Section title={t.analysesByStatus}>
          <ul className="status-bars">
            {statuses.map((item) => (
              <li key={item}>
                <span>{label("analysisStatus", item)}</span>
                <span className="status-track"><span style={{ width: `${((data.analyses.by_status[item] ?? 0) / maxStatus) * 100}%` }} /></span>
                <strong>{data.analyses.by_status[item] ?? 0}</strong>
              </li>
            ))}
          </ul>
        </Section>

        <Section title={t.analysesByMode}>
          {data.analyses.total === 0 ? <p className="muted">—</p> : (
            <div className="mode-split">
              <Donut value={real / data.analyses.total} caption={t.realCaption} label={t.analysesByMode} />
              <ul className="legend-list">
                <li><span className="swatch series-1" aria-hidden="true" />{label("analysisMode", "REAL_VIDEO_ANALYSIS")}<strong>{real}</strong></li>
                <li><span className="swatch swatch-muted" aria-hidden="true" />{label("analysisMode", "SIMULATION_MODE")}<strong>{data.analyses.by_mode.SIMULATION_MODE ?? 0}</strong></li>
              </ul>
            </div>
          )}
        </Section>

        <Section title={t.signups} className="admin-wide">
          <SignupsChart days={data.users.signups} />
        </Section>
      </div>

      <QueuePanel queue={data.queue} />
    </div>
  );
}

function Stat({ value, label: text, foot }: { value: number; label: string; foot?: string }) {
  return (
    <div className="stat">
      <span className="stat-label">{text}</span>
      <strong className="stat-value">{value}</strong>
      {foot && <span className="stat-foot">{foot}</span>}
    </div>
  );
}

/** Width of an element, so an SVG can be drawn at its real size (text keeps its size on any screen). */
function useWidth<T extends HTMLElement>(initial: number) {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(initial);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.max(240, Math.round(entry.contentRect.width))));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return [ref, width] as const;
}

/** One column per day (single series, one axis from 0, direct label on the busiest day). */
function SignupsChart({ days }: { days: AdminOverview["users"]["signups"] }) {
  const [hover, setHover] = useState<number | null>(null);
  const [ref, W] = useWidth<HTMLDivElement>(560);
  const narrow = W < 480;
  const max = Math.max(1, ...days.map((day) => day.count));
  const total = days.reduce((sum, day) => sum + day.count, 0);
  const peak = days.reduce((best, day, index) => (day.count > days[best].count ? index : best), 0);
  const H = 170;
  const bar = W / days.length;
  const short = (date: string) => { const [, m, d] = date.split("-"); return `${Number(d)}/${Number(m)}`; };
  return (
    <div className="viz" ref={ref}>
      <p className="muted small">{t.signupsTotal(total)}</p>
      <svg viewBox={`0 0 ${W} ${H + 22}`} className="viz-svg" role="img" aria-label={`${t.signups}: ${t.signupsTotal(total)}`}
        onPointerLeave={() => setHover(null)}>
        <line className="viz-baseline" x1={0} x2={W} y1={H} y2={H} />
        {days.map((day, index) => {
          const height = (day.count / max) * (H - 20);
          const x = index * bar + bar * 0.2;
          return (
            <g key={day.date} onPointerEnter={() => setHover(index)}>
              <rect className="viz-hit" x={index * bar} y={0} width={bar} height={H} />
              {day.count > 0 && <path className="viz-bar series-1" d={`M${x},${H} V${H - height + 4} Q${x},${H - height} ${x + 4},${H - height} H${x + bar * 0.6 - 4} Q${x + bar * 0.6},${H - height} ${x + bar * 0.6},${H - height + 4} V${H} Z`} />}
              {(index === peak && day.count > 0) || hover === index ? (
                <text className="viz-value" x={x + bar * 0.3} y={H - height - 6} textAnchor="middle">{day.count}</text>
              ) : null}
              {(narrow ? index % 3 === 0 : index % 2 === 0) && <text className="viz-axis" x={x + bar * 0.3} y={H + 15} textAnchor="middle">{short(day.date)}</text>}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

/** The analysis queue drawn as a FIFO: front (being processed) on the left, newest at the back. */
function QueuePanel({ queue }: { queue: AdminOverview["queue"] }) {
  return (
    <Section title={t.queue} actions={<Pill tone="info">{t.queueMode[queue.mode] ?? queue.mode}</Pill>}>
      <p className="muted small">{t.queueHint}</p>
      {queue.jobs.length === 0 ? <EmptyState title={t.queueEmpty} /> : (
        <div className="queue-strip" role="list">
          <span className="queue-end" aria-hidden="true">{t.queueFront}</span>
          {queue.jobs.map((job, index) => (
            <div key={index} role="listitem" className={`queue-item${job.status === "PROCESSING" ? " is-processing" : ""}`}>
              <small>{job.status === "PROCESSING" ? t.processing : `${t.waiting} · #${job.position ?? index + 1}`}</small>
              <strong>{job.team}</strong>
              <span>{label("analysisMode", job.mode)}</span>
            </div>
          ))}
          <span className="queue-end" aria-hidden="true">{t.queueBack}</span>
        </div>
      )}
    </Section>
  );
}

const ROLE_FILTERS: (Role | "")[] = ["", "COACH", "ANALYST", "ADMINISTRATOR"];

function Users() {
  const [query, setQuery] = useState("");
  const [role, setRole] = useState<Role | "">("");
  const [error, setError] = useState<unknown>(null);
  const [notice, setNotice] = useState("");
  const params = new URLSearchParams();
  if (role) params.set("role", role);
  if (query.trim()) params.set("q", query.trim());
  const users = useLoad(() => api<AdminUser[]>(`/api/admin/users?${params}`), params.toString());

  const update = async (user: AdminUser, body: Record<string, unknown>) => {
    setError(null);
    setNotice("");
    try {
      const saved = await api<AdminUser>(`/api/admin/users/${user.id}`, { method: "PATCH", body: json(body) });
      users.setData((users.data ?? []).map((item) => (item.id === saved.id ? saved : item)));
      setNotice(t.updated);
    } catch (caught) {
      setError(caught);
    }
  };

  return (
    <Section>
      <div className="squad-toolbar">
        <div className="search-box">
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
          <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t.search} aria-label={t.search} maxLength={100} />
        </div>
        <div className="filter-chips" role="group" aria-label={t.role}>
          {ROLE_FILTERS.map((option) => (
            <button key={option || "all"} type="button" className={`chip${role === option ? " selected" : ""}`} aria-pressed={role === option}
              onClick={() => setRole(option)}>{option ? label("role", option) : t.allRoles}</button>
          ))}
        </div>
      </div>
      {notice && <p className="notice" role="status">{notice}</p>}
      <ErrorBanner error={error ?? users.error} />
      {users.loading && !users.data ? <Loading /> : (users.data ?? []).length === 0 ? <EmptyState title={t.noUsers} /> : (
        <div className={`table-wrap${users.loading ? " is-refreshing" : ""}`}>
          <table className="table">
            <thead><tr><th>{t.name}</th><th>{t.role}</th><th>{t.team}</th><th>{t.joined}</th><th>{t.state}</th><th /></tr></thead>
            <tbody>
              {(users.data ?? []).map((user) => {
                const isAdmin = user.role === "ADMINISTRATOR";
                const locked = Boolean(user.team_name);
                return (
                  <tr key={user.id} className={user.is_active === false ? "row-muted" : undefined}>
                    <td>
                      <span className="user-cell">
                        <span className="avatar avatar-sm" aria-hidden="true">{user.first_name[0]}{user.last_name[0]}</span>
                        <span><strong>{user.first_name} {user.last_name}</strong><small>{user.email}</small></span>
                      </span>
                    </td>
                    <td>
                      {isAdmin ? <Pill tone="info">{label("role", user.role)}</Pill> : (
                        <select className="select-sm" value={user.role} disabled={locked} title={locked ? t.roleLocked : undefined}
                          aria-label={`${t.role} · ${user.first_name} ${user.last_name}`}
                          onChange={(e) => void update(user, { role: e.target.value })}>
                          <option value="COACH">{label("role", "COACH")}</option>
                          <option value="ANALYST">{label("role", "ANALYST")}</option>
                        </select>
                      )}
                    </td>
                    <td>{user.team_name ?? <span className="muted">{t.noTeam}</span>}</td>
                    <td className="nowrap">{user.created_at ? formatServerDate(user.created_at) : "—"}</td>
                    <td><Pill tone={user.is_active === false ? "neutral" : "success"}>{user.is_active === false ? t.disabled : t.active}</Pill></td>
                    <td className="cell-actions">
                      {!isAdmin && (user.is_active === false
                        ? <button type="button" className="btn btn-ghost btn-sm" onClick={() => void update(user, { is_active: true })}>{t.activate}</button>
                        : <ConfirmButton label={t.deactivate} confirmLabel={t.deactivateConfirm} onConfirm={() => void update(user, { is_active: false })} />)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Section>
  );
}

function Teams() {
  const teams = useLoad(() => api<AdminTeam[]>("/api/admin/teams"), "admin-teams");
  return (
    <Section>
      <ErrorBanner error={teams.error} onRetry={teams.reload} />
      {teams.loading && !teams.data ? <Loading /> : (teams.data ?? []).length === 0 ? <EmptyState title={t.noTeams} /> : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr><th>{t.team}</th><th>{t.coach}</th><th className="num">{t.analysts}</th><th className="num">{t.players}</th>
                <th className="num">{t.matches}</th><th className="num">{t.analyses}</th><th>{t.created}</th></tr>
            </thead>
            <tbody>
              {(teams.data ?? []).map((team) => (
                <tr key={team.id}>
                  <td>
                    <span className="user-cell">
                      <span className="team-badge" aria-hidden="true">{team.name.split(/\s+/).map((word) => word[0]).slice(0, 2).join("")}</span>
                      <span><strong>{team.name}</strong><small>{[team.category, team.city].filter(Boolean).join(" · ") || "—"}</small></span>
                    </span>
                  </td>
                  <td>{team.coach_name ?? "—"}</td>
                  <td className="num">{team.analysts}</td>
                  <td className="num">{team.players}</td>
                  <td className="num">{team.matches}</td>
                  <td className="num">{team.analyses}</td>
                  <td className="nowrap">{formatServerDate(team.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Section>
  );
}

const SERVICE_TONE: Record<string, Tone> = { OK: "success", CONNECTED: "success", DISCONNECTED: "danger", ERROR: "danger", UNAVAILABLE: "danger" };

function SystemSection() {
  const overview = useOverview();
  const [checkedAt, setCheckedAt] = useState(() => new Date().toISOString());
  const [checking, setChecking] = useState(false);
  if (overview.error && !overview.data) return <ErrorBanner error={overview.error} onRetry={overview.reload} />;
  if (!overview.data) return <Loading />;
  const { system, queue } = overview.data;

  const check = async () => {
    setChecking(true);
    overview.reload();
    await new Promise((resolve) => window.setTimeout(resolve, 600));
    setCheckedAt(new Date().toISOString());
    setChecking(false);
  };

  return (
    <div className="stack">
      <Section title={t.services} actions={
        <button type="button" className="btn btn-ghost btn-sm" disabled={checking} onClick={() => void check()}>{checking ? t.checking : t.check}</button>
      }>
        <div className="service-grid">
          {(["backend", "database", "ai_service"] as const).map((key) => (
            <div key={key} className={`service-card tone-${SERVICE_TONE[system[key]] ?? "neutral"}`}>
              <span className="service-dot" aria-hidden="true" />
              <span className="service-name">{t.service[key]}</span>
              <strong>{t.serviceState[system[key]] ?? system[key]}</strong>
            </div>
          ))}
        </div>
        <p className="muted small">{t.checkedAt(formatTimestamp(checkedAt.replace("Z", "")))}</p>
      </Section>

      <Section title={t.security}>
        <ul className="config-list">
          <li>
            <span>{t.config.environment}</span>
            <Pill tone={system.environment === "production" ? "success" : "warning"}>
              {system.environment === "production" ? t.production : t.development}
            </Pill>
          </li>
          {(["row_level_security", "encrypted_passwords", "api_docs", "simulation_mode"] as const).map((key) => (
            <li key={key}>
              <span>{t.config[key]}</span>
              <Pill tone={system[key] ? (key === "api_docs" || key === "simulation_mode" ? "info" : "success") : "neutral"}>{system[key] ? t.on : t.off}</Pill>
            </li>
          ))}
        </ul>
      </Section>

      <QueuePanel queue={queue} />
    </div>
  );
}
