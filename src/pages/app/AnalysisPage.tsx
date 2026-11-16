import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router";
import { api, json } from "../../api/client";
import { ANALYSIS_TONE, RECOMMENDATION_TONE, SEVERITY_TONE, STRENGTH_TONE } from "../../app/tones";
import { useTeam } from "../../app/teamState";
import { useLoad } from "../../hooks/useLoad";
import { ConfirmButton, EmptyState, ErrorBanner, Loading, PageHeader, Pill, Section } from "../../components/ui";
import { es } from "../../i18n/es";
import { formatIndicatorValue, formatPercent, formatTimestamp, indicatorLabel, label, parseServerTime } from "../../i18n/labels";
import ProximityNetwork from "../../components/analysis/ProximityNetwork";
import { TeamLegend, TeamTag } from "../../components/analysis/TeamColors";
import IssueExplanation from "../../components/analysis/IssueExplanation";
import AnalysisVideo, { type IdentityChange } from "../../components/analysis/AnalysisVideo";
import { isIdentified } from "../../components/analysis/trackLabel";
import TrackPhoto from "../../components/analysis/TrackPhoto";
import { formatClock } from "../../components/analysis/clock";
import ReviewNotes from "../../components/analysis/ReviewNotes";
import type { TeamColors, TeamKey } from "../../components/analysis/shirtColor";
import type { AnalysisResult, Indicator, Player, ProximityNetwork as Network, Recommendation, Strength, Track, TrackRole, VideoAnalysis } from "../../types";

const t = es.pages.analysis;
const POLL_MS = 2000;
const RUNNING = new Set(["PENDING", "PROCESSING"]);

export default function AnalysisPage() {
  const { team: myTeam } = useTeam();
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

  const updateStrength = (updated: Strength) => {
    setResult((current) => current && {
      ...current,
      strengths: (current.strengths ?? []).map((item) => (item.id === updated.id ? { ...item, ...updated } : item)),
    });
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
  const colors: TeamColors = { TEAM_A: analysis.team_a_color, TEAM_B: analysis.team_b_color };
  const ownTeam = analysis.own_team ?? null;

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
          <ElapsedTime since={analysis.started_at ?? null} />
          <p className="muted small">{t.waitingHint}</p>
          <ConfirmButton label={t.cancel} confirmLabel={t.cancelConfirm} className="btn btn-ghost btn-sm" onConfirm={cancel} />
        </Section>
      )}

      {analysis.status === "FAILED" && (
        <div className="error-banner" role="alert"><span>{t.failed} {analysis.warning_message}</span></div>
      )}

      {result && analysis.status === "COMPLETED" && (
        <>
          <TeamLegend colors={colors} ownTeam={ownTeam} myTeam={myTeam} ownKitColor={analysis.own_kit_color} />
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

          <StrengthsSection analysisId={analysis.id} strengths={result.strengths ?? []} colors={colors} ownTeam={ownTeam}
            onUpdated={updateStrength} onError={setError} />

          <Section title={t.issues}>
            <p className="muted">{t.issuesHint} {t.issuesOrder}</p>
            {result.recommendations.length === 0 ? <EmptyState title={t.noIssues} /> : (
              <div className="issue-list">
                {/* Already in priority order: the backend pops them from a heap (most urgent first). */}
                {result.recommendations.map((item, index) => (
                  <IssueCard key={item.id} item={item} rank={index + 1} colors={colors} ownTeam={ownTeam} onUpdated={updateRecommendation} onError={setError} />
                ))}
              </div>
            )}
          </Section>

          {result.proximity_network && <NetworkSection analysisId={analysis.id} network={result.proximity_network} colors={colors} ownTeam={ownTeam} />}

          {!simulated && <TrackSection analysisId={analysis.id} videoId={analysis.video_id} matchId={matchId} />}

          <Section title={t.indicators}>
            <IndicatorTable indicators={result.indicators} colors={colors} ownTeam={ownTeam}
              flagged={new Set(result.recommendations.filter((item) => item.status !== "DISMISSED").flatMap((item) => item.indicator_names ?? []))} />
          </Section>

        </>
      )}

      {matchId && <Link to={`/partidos/${matchId}`} className="btn btn-ghost">{t.back}</Link>}
    </div>
  );
}

