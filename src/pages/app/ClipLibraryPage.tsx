import { useMemo, useState } from "react";
import { Link } from "react-router";
import { api } from "../../api/client";
import { RECOMMENDATION_TONE, SEVERITY_TONE, STRENGTH_TONE } from "../../app/tones";
import { useTeam } from "../../app/teamState";
import { formatShortDate } from "../../components/insights/indicators";
import { EmptyState, ErrorBanner, Loading, PageHeader, Pill } from "../../components/ui";
import { useLoad } from "../../hooks/useLoad";
import { es } from "../../i18n/es";
import { label } from "../../i18n/labels";
import type { ClipLibrary } from "../../types";
import { useTrackPhoto } from "../../components/analysis/trackPhotoCache";

const t = es.pages.library;
type Facet = ClipLibrary["facets"]["situations"][number];

/** Clips of one facet value, or null when that filter is not used (the backend's inverted index). */
const clipsOf = (facets: Facet[], key: string) => (key ? new Set(facets.find((f) => f.key === key)?.clips ?? []) : null);

/**
 * Clip library: every analysed clip of the team, filtered by situation, match, problem or strength.
 * Each filter is a list of clips from the backend's inverted index; combining filters intersects them.
 */
export default function ClipLibraryPage() {
  const { team } = useTeam();
  const library = useLoad(() => api<ClipLibrary>(`/api/teams/${team!.id}/clip-library`), team!.id);
  const [situation, setSituation] = useState("");
  const [matchId, setMatchId] = useState("");
  const [problem, setProblem] = useState("");
  const [strength, setStrength] = useState("");

  const data = library.data;
  const matches = useMemo(() => {
    const seen = new Map<string, ClipLibrary["clips"][number]["match"]>();
    for (const clip of data?.clips ?? []) seen.set(clip.match.id, clip.match);
    return [...seen.values()];
  }, [data]);

  if (library.loading) return <div className="page"><Loading /></div>;
  if (library.error || !data) return <div className="page"><ErrorBanner error={library.error} onRetry={library.reload} /></div>;

  const filters = [clipsOf(data.facets.situations, situation), clipsOf(data.facets.problems, problem),
                   clipsOf(data.facets.strengths, strength)].filter((set): set is Set<string> => set !== null);
  const shown = data.clips.filter((clip) => (!matchId || clip.match.id === matchId)
    && filters.every((set) => set.has(clip.video_id)));

  return (
    <div className="page clip-library">
      <PageHeader eyebrow={t.eyebrow} title={t.title} description={t.description} />
      {data.clips.length === 0 ? (
        <EmptyState title={t.empty} body={t.emptyBody} action={<Link to="/partidos" className="btn btn-ghost btn-sm">{es.app.nav.matches}</Link>} />
      ) : (
        <>
          <section className="glass review-bar library-filters">
            <div className="library-chips" role="group" aria-label={t.situations}>
              <button type="button" className={`review-tab${situation === "" ? " is-active" : ""}`} aria-pressed={situation === ""}
                onClick={() => setSituation("")}>{t.all} ({data.clips.length})</button>
              {data.facets.situations.map((facet) => (
                <button key={facet.key} type="button" className={`review-tab${situation === facet.key ? " is-active" : ""}`}
                  aria-pressed={situation === facet.key} onClick={() => setSituation(facet.key)}>
                  {label("situation", facet.key)} ({facet.count})
                </button>
              ))}
            </div>
            <div className="library-selects">
              <label className="review-filter">
                <span>{t.match}</span>
                <select value={matchId} onChange={(e) => setMatchId(e.target.value)}>
                  <option value="">{t.allMatches}</option>
                  {matches.map((m) => <option key={m.id} value={m.id}>{es.pages.matches.vs} {m.opponent} · {formatShortDate(m.match_date)}</option>)}
                </select>
              </label>
              <FacetSelect text={t.problem} facets={data.facets.problems} value={problem} onChange={setProblem} />
              <FacetSelect text={t.strength} facets={data.facets.strengths} value={strength} onChange={setStrength} />
            </div>
            <p className="muted small review-hint">{t.count(shown.length)} · {t.index}</p>
          </section>

          {shown.length === 0 ? <EmptyState title={t.noMatch} /> : (
            <div className="library-grid">
              {shown.map((clip) => (
                <article key={clip.video_id} className="glass library-card">
                  <header className="library-card-head">
                    <Pill tone={clip.situation ? "info" : "neutral"}>{label("situation", clip.situation ?? "NONE")}</Pill>
                    {clip.analysis.mode === "SIMULATION_MODE" && <Pill tone="warning">{t.simulated}</Pill>}
                  </header>
                  {clip.photos && clip.photos.length > 0 && (
                    <Link to={`/analisis/${clip.analysis.id}#video`} className="library-photos" aria-label={`${t.watch} · ${clip.file_name}`}>
                      <span className="visually-hidden">{t.photosLabel}</span>
                      {clip.photos.map((trackId) => <LibraryPhoto key={trackId} analysisId={clip.analysis.id} trackId={trackId} />)}
                      {clip.file_available !== false && <span className="library-play" aria-hidden="true">▶</span>}
                    </Link>
                  )}
                  <h3>{es.pages.matches.vs} {clip.match.opponent} <span className="muted small">· {formatShortDate(clip.match.match_date)}</span></h3>
                  <p className="muted small library-file">{clip.file_name}</p>
                  {clip.situation_note && <p className="library-note">{clip.situation_note}</p>}
                  {!clip.analysis.own_team_known && <p className="muted small">{t.teamUnknown}</p>}
                  <div className="library-items">
                    <p className="mini-title">{t.problems}</p>
                    {clip.problems.length === 0 ? <p className="muted small">{t.none}</p> : (
                      <ul>
                        {clip.problems.map((item, index) => (
                          <li key={index} className={item.status === "DISMISSED" ? "is-dismissed" : ""}>
                            <span>{item.title}{teamOf(item.team, clip.analysis.own_team_known)}</span>
                            <span className="library-pills">
                              <Pill tone={SEVERITY_TONE[item.severity]}>{label("severity", item.severity)}</Pill>
                              <Pill tone={RECOMMENDATION_TONE[item.status]}>{label("recommendationStatus", item.status)}</Pill>
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                    <p className="mini-title">{t.strengths}</p>
                    {clip.strengths.length === 0 ? <p className="muted small">{t.noneStrength}</p> : (
                      <ul>
                        {clip.strengths.map((item, index) => (
                          <li key={index} className={item.status === "DISMISSED" ? "is-dismissed" : ""}>
                            <span>{item.title}{teamOf(item.team, clip.analysis.own_team_known)}</span>
                            <span className="library-pills">
                              <Pill tone={STRENGTH_TONE[item.status]}>{es.pages.analysis.strengthStatus[item.status] ?? item.status}</Pill>
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  {clip.file_available === false && <p className="muted small">{t.fileGone}</p>}
                  <div className="library-actions">
                    {clip.file_available !== false && clip.analysis.mode !== "SIMULATION_MODE" && (
                      <Link to={`/analisis/${clip.analysis.id}#video`} className="btn btn-primary btn-sm">{t.watch}</Link>
                    )}
                    <Link to={`/analisis/${clip.analysis.id}`} className="btn btn-ghost btn-sm">{t.openAnalysis}</Link>
                    {!clip.situation && <Link to={`/partidos/${clip.match.id}`} className="btn btn-ghost btn-sm">{t.classify}</Link>}
                  </div>
                </article>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

/** One player of the clip, cut from the video itself (track_snapshots). */
function LibraryPhoto({ analysisId, trackId }: { analysisId: string; trackId: number }) {
  const url = useTrackPhoto(analysisId, trackId, true);
  return url ? <img src={url} alt="" /> : <span className="library-photo-empty" />;
}

/** "(Equipo A)" after an item when the analysis does not know which detected team is ours. */
function teamOf(team: string | null | undefined, ownKnown: boolean) {
  if (ownKnown || !team || team === "MATCH") return null;
  return <span className="muted"> ({label("team", team)})</span>;
}

function FacetSelect({ text, facets, value, onChange }: { text: string; facets: Facet[]; value: string; onChange: (v: string) => void }) {
  return (
    <label className="review-filter">
      <span>{text}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} disabled={facets.length === 0}>
        <option value="">{t.any}</option>
        {facets.map((facet) => <option key={facet.key} value={facet.key}>{facet.key} ({facet.count})</option>)}
      </select>
    </label>
  );
}
