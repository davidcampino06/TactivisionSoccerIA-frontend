import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { api } from "../../api/client";
import { RESULT_TONE } from "../../app/tones";
import { useTeam } from "../../app/teamState";
import ComparisonBars from "../../components/charts/ComparisonBars";
import TeamFilter from "../../components/insights/TeamFilter";
import {
  TEAM_GROUPS, countByGroup, deltaFormatter, formatShortDate, groupOf, indicatorName, valueFormatter, type TeamGroup,
} from "../../components/insights/indicators";
import { EmptyState, ErrorBanner, Loading, PageHeader, Pill, Section } from "../../components/ui";
import { useLoad } from "../../hooks/useLoad";
import { es } from "../../i18n/es";
import { label } from "../../i18n/labels";
import type { AnalysedMatch, Comparison } from "../../types";

const t = es.pages.comparison;
const ti = es.pages.insights;
const MAX = 4;

export default function ComparisonPage() {
  const { team } = useTeam();
  const [params, setParams] = useSearchParams();
  const [chosenGroup, setGroup] = useState<TeamGroup | null>(null);
  const [asTable, setAsTable] = useState(false);
  const [notice, setNotice] = useState("");
  const analysed = useLoad(() => api<AnalysedMatch[]>(`/api/teams/${team!.id}/analysed-matches`), team!.id);

  // Selection lives in the URL (?partidos=a,b) so a comparison can be shared or reloaded.
  const available = useMemo(() => analysed.data ?? [], [analysed.data]);
  const fromUrl = (params.get("partidos") ?? "").split(",").filter((id) => available.some((match) => match.match_id === id));
  const selected = fromUrl.length > 0 ? fromUrl : available.slice(0, 2).map((match) => match.match_id);
  const key = [...selected].sort().join(",");

  const comparison = useLoad<Comparison | null>(() => {
    if (selected.length < 2) return Promise.resolve(null);
    const query = selected.map((id) => `match_ids=${encodeURIComponent(id)}`).join("&");
    return api<Comparison>(`/api/teams/${team!.id}/comparisons?${query}`);
  }, `${team!.id}:${key}`);

  const toggle = (matchId: string) => {
    setNotice("");
    const next = selected.includes(matchId) ? selected.filter((id) => id !== matchId) : [...selected, matchId];
    if (next.length > MAX) {
      setNotice(t.max(MAX));
      return;
    }
    setParams(next.length ? { partidos: next.join(",") } : {}, { replace: true });
  };

  // Colour slot follows the match (by its position in the picker), never its rank in the chart.
  const slotOf = (matchId: string) => (selected.indexOf(matchId) % MAX) + 1;

  if (analysed.loading && !analysed.data) return <div className="page"><Loading /></div>;

  return (
    <div className="page">
      <PageHeader eyebrow={t.eyebrow} title={t.title} description={t.description} />
      <ErrorBanner error={analysed.error} onRetry={analysed.reload} />

      {available.length === 0 ? (
        <Section><EmptyState title={t.noMatches} body={t.noMatchesBody}
          action={<Link to="/partidos" className="btn btn-ghost btn-sm">{t.goMatches}</Link>} /></Section>
      ) : (
        <>
          <Section title={t.pick}>
            <p className="muted small">{t.pickHint(MAX)}</p>
            <div className="match-picker">
              {available.map((match) => {
                const on = selected.includes(match.match_id);
                return (
                  <button key={match.match_id} type="button" className={`match-chip${on ? " selected" : ""}`} aria-pressed={on}
                    onClick={() => toggle(match.match_id)}>
                    {on && <span className={`swatch series-${slotOf(match.match_id)}`} aria-hidden="true" />}
                    <span className="match-chip-text">
                      <strong>{ti.vs(match.opponent)}</strong>
                      <small>{formatShortDate(match.match_date)}{match.analysis_mode === "SIMULATION_MODE" ? ` · ${ti.simulation}` : ""}</small>
                    </span>
                  </button>
                );
              })}
            </div>
            {notice && <p className="notice" role="status">{notice}</p>}
          </Section>

          {selected.length < 2 ? <Section><EmptyState title={t.needTwo} /></Section> : (
            <ComparisonResult comparison={comparison.data} loading={comparison.loading} error={comparison.error}
              onRetry={comparison.reload} group={chosenGroup} setGroup={setGroup} asTable={asTable} setAsTable={setAsTable} slotOf={slotOf} />
          )}
        </>
      )}
    </div>
  );
}

