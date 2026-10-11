import { useState, type ReactNode } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { api, download } from "../../api/client";
import { RECOMMENDATION_TONE, RESULT_TONE, SEVERITY_TONE } from "../../app/tones";
import { useTeam } from "../../app/teamState";
import { formatShortDate, valueFormatter } from "../../components/insights/indicators";
import { ConfirmButton, EmptyState, ErrorBanner, Loading, PageHeader, Pill } from "../../components/ui";
import { useLoad } from "../../hooks/useLoad";
import { es } from "../../i18n/es";
import { formatDateTime, formatIndicatorValue, formatPercent, formatTimestamp, indicatorLabel, label } from "../../i18n/labels";
import type { ReportDetail, ReportSnapshot } from "../../types";

const t = es.pages.report;
const FORMATS = [
  { id: "pdf", label: "PDF" },
  { id: "csv", label: "CSV" },
  { id: "json", label: "JSON" },
] as const;
const FILE_TYPE: Record<string, string> = { MATCH: "partido", VIDEO_ANALYSIS: "analisis", TEAM_EVOLUTION: "evolucion" };

export default function ReportDetailPage() {
  const { reportId = "" } = useParams();
  const navigate = useNavigate();
  const { isCoach } = useTeam();
  const report = useLoad(() => api<ReportDetail>(`/api/reports/${reportId}`), reportId);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<unknown>(null);

  if (report.error && !report.data) return <div className="page"><BackLink /><ErrorBanner error={report.error} /></div>;
  if (!report.data) return <div className="page"><Loading /></div>;
  const data = report.data;
  const snapshot = data.snapshot;

  const exportAs = async (format: string) => {
    setBusy(format);
    setError(null);
    try {
      await download(`/api/reports/${data.id}/export?format=${format}`,
        t.fileName(FILE_TYPE[data.report_type] ?? "tactivision", data.version, format));
    } catch (caught) {
      setError(caught);
    } finally {
      setBusy(null);
    }
  };

  const remove = async () => {
    try {
      await api(`/api/reports/${data.id}`, { method: "DELETE" });
      navigate("/reportes");
    } catch (caught) {
      setError(caught);
    }
  };

  return (
    <div className="page">
      <BackLink />
      <PageHeader eyebrow={`${label("reportType", data.report_type)} · ${es.pages.reports.version(data.version)}`} title={data.title}
        actions={
          <div className="export-actions" role="group" aria-label={t.export}>
            {FORMATS.map((format, index) => (
              <button key={format.id} type="button" className={`btn btn-sm ${index === 0 ? "btn-primary" : "btn-ghost"}`}
                disabled={busy !== null} onClick={() => void exportAs(format.id)}>
                {busy === format.id ? t.downloading : t.exportAs(format.label)}
              </button>
            ))}
          </div>
        } />
      <ErrorBanner error={error} />

      <article className="report-document">
        <Facts items={[
          [t.team, snapshot.team?.name],
          [t.generatedBy, snapshot.generated_by],
          [t.generatedAt, formatTimestamp(snapshot.generated_at)],
        ]} />
        {(snapshot.warnings ?? []).map((warning) => <p key={warning} className="report-notice">{warning}</p>)}
        {snapshot.report_type === "TEAM_EVOLUTION" ? <EvolutionBody snapshot={snapshot} /> : <MatchBody snapshot={snapshot} />}
      </article>

      {isCoach && (
        <div className="report-footer">
          <ConfirmButton label={t.delete} confirmLabel={t.deleteConfirm} onConfirm={() => void remove()} />
        </div>
      )}
    </div>
  );
}

/** Event codes are free text: translate the common ones, keep anything typed by hand. */
const eventLabel = (code: string | null) => (code ? es.labels.event[code.toUpperCase()] ?? code : "—");

function BackLink() {
  return <Link to="/reportes" className="back-link">← {t.back}</Link>;
}

function Facts({ items }: { items: [string, ReactNode][] }) {
  return (
    <dl className="facts report-facts">
      {items.map(([key, value]) => <div key={key}><dt>{key}</dt><dd>{value ?? "—"}</dd></div>)}
    </dl>
  );
}

function ReportSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="report-section">
      <h2>{title}</h2>
      {children}
    </section>
  );
}

