import { Link } from "react-router";
import { api } from "../../api/client";
import { useTeam } from "../../app/teamState";
import { EVENT_TONE, RESULT_TONE } from "../../app/tones";
import { EmptyState, ErrorBanner, Loading, PageHeader, Pill, Section } from "../../components/ui";
import { useLoad } from "../../hooks/useLoad";
import { es } from "../../i18n/es";
import { formatDate, formatTimestamp, label } from "../../i18n/labels";
import type { Match, Notification } from "../../types";

const t = es.pages.home;


export default function HomePage() {
  const { user, team } = useTeam();
  const matches = useLoad(() => api<Match[]>(`/api/teams/${team!.id}/matches`), team!.id);
  const activity = useLoad(() => api<Notification[]>("/api/notifications"), "notifications");

  const list = [...(matches.data ?? [])].sort((a, b) => b.match_date.localeCompare(a.match_date));
  const played = list.filter((match) => match.status === "PLAYED");
  const count = (result: string) => played.filter((match) => match.result === result).length;
  const next = list.filter((match) => match.status === "SCHEDULED" && new Date(match.match_date) >= new Date())
    .sort((a, b) => a.match_date.localeCompare(b.match_date))[0];

  return (
    <div className="page">
      <PageHeader
        eyebrow={t.eyebrow}
        title={t.greeting(user.first_name)}
        description={t.description}
        actions={<Link to="/partidos?nuevo=1" className="btn btn-primary">{t.newMatch}</Link>}
      />

      <ErrorBanner error={matches.error} onRetry={matches.reload} />

      <div className="stat-grid">
        <div className="stat"><span className="stat-label">{t.statMatches}</span><strong className="stat-value">{list.length}</strong></div>
        <div className="stat"><span className="stat-label">{t.statPlayed}</span><strong className="stat-value">{played.length}</strong></div>
        <div className="stat">
          <span className="stat-label">{t.statRecord}</span>
          <strong className="stat-value">{count("WIN")}-{count("DRAW")}-{count("LOSS")}</strong>
        </div>
        <div className="stat">
          <span className="stat-label">{t.statNext}</span>
          <strong className="stat-value stat-value-sm">
            {next ? <Link to={`/partidos/${next.id}`}>{es.pages.matches.vs} {next.opponent}</Link> : t.noNext}
          </strong>
          {next && <span className="stat-foot">{formatDate(next.match_date)}</span>}
        </div>
      </div>

      <div className="two-columns">
        <Section title={t.recentMatches} actions={<Link to="/partidos" className="btn btn-ghost btn-sm">{t.seeAll}</Link>}>
          {matches.loading ? <Loading /> : list.length === 0 ? (
            <EmptyState title={t.noMatches} body={t.noMatchesBody}
              action={<Link to="/partidos?nuevo=1" className="btn btn-primary btn-sm">{t.newMatch}</Link>} />
          ) : (
            <ul className="row-list">
              {list.slice(0, 5).map((match) => (
                <li key={match.id}>
                  <Link to={`/partidos/${match.id}`} className="row-link">
                    <span className="row-main">
                      <strong>{es.pages.matches.vs} {match.opponent}</strong>
                      <small>{formatDate(match.match_date)} · {match.is_home ? es.pages.matches.home : es.pages.matches.away}</small>
                    </span>
                    {match.result
                      ? <Pill tone={RESULT_TONE[match.result]}>{label("matchResult", match.result)} {match.home_score}-{match.away_score}</Pill>
                      : <Pill>{label("matchStatus", match.status)}</Pill>}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section title={t.activity}>
          {activity.loading ? <Loading /> : (activity.data ?? []).length === 0 ? (
            <EmptyState title={t.noActivity} />
          ) : (
            <ul className="activity">
              {(activity.data ?? []).slice(0, 8).map((event, index) => (
                <li key={`${event.analysis_id}-${event.event}-${index}`}>
                  <Pill tone={EVENT_TONE[event.event] ?? "neutral"}>{label("notification", event.event)}</Pill>
                  <span className="activity-text">
                    <Link to={`/analisis/${event.analysis_id}`}>{event.message}</Link>
                    <small>{formatTimestamp(event.created_at)}</small>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>
    </div>
  );
}