interface ResultProps {
  comparison: Comparison | null;
  loading: boolean;
  error: unknown;
  onRetry: () => void;
  group: TeamGroup | null;
  setGroup: (group: TeamGroup) => void;
  asTable: boolean;
  setAsTable: (value: boolean) => void;
  slotOf: (matchId: string) => number;
}

function ComparisonResult({ comparison, loading, error, onRetry, group: chosen, setGroup, asTable, setAsTable, slotOf }: ResultProps) {
  if (error && !comparison) return <ErrorBanner error={error} onRetry={onRetry} />;
  if (!comparison) return <Section><Loading /></Section>;

  const counts = countByGroup(comparison.indicators.map((row) => row.indicator));
  // Until the user picks one, show the first team that has indicators (a clip may only show one team).
  const group = chosen ?? TEAM_GROUPS.find((item) => counts[item] > 0) ?? "team_a";
  const rows = comparison.indicators.filter((row) => groupOf(row.indicator) === group && row.values.some((value) => value !== null));
  const matches = comparison.matches;

  return (
    <div className={`stack${loading ? " is-refreshing" : ""}`}>
      {comparison.warnings.length > 0 && (
        <div className="panel panel-warning">
          <ul className="warning-list">{comparison.warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul>
        </div>
      )}

      <Section title={t.summary}>
        <div className="snapshot-grid">
          {matches.map((match) => (
            <div key={match.match_id} className="snapshot">
              <span className={`swatch series-${slotOf(match.match_id)}`} aria-hidden="true" />
              <div className="snapshot-body">
                <Link to={`/partidos/${match.match_id}`} className="table-link">{ti.vs(match.opponent)}</Link>
                <small>{formatShortDate(match.match_date)}</small>
                <div className="snapshot-pills">
                  {match.result && (
                    <Pill tone={RESULT_TONE[match.result]}>{label("matchResult", match.result)} {match.home_score}-{match.away_score}</Pill>
                  )}
                  {match.analysis_mode === "SIMULATION_MODE" && <Pill tone="warning">{ti.simulation}</Pill>}
                  <Pill>{ti.issues(match.possible_issues)}</Pill>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Section>

      <div className="insights-toolbar">
        <TeamFilter value={group} onChange={setGroup} counts={counts} />
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setAsTable(!asTable)}>
          {asTable ? ti.showCharts : ti.showTable}
        </button>
      </div>

      <div className="chart-legend" aria-label={t.legend}>
        {matches.map((match) => (
          <span key={match.match_id}><span className={`swatch series-${slotOf(match.match_id)}`} aria-hidden="true" />{ti.vs(match.opponent)} · {formatShortDate(match.match_date)}</span>
        ))}
      </div>

      {rows.length === 0 ? <Section><EmptyState title={t.noIndicators} /></Section> : asTable ? (
        <Section>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>{ti.indicator}</th>
                  {matches.map((match) => <th key={match.match_id} className="num">{ti.vs(match.opponent)}</th>)}
                  <th className="num">{ti.threshold}</th>
                  <th className="num">{t.difference}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const format = valueFormatter(row.unit);
                  return (
                    <tr key={row.indicator}>
                      <td>{indicatorName(row.indicator)}</td>
                      {row.values.map((value, index) => (
                        <td key={index} className="num">
                          {value === null ? "—" : format(value)}
                          {row.statuses[index] === "EXCEEDS" && <span className="flag-inline" title={ti.exceeds}> ⚠</span>}
                        </td>
                      ))}
                      <td className="num">{row.threshold === null ? "—" : format(row.threshold)}</td>
                      <td className="num">{row.difference_last_vs_first === null ? "—" : deltaFormatter(row.unit)(row.difference_last_vs_first)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Section>
      ) : (
        <div className="chart-grid">
          {rows.map((row) => (
            <article key={row.indicator} className="chart-card">
              <header>
                <h3>{indicatorName(row.indicator)}</h3>
                {row.threshold !== null && <small className="muted">{row.risk_direction === "above" ? ti.riskAbove : ti.riskBelow}</small>}
              </header>
              <ComparisonBars title={indicatorName(row.indicator)} threshold={row.threshold} riskDirection={row.risk_direction}
                format={valueFormatter(row.unit)}
                bars={matches.map((match, index) => ({
                  label: ti.vs(match.opponent), slot: slotOf(match.match_id), value: row.values[index], status: row.statuses[index],
                }))} />
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
