import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { api, json } from "../../api/client";
import { ANALYSIS_TONE, RECOMMENDATION_TONE, SEVERITY_TONE } from "../../app/tones";
import { useTeam } from "../../app/teamState";
import { useLoad } from "../../hooks/useLoad";
import { ConfirmButton, EmptyState, ErrorBanner, Loading, PageHeader, Pill, Section } from "../../components/ui";
import { es } from "../../i18n/es";
import { formatIndicatorValue, formatPercent, formatTimestamp, indicatorLabel, label } from "../../i18n/labels";
import type { AnalysisResult, Indicator, Player, Recommendation, Track, VideoAnalysis } from "../../types";

const t = es.pages.analysis;
const POLL_MS = 2000;
const RUNNING = new Set(["PENDING", "PROCESSING"]);

export default function AnalysisPage() {
  const { analysisId = "" } = useParams();
  const navigate = useNavigate();
  const [analysis, setAnalysis] = useState<VideoAnalysis | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<unknown>(null);

  // Ask the backend (never the AI Service) every 2 s until the analysis finishes.
  useEffect(() => {
    let cancelled = false;
    let timer: number | undefined;
    const poll = async () => {
      try {
        const current = await api<VideoAnalysis>(`/api/analyses/${analysisId}`);
        if (cancelled) return;
        setAnalysis(current);
        if (RUNNING.has(current.status)) {
          timer = window.setTimeout(poll, POLL_MS);
        } else {
          const full = await api<AnalysisResult>(`/api/analyses/${analysisId}/result`);
          if (!cancelled) setResult(full);
        }
      } catch (caught) {
        if (!cancelled) setError(caught);
      }
    };
    void poll();
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [analysisId]);

  const cancel = () => {
    api<VideoAnalysis>(`/api/analyses/${analysisId}/cancel`, { method: "POST" }).then(setAnalysis).catch(setError);
  };

  const updateRecommendation = (updated: Recommendation) => {
    setResult((current) => current && {
      ...current,
      recommendations: current.recommendations.map((item) => (item.id === updated.id ? { ...item, ...updated } : item)),
    });
  };

  if (error && !analysis) return <div className="page"><ErrorBanner error={error} /></div>;
  if (!analysis) return <div className="page"><Loading /></div>;

  const matchId = result?.recommendations[0]?.match_id;
  const simulated = analysis.analysis_mode === "SIMULATION_MODE";

  return (
    <div className="page">
      <button type="button" className="back-link" onClick={() => (matchId ? navigate(`/partidos/${matchId}`) : navigate(-1))}>
        ← {t.back}
      </button>
      <PageHeader
        eyebrow={analysis.completed_at ? formatTimestamp(analysis.completed_at) : label("analysisStatus", analysis.status)}
        title={t.title}
        actions={
          <>
            <Pill tone={simulated ? "warning" : "success"}>{label("analysisMode", analysis.analysis_mode)}</Pill>
            <Pill tone={ANALYSIS_TONE[analysis.status]}>{label("analysisStatus", analysis.status)}</Pill>
            {analysis.status === "COMPLETED" && (
              <Link to={`/reportes?nuevo=1&tipo=VIDEO_ANALYSIS&analisis=${analysis.id}`} className="btn btn-ghost btn-sm">
                {es.pages.reports.create}
              </Link>
            )}
          </>
        }
        description={simulated ? t.simulatedModel : analysis.model_name ? `${t.model}: ${analysis.model_name}${analysis.model_version ? ` (${analysis.model_version})` : ""}` : undefined}
      />
      <ErrorBanner error={error} />

      {RUNNING.has(analysis.status) && (
        <Section className="analysis-waiting">
          <div className="scan-bar" aria-hidden="true"><span /></div>
          <p>{t.waiting}</p>
          {analysis.queue_position ? <p className="muted">{t.queued(analysis.queue_position)}</p> : null}
          <ConfirmButton label={t.cancel} confirmLabel={t.cancelConfirm} className="btn btn-ghost btn-sm" onConfirm={cancel} />
        </Section>
      )}

      {analysis.status === "FAILED" && (
        <div className="error-banner" role="alert"><span>{t.failed} {analysis.warning_message}</span></div>
      )}

      {result && analysis.status === "COMPLETED" && (
        <>
          {result.analysis.warning_message && (
            <Section title={t.warnings} className="panel-warning">
              <ul className="warning-list">
                {result.analysis.warning_message.split(/\s*\|\s*|\n/).filter(Boolean).map((warning) => <li key={warning}>{warning}</li>)}
              </ul>
            </Section>
          )}

          {!simulated && <div className="stat-grid">
            {Object.entries(result.summary).map(([key, value]) => (
              <div className="stat" key={key}>
                <span className="stat-label">{es.labels.summary[key] ?? key}</span>
                <strong className="stat-value">{typeof value === "boolean" ? (value ? es.labels.yes : es.labels.no) : value}</strong>
              </div>
            ))}
          </div>}

          <Section title={t.issues}>
            <p className="muted">{t.issuesHint} {t.issuesOrder}</p>
            {result.recommendations.length === 0 ? <EmptyState title={t.noIssues} /> : (
              <div className="issue-list">
                {/* Already in priority order: the backend pops them from a heap (most urgent first). */}
                {result.recommendations.map((item, index) => (
                  <IssueCard key={item.id} item={item} rank={index + 1} onUpdated={updateRecommendation} onError={setError} />
                ))}
              </div>
            )}
          </Section>

          {!simulated && <TrackSection analysisId={analysis.id} />}

          <Section title={t.indicators}>
            <IndicatorTable indicators={result.indicators}
              flagged={new Set(result.recommendations.filter((item) => item.status !== "DISMISSED").flatMap((item) => item.indicator_names ?? []))} />
          </Section>

        </>
      )}

      {matchId && <Link to={`/partidos/${matchId}`} className="btn btn-ghost">{t.back}</Link>}
    </div>
  );
}

function IssueCard({ item, rank, onUpdated, onError }:
  { item: Recommendation; rank: number; onUpdated: (item: Recommendation) => void; onError: (error: unknown) => void }) {
  const [busy, setBusy] = useState(false);
  const act = async (action: "review" | "confirm" | "dismiss") => {
    setBusy(true);
    try {
      onUpdated(await api<Recommendation>(`/api/recommendations/${item.id}`, { method: "PATCH", body: json({ action }) }));
    } catch (caught) {
      onError(caught);
    } finally {
      setBusy(false);
    }
  };
  const open = item.status === "GENERATED" || item.status === "REVIEWED";

  return (
    <article className={`issue issue-${item.severity.toLowerCase()}${item.status === "DISMISSED" ? " issue-dismissed" : ""}`}>
      <div className="issue-head">
        <h3><span className="issue-rank" title={t.priority(rank)} aria-label={t.priority(rank)}>{rank}</span>{item.title}</h3>
        <div className="issue-pills">
          <Pill tone={SEVERITY_TONE[item.severity]}>{t.severity} {label("severity", item.severity).toLowerCase()}</Pill>
          <Pill tone={RECOMMENDATION_TONE[item.status]}>{label("recommendationStatus", item.status)}</Pill>
        </div>
      </div>
      <div className="confidence">
        <span>{t.confidence}</span>
        <div className="meter" role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(item.confidence * 100)}>
          <span style={{ width: `${Math.round(item.confidence * 100)}%` }} />
        </div>
        <strong>{formatPercent(item.confidence)}</strong>
      </div>
      <p><span className="issue-label">{t.evidence}:</span> {item.evidence}</p>
      <p><span className="issue-label">{t.recommendation}:</span> {item.description}</p>
      {open && (
        <div className="issue-actions">
          {item.status === "GENERATED" && <button type="button" className="btn btn-ghost btn-sm" disabled={busy} onClick={() => void act("review")}>{t.review}</button>}
          <button type="button" className="btn btn-primary btn-sm" disabled={busy} onClick={() => void act("confirm")}>{t.confirm}</button>
          <button type="button" className="btn btn-ghost btn-sm" disabled={busy} onClick={() => void act("dismiss")}>{t.dismiss}</button>
        </div>
      )}
    </article>
  );
}

