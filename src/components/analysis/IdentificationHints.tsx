import { useState } from "react";
import { api, json } from "../../api/client";
import { es } from "../../i18n/es";
import { formatPercent } from "../../i18n/labels";
import type { IdentificationHints as Hints, KitHint, Track, TrackLinkHint } from "../../types";
import { kitDecision } from "./kitDecision";
import TrackPhoto from "./TrackPhoto";

const t = es.pages.analysis.hints;

interface Props {
  analysisId: string;
  hints: Hints;
  tracks: Track[];
  /** After a decision the identities of several tracks may change: the page reloads them. */
  onChanged: (hints: Hints) => void;
  onError: (error: unknown) => void;
}

// The surest links first; the rest behind a button so the page does not become a long list.
const LINKS_PREVIEW = 5;

const decimal = (value: number) => value.toLocaleString("es-CO", { maximumFractionDigits: 1 });


/**
 * What the AI suggests to tell who is who, and nothing more: two tracks that look like the same
 * player hidden for a moment, and the people whose shirt is of no team. A person says yes or no;
 * a "yes" makes the shirt number of one track valid for the other.
 */
export default function IdentificationHints({ analysisId, hints, tracks, onChanged, onError }: Props) {
  const [busy, setBusy] = useState<string | null>(null);
  const [keeper, setKeeper] = useState<Record<number, string>>({});
  const [done, setDone] = useState("");
  const [allLinks, setAllLinks] = useState(false);
  // Kits whose decision the person reopened with "Cambiar".
  const [editing, setEditing] = useState<Set<number>>(new Set());
  const editKit = (group: number, open: boolean) => setEditing((current) => {
    const next = new Set(current);
    if (open) next.add(group); else next.delete(group);
    return next;
  });
  const byId = new Map(tracks.map((track) => [track.track_id, track]));
  const pending = hints.links.filter((link) => link.status === "SUGGESTED");
  const decided = hints.links.filter((link) => link.status !== "SUGGESTED");
  if (hints.links.length === 0 && hints.kits.length === 0) return null;

  const run = async (key: string, request: () => Promise<{ tracks?: number[] }>) => {
    setBusy(key);
    setDone("");
    onError(null);
    try {
      const result = await request();
      const fresh = await api<Hints>(`/api/analyses/${analysisId}/identification-hints`);
      onChanged(fresh);
      return result;
    } catch (caught) {
      onError(caught);
      return null;
    } finally {
      setBusy(null);
    }
  };

  const decide = (link: TrackLinkHint, decision: TrackLinkHint["status"]) => run(`link-${link.from_track}`, () =>
    api<{ tracks: number[] }>(`/api/analyses/${analysisId}/track-links/${link.from_track}`,
      { method: "PUT", body: json({ decision }) })).then((result) => {
    if (result && decision === "ACCEPTED") setDone(t.joined(result.tracks?.length ?? 2));
  });

  const markKit = (kit: KitHint, body: { role: string; shirt_number?: number | null }) =>
    run(`kit-${kit.kit_group}`, () => api<{ tracks: number[] }>(
      `/api/analyses/${analysisId}/kits/${kit.kit_group}/identity`, { method: "PUT", body: json(body) }))
      .then((result) => {
        if (!result) return;
        setDone(t.kitDone(result.tracks?.length ?? kit.tracks.length));
        editKit(kit.kit_group, false);
      });

  const dismissKit = (kit: KitHint, dismissed: boolean) => run(`kit-${kit.kit_group}`, () =>
    api(`/api/analyses/${analysisId}/kits/${kit.kit_group}`, { method: "PUT", body: json({ dismissed }) }));

  const photo = (id: number) => {
    const track = byId.get(id);
    return track ? <TrackPhoto analysisId={analysisId} track={track} /> : <span className="track-photo track-photo-empty">{id}</span>;
  };

  return (
    <div className="hints" aria-labelledby="hints-title">
      <h3 className="mini-title" id="hints-title">{t.title}</h3>
      <p className="muted small">{t.intro}</p>
      {done && <p className="notice" role="status">{done}</p>}

      {pending.length > 0 && <h4 className="hint-subtitle">{t.linksTitle(pending.length)}</h4>}
      {pending.length > 0 && (
        <ul className="hint-list">
          {(allLinks ? pending : pending.slice(0, LINKS_PREVIEW)).map((link) => (
            <li key={link.from_track} className="hint-item">
              <div className="hint-photos">
                {photo(link.from_track)}<span className="hint-arrow" aria-hidden="true">→</span>{photo(link.to_track)}
              </div>
              <div className="hint-text">
                <strong>{t.sameQuestion(link.from_track, link.to_track)}</strong>
                <span className="muted small">{t.sameWhy(decimal(link.gap_seconds), formatPercent(link.confidence))}</span>
              </div>
              <div className="hint-actions">
                <button type="button" className="btn btn-primary btn-sm" disabled={busy !== null}
                  onClick={() => void decide(link, "ACCEPTED")}>{t.yes}</button>
                <button type="button" className="btn btn-ghost btn-sm" disabled={busy !== null}
                  onClick={() => void decide(link, "REJECTED")}>{t.no}</button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {pending.length > LINKS_PREVIEW && (
        <button type="button" className="btn btn-ghost btn-sm hint-more" onClick={() => setAllLinks(!allLinks)}>
          {allLinks ? t.showFewerLinks : t.showAllLinks(pending.length - LINKS_PREVIEW)}
        </button>
      )}

      {decided.length > 0 && (
        <details className="hint-decided">
          <summary>{t.decided(decided.length)}</summary>
          <ul className="hint-decided-list">
            {decided.map((link) => (
              <li key={link.from_track}>
                <span>ID {link.from_track} → ID {link.to_track}</span>
                <span className={`chip chip-sm${link.status === "ACCEPTED" ? " chip-good" : ""}`}>
                  {link.status === "ACCEPTED" ? t.accepted : t.rejected}
                </span>
                <button type="button" className="btn btn-ghost btn-sm" disabled={busy !== null}
                  onClick={() => void decide(link, "SUGGESTED")}>{t.undo}</button>
              </li>
            ))}
          </ul>
        </details>
      )}

      {hints.kits.length > 0 && <h4 className="hint-subtitle">{t.kitsTitle}</h4>}
      {hints.kits.length > 0 && (
        <ul className="hint-list">
          {hints.kits.map((kit) => {
            const decision = kitDecision(kit, byId);
            const showDecision = decision !== null && !kit.dismissed && !editing.has(kit.kit_group);
            return (
            <li key={kit.kit_group} className={`hint-item hint-kit${kit.dismissed ? " is-dismissed" : ""}${showDecision ? " is-decided" : ""}`}>
              <div className="hint-photos">
                <span className="kit-swatch" style={{ background: kit.kit_color }} aria-hidden="true" />
                {kit.tracks.slice(0, 6).map((id) => <span key={id}>{photo(id)}</span>)}
              </div>
              <div className="hint-text">
                <strong>{t.kitTitle(kit.suggestion)} · {t.kitTracks(kit.tracks.length)}</strong>
                <span className="muted small">{kit.reason}</span>
              </div>
              {showDecision ? (
                <div className="hint-actions" role="status">
                  <span className="chip chip-sm chip-good">
                    {decision.kind === "referee" ? t.markedReferee(kit.tracks.length) : t.markedNumber(decision.number, kit.tracks.length)}
                  </span>
                  <button type="button" className="btn btn-ghost btn-sm" disabled={busy !== null}
                    onClick={() => editKit(kit.kit_group, true)}>{t.changeKit}</button>
                </div>
              ) : kit.dismissed ? (
                <div className="hint-actions">
                  <span className="chip chip-sm">{t.dismissed}</span>
                  <button type="button" className="btn btn-ghost btn-sm" disabled={busy !== null}
                    onClick={() => void dismissKit(kit, false)}>{t.restoreKit}</button>
                </div>
              ) : (
                <div className="hint-actions">
                  <button type="button" className="btn btn-primary btn-sm" disabled={busy !== null}
                    onClick={() => void markKit(kit, { role: "REFEREE" })}>
                    {busy === `kit-${kit.kit_group}` ? t.saving : t.isReferee}
                  </button>
                  <form className="hint-keeper" onSubmit={(event) => {
                    event.preventDefault();
                    const number = Number(keeper[kit.kit_group]);
                    if (Number.isInteger(number) && number >= 0 && number <= 99) {
                      void markKit(kit, { role: "PLAYER", shirt_number: number });
                    }
                  }}>
                    <input type="number" min={0} max={99} inputMode="numeric" aria-label={t.keeperNumber}
                      placeholder={t.keeperShort} value={keeper[kit.kit_group] ?? ""}
                      onChange={(event) => setKeeper({ ...keeper, [kit.kit_group]: event.target.value })} />
                    <button type="submit" className="btn btn-ghost btn-sm"
                      disabled={busy !== null || keeper[kit.kit_group] === undefined || keeper[kit.kit_group] === ""}>
                      {t.saveKeeper}
                    </button>
                  </form>
                  <button type="button" className="btn btn-ghost btn-sm" disabled={busy !== null}
                    onClick={() => void dismissKit(kit, true)}>{t.dismissKit}</button>
                  {decision !== null && (
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => editKit(kit.kit_group, false)}>
                      {t.cancelChange}
                    </button>
                  )}
                </div>
              )}
            </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