function MatchBody({ snapshot }: { snapshot: ReportSnapshot }) {
  const { match, analysis } = snapshot;
  const simulated = analysis?.label === "SIMULATION MODE";
  const recommendations = new Map((snapshot.ai_recommendations ?? []).map((item) => [item.issue, item.recommendation]));
  const issues = snapshot.possible_issues ?? [];
  const indicators = [...(snapshot.tactical_indicators ?? [])].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <>
      {match && (
        <ReportSection title={t.match}>
          <Facts items={[
            [t.opponent, match.opponent],
            [t.date, formatDateTime(match.date)],
            [t.venue, match.is_home ? es.pages.matches.home : es.pages.matches.away],
            [t.score, match.score
              ? <span key="score">{match.score} {match.result && <Pill tone={RESULT_TONE[match.result]}>{label("matchResult", match.result)}</Pill>}</span>
              : t.noScore],
          ]} />
        </ReportSection>
      )}

      {(snapshot.events ?? []).length > 0 && (
        <ReportSection title={t.events}>
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>{t.minute}</th><th>{t.event}</th><th>{t.zone}</th><th>{t.result}</th></tr></thead>
              <tbody>
                {(snapshot.events ?? []).map((event, index) => (
                  <tr key={index}>
                    <td>{event.minute}'</td><td>{eventLabel(event.type)}</td><td>{eventLabel(event.zone)}</td><td>{eventLabel(event.result)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ReportSection>
      )}

      {analysis && (
        <ReportSection title={t.analysis}>
          <Facts items={[
            [t.mode, <Pill key="mode" tone={simulated ? "warning" : "success"}>{label("analysisMode", simulated ? "SIMULATION_MODE" : "REAL_VIDEO_ANALYSIS")}</Pill>],
            [t.model, simulated ? t.simulatedModel : `${analysis.model ?? "—"} ${analysis.model_version ?? ""}`],
            [t.completed, analysis.completed_at ? formatTimestamp(analysis.completed_at) : "—"],
          ]} />
          {simulated && <p className="report-notice">{es.pages.analysis.simulatedModel}</p>}
        </ReportSection>
      )}

      {analysis && (
        <ReportSection title={t.issues}>
          {issues.length === 0 ? <p className="muted">{t.noIssues}</p> : (
            <div className="issue-list">
              {issues.map((issue) => (
                <article key={issue.issue} className={`issue issue-${issue.severity.toLowerCase()}`}>
                  <div className="issue-head">
                    <h3>{issue.issue}</h3>
                    <div className="issue-pills">
                      <Pill tone={SEVERITY_TONE[issue.severity]}>{es.pages.analysis.severity} {label("severity", issue.severity).toLowerCase()}</Pill>
                      <Pill tone={RECOMMENDATION_TONE[issue.status]}>{label("recommendationStatus", issue.status)}</Pill>
                    </div>
                  </div>
                  <p className="muted small">{es.pages.analysis.confidence}: {formatPercent(issue.confidence)}</p>
                  <p><span className="issue-label">{es.pages.analysis.evidence}:</span> {issue.evidence}</p>
                  {recommendations.get(issue.issue) && (
                    <p><span className="issue-label">{es.pages.analysis.recommendation}:</span> {recommendations.get(issue.issue)}</p>
                  )}
                </article>
              ))}
            </div>
          )}
        </ReportSection>
      )}

      {indicators.length > 0 && (
        <ReportSection title={t.indicators}>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr><th>{es.pages.analysis.indicator}</th><th>{es.pages.analysis.team}</th><th className="num">{es.pages.analysis.value}</th><th className="num">{es.pages.analysis.threshold}</th></tr>
              </thead>
              <tbody>
                {indicators.map((indicator) => {
                  const { name, team } = indicatorLabel(indicator.name);
                  return (
                    <tr key={indicator.name}>
                      <td>{name}</td>
                      <td>{team || es.pages.insights.teams.match}</td>
                      <td className="num">{formatIndicatorValue(indicator.value, indicator.unit)}</td>
                      <td className="num">{indicator.threshold === null ? "—" : formatIndicatorValue(indicator.threshold, indicator.unit, false)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </ReportSection>
      )}
    </>
  );
}

function EvolutionBody({ snapshot }: { snapshot: ReportSnapshot }) {
  const evolution = snapshot.team_evolution;
  if (!evolution) return <EmptyState title={es.pages.evolution.notEnough} />;
  const order: Record<string, number> = { WORSENING: 0, IMPROVING: 1, STABLE: 2 };
  const trends = [...evolution.trends].sort((a, b) => (order[a.assessment ?? ""] ?? 3) - (order[b.assessment ?? ""] ?? 3));

  return (
    <>
      {evolution.warnings.map((warning) => <p key={warning} className="report-notice">{warning}</p>)}
      <ReportSection title={t.evolutionMatches}>
        <ol className="timeline-strip">
          {evolution.matches.map((match) => (
            <li key={match.match_id}>
              <div className="timeline-match">
                <small>{formatShortDate(match.match_date)}</small>
                <strong>vs {match.opponent}</strong>
                {match.result && <Pill tone={RESULT_TONE[match.result]}>{label("matchResult", match.result)} {match.home_score}-{match.away_score}</Pill>}
              </div>
            </li>
          ))}
        </ol>
      </ReportSection>
      <ReportSection title={t.trends}>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr><th>{es.pages.analysis.indicator}</th><th>{es.pages.analysis.team}</th><th className="num">{t.first}</th><th className="num">{t.last}</th><th>{t.trend}</th><th>{t.assessment}</th></tr>
            </thead>
            <tbody>
              {trends.map((trend) => {
                const { name, team } = indicatorLabel(trend.indicator);
                const known = trend.values.filter((value): value is number => value !== null);
                const format = valueFormatter(trend.unit);
                return (
                  <tr key={trend.indicator}>
                    <td>{name}</td>
                    <td>{team || es.pages.insights.teams.match}</td>
                    <td className="num">{known.length ? format(known[0]) : "—"}</td>
                    <td className="num">{known.length ? format(known[known.length - 1]) : "—"}</td>
                    <td>{label("trend", trend.trend)}</td>
                    <td>{trend.assessment ? (
                      <Pill tone={trend.assessment === "WORSENING" ? "danger" : trend.assessment === "IMPROVING" ? "success" : "neutral"}>
                        {label("assessment", trend.assessment)}
                      </Pill>
                    ) : "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </ReportSection>
    </>
  );
}
