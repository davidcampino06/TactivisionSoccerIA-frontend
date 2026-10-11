import { useState } from "react";
import { Link } from "react-router";
import { ApiError, api } from "../../api/client";
import { RESULT_TONE } from "../../app/tones";
import { useTeam } from "../../app/teamState";
import TrendChart from "../../components/charts/TrendChart";
import TeamFilter from "../../components/insights/TeamFilter";
import {
  TEAM_GROUPS, countByGroup, deltaFormatter, formatShortDate, groupOf, indicatorName, valueFormatter, type TeamGroup,
} from "../../components/insights/indicators";
import { EmptyState, ErrorBanner, Loading, PageHeader, Pill, Section, type Tone } from "../../components/ui";
import { useLoad } from "../../hooks/useLoad";
import { es } from "../../i18n/es";
import { label } from "../../i18n/labels";
import type { Assessment, Evolution, EvolutionTrend } from "../../types";

const t = es.pages.evolution;
const ti = es.pages.insights;
const LAST_OPTIONS = [3, 5, 8, 10];

const ASSESSMENT_TONE: Record<string, Tone> = { IMPROVING: "success", WORSENING: "danger", STABLE: "neutral", INSUFFICIENT_DATA: "neutral" };
const ASSESSMENT_ICON: Record<string, string> = { IMPROVING: "↗", WORSENING: "↘", STABLE: "→", INSUFFICIENT_DATA: "·" };

function AssessmentPill({ assessment }: { assessment: Assessment }) {
  if (!assessment) return null;
  return (
    <Pill tone={ASSESSMENT_TONE[assessment]}>
      <span aria-hidden="true">{ASSESSMENT_ICON[assessment]}</span> {label("assessment", assessment)}
    </Pill>
  );
}

export default function EvolutionPage() {
  const { team } = useTeam();
  const [last, setLast] = useState(5);
  const [chosenGroup, setGroup] = useState<TeamGroup | null>(null);
  const [asTable, setAsTable] = useState(false);
  const evolution = useLoad(() => api<Evolution>(`/api/teams/${team!.id}/evolution?last=${last}`), `${team!.id}:${last}`);
  const notEnough = evolution.error instanceof ApiError && evolution.error.code === "EVOLUTION_MIN_MATCHES";

  const controls = (
    <label className="field field-inline">
      <span>{t.last}</span>
      <select value={last} onChange={(e) => setLast(Number(e.target.value))}>
        {LAST_OPTIONS.map((n) => <option key={n} value={n}>{t.lastOption(n)}</option>)}
      </select>
    </label>
  );

  return (
    <div className="page">
      <PageHeader eyebrow={t.eyebrow} title={t.title} description={t.description} actions={!notEnough && controls} />

      {notEnough ? (
        <Section><EmptyState title={t.notEnough} body={t.notEnoughBody}
          action={<Link to="/partidos" className="btn btn-ghost btn-sm">{es.pages.comparison.goMatches}</Link>} /></Section>
      ) : evolution.error && !evolution.data ? <ErrorBanner error={evolution.error} onRetry={evolution.reload} />
        : !evolution.data ? <Section><Loading /></Section> : (
          <EvolutionResult data={evolution.data} refreshing={evolution.loading} group={chosenGroup} setGroup={setGroup}
            asTable={asTable} setAsTable={setAsTable} />
        )}
    </div>
  );
}

interface ResultProps {
  data: Evolution;
  refreshing: boolean;
  group: TeamGroup | null;
  setGroup: (group: TeamGroup) => void;
  asTable: boolean;
  setAsTable: (value: boolean) => void;
}

