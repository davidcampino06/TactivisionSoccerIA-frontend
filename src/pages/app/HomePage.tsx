import { useMemo, useRef, useState, type ReactNode } from "react";
import { Link } from "react-router";
import { api } from "../../api/client";
import { EVENT_TONE, PLAYER_STATUS_TONE, RESULT_TONE } from "../../app/tones";
import { useTeam } from "../../app/teamState";
import TrendChart from "../../components/charts/TrendChart";
import Countdown from "../../components/dashboard/Countdown";
import Donut from "../../components/dashboard/Donut";
import Gauge from "../../components/dashboard/Gauge";
import ThresholdBars, { type ThresholdBar } from "../../components/dashboard/ThresholdBars";
import {
  countByGroup, deltaFormatter, formatShortDate, groupOf, indicatorName, isRisky, valueFormatter, TEAM_GROUPS,
} from "../../components/insights/indicators";
import Pitch from "../../components/tactics/Pitch";
import { fromConfiguration } from "../../components/tactics/board";
import { availabilitySummary, isUnavailable } from "../../components/players/availability";
import { Pill } from "../../components/ui";
import { useLoad } from "../../hooks/useLoad";
import { es } from "../../i18n/es";
import { formatDateTime, formatTimestamp, label } from "../../i18n/labels";
import type {
  AnalysedMatch, AnalysisResult, Evolution, EvolutionTrend, Match, Notification, Player, ReviewQueue, TacticalPlaySummary,
} from "../../types";

const t = es.pages.home;
/** Next match: a stadium at night (public/backdrop). The analysed videos keep the project photos. */
const MATCH_NIGHT = "/backdrop/noche-tribuna-llena.webp";
const PHOTOS = ["/hero/01-deteccion.jpg", "/hero/02-seguimiento.jpg", "/hero/03-contexto.jpg", "/hero/04-recomendacion.jpg"];
const KEY_INDICATORS = ["team_width", "defensive_midfield_distance", "team_compactness_area", "average_player_distance", "max_zone_concentration", "defensive_line_position"];

interface PendingReviews {
  total: number;
  high: number;
  matches: { match_id: string; opponent: string; match_date: string; open: number; high: number; unreviewed: number }[];
}

function Card({ className = "", title, action, children }: { className?: string; title?: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className={`glass dash-card ${className}`}>
      {(title || action) && (
        <header className="dash-card-head">
          {title && <h2>{title}</h2>}
          {action}
        </header>
      )}
      {children}
    </section>
  );
}