/** Minutes and seconds since the analysis started (or since this page opened, while it is queued). */
function ElapsedTime({ since }: { since: string | null }) {
  const [opened] = useState(() => Date.now());
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  const start = since ? parseServerTime(since).getTime() : opened;
  const seconds = Math.max(0, Math.round((now - start) / 1000));
  const time = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
  return <p className="analysis-elapsed" aria-live="off">{t.elapsed(time)}</p>;
}

function IssueCard({ item, rank, colors, ownTeam, onUpdated, onError }:
  { item: Recommendation; rank: number; colors: TeamColors; ownTeam: TeamKey | null; onUpdated: (item: Recommendation) => void; onError: (error: unknown) => void }) {
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
          {item.team && <Pill>{item.team === "MATCH" ? label("team", item.team) : <TeamTag team={item.team as TeamKey} colors={colors} ownTeam={ownTeam} />}</Pill>}
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
      {item.explanation && <IssueExplanation explanation={item.explanation} colors={colors} />}
      <ReviewNotes recommendationId={item.id} notes={item.notes ?? []} onChange={(notes) => onUpdated({ ...item, notes })} />
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

/**
 * What each team did well: the user's team first, then by confidence (the backend's order). A person
 * confirms or dismisses each one; the match plan only uses the confirmed ones.
 */
function StrengthsSection({ analysisId, strengths, colors, ownTeam, onUpdated, onError }: {
  analysisId: string; strengths: Strength[]; colors: TeamColors; ownTeam: TeamKey | null;
  onUpdated: (item: Strength) => void; onError: (error: unknown) => void;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  // The rival's strengths never reach the plan: only the user's team (or both, when unknown) is reviewed.
  const reviewable = (item: Strength) => ownTeam === null || item.team === ownTeam || item.team === "MATCH";
  const review = async (item: Strength, action: "confirm" | "dismiss") => {
    setBusy(item.id);
    try {
      onUpdated(await api<Strength>(`/api/analyses/${analysisId}/strengths/${item.id}`, { method: "PATCH", body: json({ action }) }));
    } catch (caught) {
      onError(caught);
    } finally {
      setBusy(null);
    }
  };
  const ordered = ownTeam ? [...strengths].sort((a, b) => Number(b.team === ownTeam) - Number(a.team === ownTeam)) : strengths;
  return (
    <Section title={t.strengths} className="strengths-section">
      <p className="muted">{t.strengthsHint} {t.strengthReviewHint}</p>
      {ordered.length === 0 ? <p className="muted small">{t.noStrengths}</p> : (
        <div className="issue-list">
          {ordered.map((item) => (
            <article key={item.id} className={`issue issue-strength${item.status === "DISMISSED" ? " issue-dismissed" : ""}`}>
              <div className="issue-head">
                <h3><span className="strength-mark" aria-hidden="true">✓</span>{item.title}</h3>
                <div className="issue-pills">
                  <Pill>{item.team === "MATCH" ? label("team", item.team) : <TeamTag team={item.team as TeamKey} colors={colors} ownTeam={ownTeam} />}</Pill>
                  {reviewable(item) && <Pill tone={STRENGTH_TONE[item.status ?? "GENERATED"]}>{t.strengthStatus[item.status ?? "GENERATED"]}</Pill>}
                </div>
              </div>
              <div className="confidence">
                <span>{t.strengthConfidence}</span>
                <div className="meter is-good" role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(item.confidence * 100)}>
                  <span style={{ width: `${Math.round(item.confidence * 100)}%` }} />
                </div>
                <strong>{formatPercent(item.confidence)}</strong>
              </div>
              {item.explanation?.meaning && <p>{item.explanation.meaning}</p>}
              {item.explanation && <IssueExplanation explanation={item.explanation} colors={colors} positive />}
              {(item.status ?? "GENERATED") === "GENERATED" && reviewable(item) && (
                <div className="issue-actions">
                  <button type="button" className="btn btn-primary btn-sm" disabled={busy === item.id} onClick={() => void review(item, "confirm")}>{t.confirmStrength}</button>
                  <button type="button" className="btn btn-ghost btn-sm" disabled={busy === item.id} onClick={() => void review(item, "dismiss")}>{t.dismissStrength}</button>
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </Section>
  );
}

/** Graph + BFS of the AI. Track numbers become shirt numbers when a person linked them to a player. */
function NetworkSection({ analysisId, network, colors, ownTeam }:
  { analysisId: string; network: Network; colors: TeamColors; ownTeam: TeamKey | null }) {
  const { team } = useTeam();
  const tracks = useLoad(() => api<Track[]>(`/api/analyses/${analysisId}/tracks`), analysisId);
  const squad = useLoad(() => api<Player[]>(`/api/teams/${team!.id}/players`), team!.id);
  return (
    <Section title={t.network.title} className="network-section">
      <p className="network-subtitle">{t.network.subtitle}</p>
      <ProximityNetwork network={network} tracks={tracks.data ?? []} players={squad.data ?? []} teamColors={colors} ownTeam={ownTeam} />
    </Section>
  );
}

const TRACKS_PREVIEW = 8;

/** Manual identification: a person links a detected trajectory to a squad player (no biometrics). */
function TrackSection({ analysisId, videoId, matchId }: { analysisId: string; videoId?: string; matchId?: string }) {
  const { team } = useTeam();
  const tracks = useLoad(() => api<Track[]>(`/api/analyses/${analysisId}/tracks`), analysisId);
  const squad = useLoad(() => api<Player[]>(`/api/teams/${team!.id}/players`), team!.id);
  const [showAll, setShowAll] = useState(false);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState<unknown>(null);

  const list = [...(tracks.data ?? [])].sort((a, b) => b.detections - a.detections);
  // Coming from "Ver video" (…#video): go straight to the player once the section is on the page.
  const { hash } = useLocation();
  const ready = list.length > 0;
  useEffect(() => {
    if (hash === "#video" && ready) document.getElementById("video")?.scrollIntoView({ block: "start" });
  }, [hash, ready]);
  if (tracks.loading && !tracks.data) return null;
  if (list.length === 0 && !tracks.error) return null;
  const shown = showAll ? list : list.slice(0, TRACKS_PREVIEW);
  const players = [...(squad.data ?? [])].sort((a, b) => (a.shirt_number ?? 100) - (b.shirt_number ?? 100));

  const patchTrack = (trackId: number, changes: Partial<Track>) =>
    tracks.setData((tracks.data ?? []).map((item) => (item.track_id === trackId ? { ...item, ...changes } : item)));

  const assign = async (track: Track, value: string) => {
    // The same select also says "not a player": the referee or someone outside the game.
    if (value.startsWith("role:")) {
      await identify(track, { role: value.slice(5) as TrackRole, shirt_number: null }).catch(() => undefined);
      return;
    }
    setSavingId(track.track_id);
    setError(null);
    setNotice("");
    try {
      await api(`/api/analyses/${analysisId}/tracks/${track.track_id}/player`, {
        method: "PUT", body: json({ player_id: value || null }),
      });
      const player = players.find((item) => item.id === value);
      patchTrack(track.track_id, { player_id: value || null, player_number: player?.shirt_number ?? null, role: "PLAYER" });
      setNotice(t.saved);
    } catch (caught) {
      setError(caught);
    } finally {
      setSavingId(null);
    }
  };

  // Typed on the video: a shirt number (linked to the squad player who wears it) or "not a player".
  const identify = async (track: Track, change: IdentityChange) => {
    setSavingId(track.track_id);
    setError(null);
    setNotice("");
    try {
      const saved = await api<{ role: TrackRole; player_id: string | null; player_number: number | null }>(
        `/api/analyses/${analysisId}/tracks/${track.track_id}/identity`, { method: "PUT", body: json(change) });
      patchTrack(track.track_id, { role: saved.role, player_id: saved.player_id, player_number: saved.player_number });
      setNotice(t.saved);
    } catch (caught) {
      setError(caught);
      throw caught;
    } finally {
      setSavingId(null);
    }
  };

  return (
    <Section title={t.tracks}>
      <p className="muted">{t.tracksHint}</p>
      <p className="track-progress">
        <strong>{t.tracksProgress(list.filter(isIdentified).length, list.length)}</strong>
        <span className="muted"> · {t.tracksProgressHint}</span>
      </p>
      {!list.some((track) => track.has_snapshot) && <p className="muted small">{t.noPhotosNote}</p>}
      {videoId && (
        <div id="video">
          <h3 className="mini-title">{t.video.title}</h3>
          <p className="muted small">{t.video.hint}</p>
          <AnalysisVideo analysisId={analysisId} videoId={videoId} matchId={matchId} tracks={list} players={players}
            savingId={savingId} onAssign={(track, playerId) => void assign(track, playerId)} onIdentity={identify} />
        </div>
      )}
      {notice && <p className="notice" role="status">{notice}</p>}
      <ErrorBanner error={error ?? tracks.error} />
      {squad.data && players.length === 0 ? <EmptyState title={t.noSquad}
        action={<Link to="/jugadores" className="btn btn-ghost btn-sm">{es.app.nav.players}</Link>} /> : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr><th>{t.photo}</th><th>{t.track}</th><th className="num">{t.appears}</th><th className="num">{t.detections}</th>
                <th className="num">{t.meanConfidence}</th><th>{t.player}</th></tr>
            </thead>
            <tbody>
              {shown.map((track) => (
                <tr key={track.track_id}>
                  <td><TrackPhoto analysisId={analysisId} track={track} /></td>
                  <td className="nowrap">{track.label}</td>
                  <td className="num nowrap">{formatClock(track.first_seconds)}–{formatClock(track.last_seconds)}</td>
                  <td className="num">{track.detections}</td>
                  <td className="num">{formatPercent(track.mean_confidence)}</td>
                  <td>
                    <select className="track-select" value={selectValue(track)} disabled={savingId === track.track_id}
                      aria-label={`${t.player} · ${track.label}`} onChange={(e) => void assign(track, e.target.value)}>
                      <option value="">{t.unassigned}</option>
                      {!track.player_id && track.player_number !== null && track.player_number !== undefined && (track.role ?? "PLAYER") === "PLAYER" && (
                        <option value={`number:${track.player_number}`} disabled>{t.numberOnly(track.player_number)}</option>
                      )}
                      {players.map((player) => (
                        <option key={player.id} value={player.id}>
                          {player.shirt_number !== null ? `${player.shirt_number} · ` : ""}{player.first_name} {player.last_name}
                        </option>
                      ))}
                      <optgroup label={t.notPlayer}>
                        <option value="role:REFEREE">{t.refereeOption}</option>
                        <option value="role:OTHER">{t.outsiderOption}</option>
                      </optgroup>
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

/** Value of a track's select: its squad player, "not a player", or only the number typed on the video. */
function selectValue(track: Track): string {
  if (track.role && track.role !== "PLAYER") return `role:${track.role}`;
  if (track.player_id) return track.player_id;
  return track.player_number !== null && track.player_number !== undefined ? `number:${track.player_number}` : "";
}

/** "team_a.team_width" -> "TEAM_A"; match-level indicators have no team. */
function teamOf(indicatorName: string): TeamKey | null {
  const prefix = indicatorName.split(".")[0];
  return prefix === "team_a" ? "TEAM_A" : prefix === "team_b" ? "TEAM_B" : null;
}

function formatIndicator(indicator: Indicator): string {
  return formatIndicatorValue(indicator.value, indicator.unit);
}

function formatThreshold(indicator: Indicator): string {
  return indicator.threshold === null ? "—" : formatIndicatorValue(indicator.threshold, indicator.unit, false);
}

function IndicatorTable({ indicators, flagged, colors, ownTeam }:
  { indicators: Indicator[]; flagged: Set<string>; colors: TeamColors; ownTeam: TeamKey | null }) {
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
                <td>{teamOf(indicator.name) ? <TeamTag team={teamOf(indicator.name)!} colors={colors} ownTeam={ownTeam} /> : team || "—"}</td>
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