function EvolutionResult({ data, refreshing, group: chosen, setGroup, asTable, setAsTable }: ResultProps) {
  const { matches } = data;
  const counts = countByGroup(data.trends.map((trend) => trend.indicator));
  const group = chosen ?? TEAM_GROUPS.find((item) => counts[item] > 0) ?? "team_a";
  const trends = data.trends.filter((trend) => groupOf(trend.indicator) === group && trend.values.some((value) => value !== null));
  const count = (assessment: Assessment) => trends.filter((trend) => trend.assessment === assessment).length;
  // Worsening first: what the coach should look at.
  const order: Record<string, number> = { WORSENING: 0, IMPROVING: 1, STABLE: 2, INSUFFICIENT_DATA: 3 };
  const sorted = [...trends].sort((a, b) => (order[a.assessment ?? ""] ?? 4) - (order[b.assessment ?? ""] ?? 4));

  return (
    <div className={`stack${refreshing ? " is-refreshing" : ""}`}>
      {data.warnings.length > 0 && (
        <div className="panel panel-warning">
          <ul className="warning-list">{data.warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul>
        </div>
      )}

      <Section title={t.timeline}>
        <ol className="timeline-strip">
          {matches.map((match) => (
            <li key={match.match_id}>
              <Link to={`/partidos/${match.match_id}`} className="timeline-match">
                <small>{formatShortDate(match.match_date)}</small>
                <strong>{ti.vs(match.opponent)}</strong>
                {match.result
                  ? <Pill tone={RESULT_TONE[match.result]}>{label("matchResult", match.result)} {match.home_score}-{match.away_score}</Pill>
                  : <Pill>{label("matchStatus", "SCHEDULED")}</Pill>}
                {match.analysis_mode === "SIMULATION_MODE" && <Pill tone="warning">{ti.simulation}</Pill>}
              </Link>
            </li>
          ))}
        </ol>
      </Section>

      <div className="insights-toolbar">
        <TeamFilter value={group} onChange={setGroup} counts={counts} />
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setAsTable(!asTable)}>
          {asTable ? ti.showCharts : ti.showTable}
        </button>
      </div>

      <div className="assessment-summary" role="status">
        <span className="assessment worsening"><span aria-hidden="true">↘</span> {t.worsening(count("WORSENING"))}</span>
        <span className="assessment improving"><span aria-hidden="true">↗</span> {t.improving(count("IMPROVING"))}</span>
        <span className="assessment stable"><span aria-hidden="true">→</span> {t.stable(count("STABLE"))}</span>
      </div>
      <p className="muted small">{t.trendHint}</p>

      {sorted.length === 0 ? <Section><EmptyState title={t.noIndicators} /></Section> : asTable ? (
        <Section>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>{ti.indicator}</th>
                  {matches.map((match) => <th key={match.match_id} className="num">{formatShortDate(match.match_date)}</th>)}
                  <th>{es.pages.analysis.threshold}</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {sorted.map((trend) => {
                  const format = valueFormatter(trend.unit);
                  return (
                    <tr key={trend.indicator}>
                      <td>{indicatorName(trend.indicator)}</td>
                      {trend.values.map((value, index) => <td key={index} className="num">{value === null ? "—" : format(value)}</td>)}
                      <td className="num">{trend.threshold === null ? "—" : format(trend.threshold)}</td>
                      <td><AssessmentPill assessment={trend.assessment} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Section>
      ) : (
        <div className="chart-grid">
          {sorted.map((trend) => <TrendCard key={trend.indicator} trend={trend} data={data} />)}
        </div>
      )}
    </div>
  );
}

function TrendCard({ trend, data }: { trend: EvolutionTrend; data: Evolution }) {
  const name = indicatorName(trend.indicator);
  return (
    <article className="chart-card">
      <header className="chart-card-head">
        <div>
          <h3>{name}</h3>
          {trend.threshold !== null && <small className="muted">{trend.risk_direction === "above" ? ti.riskAbove : ti.riskBelow}</small>}
        </div>
        <AssessmentPill assessment={trend.assessment} />
      </header>
      <TrendChart title={name} threshold={trend.threshold} riskDirection={trend.risk_direction}
        format={valueFormatter(trend.unit)} formatDelta={deltaFormatter(trend.unit)}
        points={data.matches.map((match, index) => ({
          label: `${ti.vs(match.opponent)} · ${formatShortDate(match.match_date)}`,
          shortLabel: formatShortDate(match.match_date),
          value: trend.values[index],
          delta: index > 0 ? trend.deltas_vs_previous[index - 1] : null,
          status: match.indicators[trend.indicator]?.status ?? null,
        }))} />
    </article>
  );
}