export default function HomePage() {
  const { user, team } = useTeam();
  const id = team!.id;
  const matches = useLoad(() => api<Match[]>(`/api/teams/${id}/matches`), id);
  const analysed = useLoad(() => api<AnalysedMatch[]>(`/api/teams/${id}/analysed-matches`), id);
  const pending = useLoad(() => api<PendingReviews>(`/api/teams/${id}/pending-reviews`), id);
  const queue = useLoad(() => api<ReviewQueue>(`/api/teams/${id}/review-queue?limit=3`), id);
  const evolution = useLoad(() => api<Evolution>(`/api/teams/${id}/evolution?last=5`), id);
  const players = useLoad(() => api<Player[]>(`/api/teams/${id}/players`), id);
  const plays = useLoad(() => api<TacticalPlaySummary[]>(`/api/teams/${id}/tactical-plays`), id);
  const activity = useLoad(() => api<Notification[]>("/api/notifications"), "notifications");
  const latestAnalysisId = analysed.data?.[0]?.analysis_id ?? null;
  const latest = useLoad<AnalysisResult | null>(
    () => (latestAnalysisId ? api<AnalysisResult>(`/api/analyses/${latestAnalysisId}/result`) : Promise.resolve(null)),
    latestAnalysisId ?? "none",
  );

  const [openedAt] = useState(() => Date.now()); // fixed "now" for this visit (render must stay pure)
  const all = useMemo(() => [...(matches.data ?? [])].sort((a, b) => a.match_date.localeCompare(b.match_date)), [matches.data]);
  const played = all.filter((match) => match.result);
  const next = all.find((match) => match.status === "SCHEDULED" && new Date(match.match_date).getTime() > openedAt - 2 * 3600_000);
  const last = played[played.length - 1];
  const wins = played.filter((match) => match.result === "WIN").length;
  const draws = played.filter((match) => match.result === "DRAW").length;
  const goalsFor = played.reduce((sum, match) => sum + (match.home_score ?? 0), 0);
  const goalsAgainst = played.reduce((sum, match) => sum + (match.away_score ?? 0), 0);
  const pointsShare = played.length ? (3 * wins + draws) / (3 * played.length) : 0;
  const analysisOf = new Map((analysed.data ?? []).map((item) => [item.match_id, item.analysis_id]));

  return (
    <>
      <div className="dash-backdrop" aria-hidden="true" />
      <div className="page dashboard">
        <header className="dash-top">
          <div>
            <p className="page-eyebrow">{t.eyebrow}</p>
            <h1 className="dash-title">{t.greeting(user.first_name)}</h1>
          </div>
          <nav className="dash-quick" aria-label={t.eyebrow}>
            <Link to="/partidos?nuevo=1" className="btn btn-primary btn-sm">{t.quick.match}</Link>
            <Link to="/diseno-tactico?nuevo=1" className="btn btn-glass btn-sm">{t.quick.play}</Link>
            <Link to="/reportes?nuevo=1" className="btn btn-glass btn-sm">{t.quick.report}</Link>
            <Link to="/comparacion" className="btn btn-glass btn-sm">{t.quick.compare}</Link>
          </nav>
        </header>

        <div className="dash-grid">
          <HeroCard next={next} teamName={team!.name} played={played.length} pointsShare={pointsShare}
            goals={`${goalsFor} · ${goalsAgainst}`} openIssues={pending.data?.total ?? 0} />

          <Card className="dash-score" title={t.lastResult}>
            {last ? (
              <Link to={`/partidos/${last.id}`} className="scoreboard">
                <span className="scoreboard-team">{team!.name}</span>
                <span className="scoreboard-score">{last.home_score}<i>:</i>{last.away_score}</span>
                <span className="scoreboard-team is-rival">{last.opponent}</span>
                <span className="scoreboard-meta">
                  <Pill tone={RESULT_TONE[last.result ?? ""]}>{label("matchResult", last.result)}</Pill>
                  <small>{formatShortDate(last.match_date)} · {last.is_home ? es.pages.matches.home : es.pages.matches.away}</small>
                </span>
              </Link>
            ) : <p className="muted">{t.noResult}</p>}
            {played.length > 0 && (
              <div className="form-row">
                <Donut value={pointsShare} caption={t.pointsShare} label={t.points} />
                <div className="form-guide">
                  <p className="dash-label">{t.form}</p>
                  <ol>
                    {played.slice(-5).map((match) => (
                      <li key={match.id} className={`form-chip form-${(match.result ?? "").toLowerCase()}`}
                        title={`vs ${match.opponent} ${match.home_score}-${match.away_score}`}>
                        {label("matchResult", match.result).charAt(0)}
                      </li>
                    ))}
                  </ol>
                </div>
              </div>
            )}
          </Card>

          <HealthCard result={latest.data ?? null} />

          <PulseCard evolution={evolution.data ?? null} />
          <ProfileCard result={latest.data ?? null} />
          <PendingCard data={pending.data ?? null} queue={queue.data ?? null} analysisOf={analysisOf} />

          <AnalysesCard analysed={analysed.data ?? []} pending={pending.data ?? null} />
          <PlayCard play={plays.data?.[0] ?? null} />

          <SquadCard players={players.data ?? []} />
          <Card className="dash-activity" title={t.activity}>
            {(activity.data ?? []).length === 0 ? <p className="muted">{t.noActivity}</p> : (
              <ul className="activity dash-activity-list">
                {(activity.data ?? []).slice(0, 6).map((item) => (
                  <li key={item.id}>
                    <Pill tone={EVENT_TONE[item.event]}>{label("notification", item.event)}</Pill>
                    <span className="activity-text">
                      {item.message}
                      <small>{formatTimestamp(item.created_at)}</small>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <CalendarStrip matches={all} teamName={team!.name} nextId={next?.id} />
        </div>
      </div>
    </>
  );
}

function HeroCard({ next, teamName, played, pointsShare, goals, openIssues }:
  { next?: Match; teamName: string; played: number; pointsShare: number; goals: string; openIssues: number }) {
  const stats = [
    { value: String(played), label: t.played },
    { value: `${Math.round(pointsShare * 100)} %`, label: t.points },
    { value: goals, label: t.goals },
    { value: String(openIssues), label: t.openIssues, highlight: openIssues > 0 },
  ];
  return (
    <section className="dash-hero">
      <img className="dash-hero-photo" src={MATCH_NIGHT} alt="" />
      <div className="dash-hero-body">
        <p className="dash-label">{t.nextMatch}</p>
        {next ? (
          <>
            <h2 className="dash-hero-title"><span>{teamName}</span> vs {next.opponent}</h2>
            <p className="dash-hero-meta">{formatDateTime(next.match_date)} · {next.is_home ? es.pages.matches.home : es.pages.matches.away}{next.location ? ` · ${next.location}` : ""}</p>
            <div className="dash-hero-countdown">
              <span className="dash-label">{t.kickoffIn}</span>
              <Countdown to={next.match_date} />
            </div>
            <div className="dash-hero-actions">
              <Link to={`/partidos/${next.id}`} className="btn btn-primary">{t.prepare}</Link>
              <Link to="/diseno-tactico" className="btn btn-glass">{t.openBoard}</Link>
            </div>
          </>
        ) : (
          <>
            <h2 className="dash-hero-title">{t.noNext}</h2>
            <p className="dash-hero-meta">{t.noNextBody}</p>
            <div className="dash-hero-actions"><Link to="/partidos?nuevo=1" className="btn btn-primary">{t.newMatch}</Link></div>
          </>
        )}
      </div>
      <dl className="dash-hero-stats glass">
        {stats.map((stat) => (
          <div key={stat.label} className={stat.highlight ? "is-highlight" : undefined}>
            <dd>{stat.value}</dd>
            <dt>{stat.label}</dt>
          </div>
        ))}
      </dl>
    </section>
  );
}

/** Share of thresholded indicators of the latest analysis that are on the safe side. */
function HealthCard({ result }: { result: AnalysisResult | null }) {
  const withThreshold = (result?.indicators ?? []).filter((indicator) => indicator.threshold !== null);
  const safe = withThreshold.filter((indicator) => !isRisky(indicator.name, indicator.value, indicator.threshold));
  const score = withThreshold.length ? (safe.length / withThreshold.length) * 100 : 0;
  return (
    <Card className="dash-health" title={t.health}>
      {withThreshold.length === 0 ? <p className="muted">{t.healthEmpty}</p> : (
        <>
          <Gauge value={score} label={t.health} />
          <p className="dash-center muted small">{t.healthBody(safe.length, withThreshold.length)}</p>
          {result?.analysis.analysis_mode === "SIMULATION_MODE" && <p className="dash-center"><Pill tone="warning">{es.pages.insights.simulation}</Pill></p>}
        </>
      )}
    </Card>
  );
}

function PulseCard({ evolution }: { evolution: Evolution | null }) {
  const candidates = useMemo(() => {
    if (!evolution) return [];
    const order: Record<string, number> = { WORSENING: 0, IMPROVING: 1, STABLE: 2 };
    return [...evolution.trends]
      .filter((trend) => trend.threshold !== null && trend.values.filter((value) => value !== null).length >= 2)
      .sort((a, b) => (order[a.assessment ?? ""] ?? 3) - (order[b.assessment ?? ""] ?? 3) || Math.abs(b.slope ?? 0) - Math.abs(a.slope ?? 0))
      .slice(0, 3);
  }, [evolution]);
  const [selected, setSelected] = useState(0);
  const trend: EvolutionTrend | undefined = candidates[Math.min(selected, candidates.length - 1)];

  return (
    <Card className="dash-pulse" title={t.pulse} action={<Link to="/evolucion" className="btn btn-glass btn-sm">{t.seeAll}</Link>}>
      {!evolution || !trend ? <p className="muted">{t.pulseEmpty}</p> : (
        <>
          <div className="filter-chips">
            {candidates.map((item, index) => (
              <button key={item.indicator} type="button" className={`chip chip-sm${index === selected ? " selected" : ""}`}
                aria-pressed={index === selected} onClick={() => setSelected(index)}>
                {indicatorName(item.indicator)}
                {item.assessment === "WORSENING" && <span className="chip-flag" aria-hidden="true"> ↘</span>}
                {item.assessment === "IMPROVING" && <span className="chip-good" aria-hidden="true"> ↗</span>}
              </button>
            ))}
          </div>
          <TrendChart title={indicatorName(trend.indicator)} threshold={trend.threshold} riskDirection={trend.risk_direction}
            format={valueFormatter(trend.unit)} formatDelta={deltaFormatter(trend.unit)}
            points={evolution.matches.map((match, index) => ({
              label: `vs ${match.opponent} · ${formatShortDate(match.match_date)}`,
              shortLabel: formatShortDate(match.match_date),
              value: trend.values[index],
              delta: index > 0 ? trend.deltas_vs_previous[index - 1] : null,
              status: match.indicators[trend.indicator]?.status ?? null,
            }))} />
          <p className="small">
            {es.pages.insights.teams[groupOf(trend.indicator)]} ·{" "}
            <strong className={trend.assessment === "WORSENING" ? "text-danger" : trend.assessment === "IMPROVING" ? "text-success" : undefined}>
              {trend.assessment ? label("assessment", trend.assessment) : label("trend", trend.trend)}
            </strong>
          </p>
        </>
      )}
    </Card>
  );
}

function ProfileCard({ result }: { result: AnalysisResult | null }) {
  const indicators = result?.indicators ?? [];
  const counts = countByGroup(indicators.map((indicator) => indicator.name));
  const group = TEAM_GROUPS.find((item) => item !== "match" && counts[item] > 0);
  const bars: ThresholdBar[] = KEY_INDICATORS.flatMap((key) => {
    const indicator = indicators.find((item) => item.name === `${group}.${key}`);
    if (!indicator) return [];
    return [{
      label: indicatorName(indicator.name), value: indicator.value, threshold: indicator.threshold,
      risky: isRisky(indicator.name, indicator.value, indicator.threshold), text: valueFormatter(indicator.unit)(indicator.value),
    }];
  }).slice(0, 4);
  return (
    <Card className="dash-profile" title={t.profile}
      action={result && <Link to={`/analisis/${result.analysis.id}`} className="btn btn-glass btn-sm">{t.view}</Link>}>
      {bars.length === 0 ? <p className="muted">{t.healthEmpty}</p> : (
        <>
          {group && <p className="dash-label">{es.pages.insights.teams[group]}</p>}
          <ThresholdBars bars={bars} />
          <p className="muted small">{t.profileHint}</p>
        </>
      )}
    </Card>
  );
}

function PendingCard({ data, queue, analysisOf }:
  { data: PendingReviews | null; queue: ReviewQueue | null; analysisOf: Map<string, string> }) {
  return (
    <Card className="dash-pending" title={t.pending}>
      {!data || data.total === 0 ? (
        <div className="pending-clear">
          <span className="pending-check" aria-hidden="true">✓</span>
          <strong>{t.allReviewed}</strong>
          <p className="muted small">{t.pendingNone}</p>
        </div>
      ) : (
        <>
          <p className="pending-total"><strong>{data.total}</strong> {t.pendingBody(data.total)}</p>
          {data.high > 0 && <p><Pill tone="danger">{t.pendingHigh(data.high)}</Pill></p>}
          {(queue?.items ?? []).length > 0 && (
            <>
              <p className="urgent-title" title={t.urgentHint}>{t.urgentFirst}</p>
              <ol className="urgent-list">
                {queue!.items.map((item) => {
                  const analysisId = item.analysis_id ?? analysisOf.get(item.match_id);
                  return (
                    <li key={item.id}>
                      <Link to={analysisId ? `/analisis/${analysisId}` : `/partidos/${item.match_id}`}
                        className={`urgent-item severity-${item.severity.toLowerCase()}`} aria-label={t.openReview(item.title)}>
                        <span className="urgent-rank" aria-hidden="true">{item.rank}</span>
                        <span className="urgent-text">
                          <strong>{item.title}</strong>
                          <small>vs {item.opponent} · {formatShortDate(item.match_date)} · {Math.round(item.confidence * 100)} %</small>
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ol>
            </>
          )}
        </>
      )}
    </Card>
  );
}

function AnalysesCard({ analysed, pending }: { analysed: AnalysedMatch[]; pending: PendingReviews | null }) {
  const openOf = new Map((pending?.matches ?? []).map((match) => [match.match_id, match.open]));
  return (
    <Card className="dash-analyses" title={t.analyses} action={<Link to="/partidos" className="btn btn-glass btn-sm">{t.seeAll}</Link>}>
      {analysed.length === 0 ? <p className="muted">{t.analysesEmpty}</p> : (
        <ul className="analysis-rows">
          {analysed.slice(0, 4).map((item, index) => (
            <li key={item.analysis_id}>
              <Link to={`/analisis/${item.analysis_id}`} className="analysis-row">
                <span className="analysis-thumb" style={{ backgroundImage: `url(${PHOTOS[index % PHOTOS.length]})` }} aria-hidden="true">
                  <span className="analysis-play">▶</span>
                </span>
                <span className="analysis-main">
                  <strong>vs {item.opponent}</strong>
                  <small>{formatShortDate(item.match_date)}{item.result ? ` · ${label("matchResult", item.result)}` : ""}</small>
                </span>
                <span className="analysis-mode">
                  <i className={item.analysis_mode === "SIMULATION_MODE" ? "dot dot-warn" : "dot dot-ok"} aria-hidden="true" />
                  {label("analysisMode", item.analysis_mode)}
                </span>
                <span className="analysis-issues">
                  <strong>{openOf.get(item.match_id) ?? 0}</strong>
                  <small>{t.issuesCol}</small>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function PlayCard({ play }: { play: TacticalPlaySummary | null }) {
  return (
    <Card className="dash-play" title={t.latestPlay}
      action={<Link to={play ? `/diseno-tactico/${play.id}` : "/diseno-tactico?nuevo=1"} className="btn btn-glass btn-sm">{play ? t.view : t.newPlay}</Link>}>
      {!play ? <p className="muted">{t.latestPlayEmpty}</p> : (
        <Link to={`/diseno-tactico/${play.id}`} className="stadium">
          <div className="stadium-pitch">
            <Pitch board={fromConfiguration(play.configuration)} tool="select" selectedId={null} compact readOnly ariaLabel={play.name} />
          </div>
          <div className="stadium-caption">
            <strong>{play.name}</strong>
            <small>
              {play.action_type ? label("actionType", play.action_type) : ""}
              {(play.configuration as { formation?: string }).formation ? ` · ${(play.configuration as { formation?: string }).formation}` : ""}
            </small>
          </div>
        </Link>
      )}
    </Card>
  );
}

function SquadCard({ players }: { players: Player[] }) {
  const available = players.filter((player) => player.status === "ACTIVE");
  const out = players.filter(isUnavailable);
  return (
    <Card className="dash-squad" title={t.squad} action={<Link to="/jugadores" className="btn btn-glass btn-sm">{t.seeAll}</Link>}>
      {players.length === 0 ? <p className="muted">{t.squadEmpty}</p> : (
        <>
          <div className="squad-split">
            <div><strong>{available.length}</strong><small>{t.available}</small></div>
            <div className={out.length ? "is-out" : undefined}><strong>{out.length}</strong><small>{t.unavailable}</small></div>
          </div>
          <div className="squad-bar" role="img" aria-label={`${available.length} ${t.available}, ${out.length} ${t.unavailable}`}>
            <span style={{ flex: available.length }} />
            {out.length > 0 && <span className="is-out" style={{ flex: out.length }} />}
          </div>
          {out.length > 0 && (
            <ul className="squad-out">
              {out.map((player) => (
                <li key={player.id} title={availabilitySummary(player)}>
                  <Link to={`/jugadores/${player.id}`}>{player.shirt_number !== null ? `${player.shirt_number} · ` : ""}{player.first_name} {player.last_name}</Link>
                  <Pill tone={PLAYER_STATUS_TONE[player.status]}>{label("playerStatus", player.status)}</Pill>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </Card>
  );
}

function CalendarStrip({ matches, teamName, nextId }: { matches: Match[]; teamName: string; nextId?: string }) {
  const scroller = useRef<HTMLOListElement>(null);
  const scroll = (direction: number) => scroller.current?.scrollBy({ left: direction * 320, behavior: "smooth" });
  return (
    <Card className="dash-calendar" title={t.calendar}
      action={matches.length > 0 && (
        <span className="calendar-arrows">
          <button type="button" className="btn btn-glass btn-sm" aria-label={t.previous} onClick={() => scroll(-1)}>‹</button>
          <button type="button" className="btn btn-glass btn-sm" aria-label={t.next} onClick={() => scroll(1)}>›</button>
        </span>
      )}>
      {matches.length === 0 ? <p className="muted">{t.calendarEmpty}</p> : (
        <ol className="fixtures" ref={(node) => {
          scroller.current = node;
          // Start with the next match in view.
          const current = node?.querySelector<HTMLElement>(".is-next");
          if (node && current && !node.dataset.positioned) {
            node.scrollLeft = Math.max(0, current.offsetLeft - node.offsetLeft - (node.clientWidth - current.offsetWidth) / 2);
            node.dataset.positioned = "1";
          }
        }}>
          {matches.map((match) => (
            <li key={match.id} className={match.id === nextId ? "is-next" : undefined}>
              <Link to={`/partidos/${match.id}`} className="fixture">
                <small>{formatShortDate(match.match_date)} · {match.is_home ? es.pages.matches.home : es.pages.matches.away}</small>
                <span className="fixture-teams">
                  <span>{teamName}</span>
                  {match.result
                    ? <strong className={`fixture-score score-${match.result.toLowerCase()}`}>{match.home_score}-{match.away_score}</strong>
                    : <strong className="fixture-score">vs</strong>}
                  <span>{match.opponent}</span>
                </span>
              </Link>
            </li>
          ))}
        </ol>
      )}
    </Card>
  );
}
