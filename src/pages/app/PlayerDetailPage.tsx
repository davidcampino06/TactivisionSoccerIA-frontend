import { useState, type FormEvent } from "react";
import { Link, useLocation, useParams } from "react-router";
import { api, json } from "../../api/client";
import { PLAYER_STATUS_TONE } from "../../app/tones";
import { useTeam } from "../../app/teamState";
import PlayerForm from "../../components/players/PlayerForm";
import { EmptyState, ErrorBanner, Loading, PageHeader, Pill, Section } from "../../components/ui";
import { useLoad } from "../../hooks/useLoad";
import { es } from "../../i18n/es";
import { formatDateTime, formatPercent, formatServerDate, label } from "../../i18n/labels";
import type { Player, PlayerAppearance, PlayerHistory } from "../../types";

const t = es.pages.player;
type Mode = "view" | "edit" | "remove";

export default function PlayerDetailPage() {
  const { playerId = "" } = useParams();
  const { team, isCoach } = useTeam();
  const location = useLocation();
  const [mode, setMode] = useState<Mode>("view");
  const [notice, setNotice] = useState<string>((location.state as { notice?: string } | null)?.notice ?? "");
  const [error, setError] = useState<unknown>(null);

  const player = useLoad(() => api<Player>(`/api/players/${playerId}`), playerId);
  const history = useLoad(() => api<PlayerHistory[]>(`/api/players/${playerId}/history`), playerId);
  const appearances = useLoad(() => api<PlayerAppearance[]>(`/api/players/${playerId}/appearances`), playerId);

  if (player.error && !player.data) {
    return <div className="page"><BackLink /><ErrorBanner error={player.error} onRetry={player.reload} /></div>;
  }
  if (!player.data) return <div className="page"><Loading /></div>;
  const current = player.data;
  const inactive = current.status === "INACTIVE";

  const done = (saved: Player, message: string) => {
    player.setData(saved);
    history.reload();
    setMode("view");
    setError(null);
    setNotice(message);
  };

  const reactivate = async () => {
    setError(null);
    setNotice("");
    try {
      done(await api<Player>(`/api/players/${current.id}`, { method: "PUT", body: json({ status: "ACTIVE" }) }), t.reactivated);
    } catch (caught) {
      setError(caught);
    }
  };

  const eyebrow = [
    current.shirt_number !== null ? `${t.shirt} ${current.shirt_number}` : null,
    current.position ? label("position", current.position) : null,
  ].filter(Boolean).join(" · ") || es.pages.players.eyebrow;

  return (
    <div className="page">
      <BackLink />
      <PageHeader eyebrow={eyebrow} title={`${current.first_name} ${current.last_name}`}
        actions={
          <>
            <Pill tone={PLAYER_STATUS_TONE[current.status]}>{label("playerStatus", current.status)}</Pill>
            {isCoach && mode === "view" && (inactive ? (
              <button type="button" className="btn btn-primary btn-sm" onClick={reactivate}>{t.reactivate}</button>
            ) : (
              <>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setMode("edit"); setNotice(""); }}>{t.edit}</button>
                <button type="button" className="btn btn-danger btn-sm" onClick={() => { setMode("remove"); setNotice(""); }}>{t.remove}</button>
              </>
            ))}
          </>
        } />
      {notice && <p className="notice" role="status">{notice}</p>}
      <ErrorBanner error={error} />

      {mode === "edit" && (
        <PlayerForm teamId={team!.id} player={current} onCancel={() => setMode("view")} onSaved={(saved) => done(saved, t.saved)} />
      )}
      {mode === "remove" && (
        <RemoveForm player={current} onCancel={() => setMode("view")} onRemoved={(saved) => done(saved, t.removed)} />
      )}

      <div className="two-columns">
        <div className="stack">
          <Section title={t.details}>
            <dl className="facts">
              <div><dt>{t.shirt}</dt><dd className="fact-number">{current.shirt_number ?? "—"}</dd></div>
              <div><dt>{t.position}</dt><dd>{current.position ? label("position", current.position) : t.noValue}</dd></div>
              <div><dt>{t.foot}</dt><dd>{current.preferred_foot ? label("foot", current.preferred_foot) : t.noValue}</dd></div>
              <div><dt>{t.since}</dt><dd>{formatServerDate(current.created_at)}</dd></div>
            </dl>
            {!isCoach && <small className="muted">{t.coachOnly}</small>}
          </Section>

          <Section title={t.history}>
            {history.loading && !history.data ? <Loading /> : (
              <ol className="timeline">
                {[...(history.data ?? [])].reverse().map((entry) => (
                  <li key={entry.id} className={entry.left_at ? "timeline-item" : "timeline-item is-current"}>
                    <span className="timeline-dot" aria-hidden="true" />
                    <div>
                      <strong>{entry.left_at ? `${formatServerDate(entry.joined_at)} – ${formatServerDate(entry.left_at)}` : t.current}</strong>
                      <small>
                        {entry.left_at
                          ? `${t.left}: ${entry.withdrawal_reason ?? "—"}`
                          : `${t.joined}: ${formatServerDate(entry.joined_at)}`}
                      </small>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </Section>
        </div>

        <Section title={t.appearances}>
          <ErrorBanner error={appearances.error} onRetry={appearances.reload} />
          {appearances.loading && !appearances.data ? <Loading /> : (appearances.data ?? []).length === 0 ? (
            <EmptyState title={t.appearancesEmpty} body={t.appearancesHint} />
          ) : (
            <ul className="row-list">
              {(appearances.data ?? []).map((item) => (
                <li key={item.analysis_id} className="row">
                  <span className="row-main">
                    <strong>vs {item.opponent}</strong>
                    <small>
                      {formatDateTime(item.match_date)} · {t.tracks(item.tracks.length)} · {t.detections(item.detections)}
                      {" · "}{es.pages.analysis.confidence.toLowerCase()} {formatPercent(item.mean_confidence)}
                    </small>
                  </span>
                  {item.analysis_mode === "SIMULATION_MODE" && <Pill tone="warning">{label("analysisMode", item.analysis_mode)}</Pill>}
                  <Link to={`/analisis/${item.analysis_id}`} className="btn btn-ghost btn-sm">{t.viewAnalysis}</Link>
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>
    </div>
  );
}

function BackLink() {
  return <Link to="/jugadores" className="back-link">← {t.back}</Link>;
}

function RemoveForm({ player, onCancel, onRemoved }: { player: Player; onCancel: () => void; onRemoved: (player: Player) => void }) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      onRemoved(await api<Player>(`/api/players/${player.id}`, {
        method: "DELETE", body: json({ withdrawal_reason: reason.trim() }),
      }));
    } catch (caught) {
      setError(caught);
      setBusy(false);
    }
  };

  return (
    <Section title={t.removeTitle} className="panel-danger">
      <p className="muted">{t.removeBody}</p>
      <form className="form-grid" onSubmit={submit}>
        <label className="field field-wide">
          <span>{t.reason}</span>
          <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder={t.reasonPlaceholder}
            minLength={2} maxLength={200} required autoFocus />
        </label>
        <ErrorBanner error={error} />
        <div className="form-actions field-wide">
          <button type="button" className="btn btn-ghost" onClick={onCancel}>{es.app.cancel}</button>
          <button className="btn btn-danger" disabled={busy}>{busy ? es.auth.working : t.removeConfirm}</button>
        </div>
      </form>
    </Section>
  );
}