const TRACKS_PREVIEW = 8;

/** Manual identification: a person links a detected trajectory to a squad player (no biometrics). */
function TrackSection({ analysisId }: { analysisId: string }) {
  const { team } = useTeam();
  const tracks = useLoad(() => api<Track[]>(`/api/analyses/${analysisId}/tracks`), analysisId);
  const squad = useLoad(() => api<Player[]>(`/api/teams/${team!.id}/players`), team!.id);
  const [showAll, setShowAll] = useState(false);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState<unknown>(null);

  const list = [...(tracks.data ?? [])].sort((a, b) => b.detections - a.detections);
  if (tracks.loading && !tracks.data) return null;
  if (list.length === 0 && !tracks.error) return null;
  const shown = showAll ? list : list.slice(0, TRACKS_PREVIEW);
  const players = [...(squad.data ?? [])].sort((a, b) => (a.shirt_number ?? 100) - (b.shirt_number ?? 100));

  const assign = async (track: Track, playerId: string) => {
    setSavingId(track.track_id);
    setError(null);
    setNotice("");
    try {
      await api(`/api/analyses/${analysisId}/tracks/${track.track_id}/player`, {
        method: "PUT", body: json({ player_id: playerId || null }),
      });
      tracks.setData((tracks.data ?? []).map((item) => (
        item.track_id === track.track_id ? { ...item, player_id: playerId || null } : item)));
      setNotice(t.saved);
    } catch (caught) {
      setError(caught);
    } finally {
      setSavingId(null);
    }
  };

  return (
    <Section title={t.tracks}>
      <p className="muted">{t.tracksHint}</p>
      {notice && <p className="notice" role="status">{notice}</p>}
      <ErrorBanner error={error ?? tracks.error} />
      {squad.data && players.length === 0 ? <EmptyState title={t.noSquad}
        action={<Link to="/jugadores" className="btn btn-ghost btn-sm">{es.app.nav.players}</Link>} /> : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr><th>{t.track}</th><th className="num">{t.detections}</th><th className="num">{t.frames}</th>
                <th className="num">{t.meanConfidence}</th><th>{t.player}</th></tr>
            </thead>
            <tbody>
              {shown.map((track) => (
                <tr key={track.track_id}>
                  <td className="nowrap">{track.label}</td>
                  <td className="num">{track.detections}</td>
                  <td className="num nowrap">{track.first_frame}–{track.last_frame}</td>
                  <td className="num">{formatPercent(track.mean_confidence)}</td>
                  <td>
                    <select className="track-select" value={track.player_id ?? ""} disabled={savingId === track.track_id}
                      aria-label={`${t.player} · ${track.label}`} onChange={(e) => void assign(track, e.target.value)}>
                      <option value="">{t.unassigned}</option>
                      {players.map((player) => (
                        <option key={player.id} value={player.id}>
                          {player.shirt_number !== null ? `${player.shirt_number} · ` : ""}{player.first_name} {player.last_name}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {list.length > TRACKS_PREVIEW && (
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowAll(!showAll)}>
          {showAll ? t.showFewerTracks : t.showAllTracks(list.length)}
        </button>
      )}
    </Section>
  );
}

function formatIndicator(indicator: Indicator): string {
  return formatIndicatorValue(indicator.value, indicator.unit);
}

function formatThreshold(indicator: Indicator): string {
  return indicator.threshold === null ? "—" : formatIndicatorValue(indicator.threshold, indicator.unit, false);
}

function IndicatorTable({ indicators, flagged }: { indicators: Indicator[]; flagged: Set<string> }) {
  const rows = indicators.map((indicator) => ({ indicator, ...indicatorLabel(indicator.name) }))
    .sort((a, b) => a.team.localeCompare(b.team) || a.name.localeCompare(b.name));
  return (
    <div className="table-wrap">
      <table className="table">
        <thead><tr><th>{t.indicator}</th><th>{t.team}</th><th className="num">{t.value}</th><th className="num">{t.threshold}</th></tr></thead>
        <tbody>
          {rows.map(({ indicator, team, name }) => {
            const exceeded = flagged.has(indicator.name);
            return (
              <tr key={indicator.id} className={exceeded ? "row-flag" : undefined}>
                <td>{name}{exceeded && <span className="flag" title={t.exceeded}> ●</span>}</td>
                <td>{team || "—"}</td>
                <td className="num">{formatIndicator(indicator)}</td>
                <td className="num">{formatThreshold(indicator)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
