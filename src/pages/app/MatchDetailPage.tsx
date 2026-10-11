import { useRef, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { api, json } from "../../api/client";
import { useTeam } from "../../app/teamState";
import { ANALYSIS_TONE, RESULT_TONE, VIDEO_TONE } from "../../app/tones";
import { ConfirmButton, EmptyState, ErrorBanner, Loading, PageHeader, Pill, Section } from "../../components/ui";
import { useLoad } from "../../hooks/useLoad";
import { es } from "../../i18n/es";
import { formatDateTime, formatFileSize, formatTimestamp, label } from "../../i18n/labels";
import type { Match, Video, VideoAnalysis } from "../../types";

const t = es.pages.match;
const MAX_VIDEO_MB = 200;
const ALLOWED = ".mp4,.mov,.avi,.mkv,.webm";


export default function MatchDetailPage() {
  const { matchId = "" } = useParams();
  const navigate = useNavigate();
  const { isCoach } = useTeam();
  const match = useLoad(() => api<Match>(`/api/matches/${matchId}`), matchId);
  const videos = useLoad(() => api<Video[]>(`/api/matches/${matchId}/videos`), matchId);
  const [error, setError] = useState<unknown>(null);

  if (match.loading) return <div className="page"><Loading /></div>;
  if (match.error || !match.data) return <div className="page"><ErrorBanner error={match.error} onRetry={match.reload} /></div>;
  const data = match.data;

  return (
    <div className="page">
      <Link to="/partidos" className="back-link">← {t.back}</Link>
      <PageHeader
        eyebrow={`${formatDateTime(data.match_date)} · ${data.is_home ? es.pages.matches.home : es.pages.matches.away}`}
        title={`${es.pages.matches.vs} ${data.opponent}`}
        description={data.location ?? undefined}
        actions={
          <>
            {data.result
              ? <Pill tone={RESULT_TONE[data.result]}>{label("matchResult", data.result)} {data.home_score}-{data.away_score}</Pill>
              : <Pill>{label("matchStatus", data.status)}</Pill>}
            {isCoach && (
              <ConfirmButton label={t.deleteMatch} confirmLabel={t.deleteMatchConfirm} onConfirm={() => {
                api(`/api/matches/${data.id}`, { method: "DELETE" }).then(() => navigate("/partidos")).catch(setError);
              }} />
            )}
          </>
        }
      />
      <ErrorBanner error={error} />

      <div className="two-columns wide-left">
        <Section title={t.videos}>
          <UploadVideo matchId={data.id} onUploaded={videos.reload} />
          <ErrorBanner error={videos.error} onRetry={videos.reload} />
          {videos.loading ? <Loading /> : (videos.data ?? []).length === 0 ? <EmptyState title={t.noVideos} /> : (
            <ul className="video-list">
              {(videos.data ?? []).map((video) => (
                <VideoItem key={video.id} video={video} canDelete={isCoach} onChange={videos.reload} />
              ))}
            </ul>
          )}
        </Section>

        <Section title={t.score}>
          <ScoreForm match={data} onSaved={(updated) => match.setData(updated)} />
        </Section>
      </div>
    </div>
  );
}

function ScoreForm({ match, onSaved }: { match: Match; onSaved: (match: Match) => void }) {
  const ours = match.is_home ? match.home_score : match.away_score;
  const theirs = match.is_home ? match.away_score : match.home_score;
  const [score, setScore] = useState({ ours: ours ?? 0, theirs: theirs ?? 0 });
  const [notice, setNotice] = useState("");
  const [error, setError] = useState<unknown>(null);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    try {
      const body = match.is_home
        ? { home_score: score.ours, away_score: score.theirs }
        : { home_score: score.theirs, away_score: score.ours };
      onSaved(await api<Match>(`/api/matches/${match.id}/result`, { method: "PUT", body: json(body) }));
      setNotice(t.scoreSaved);
    } catch (caught) {
      setError(caught);
    }
  };

  return (
    <form className="score-form" onSubmit={submit}>
      <label className="field">
        <span>{t.ours}</span>
        <input type="number" min={0} max={99} value={score.ours} onChange={(e) => setScore({ ...score, ours: Number(e.target.value) })} />
      </label>
      <span className="score-dash" aria-hidden="true">–</span>
      <label className="field">
        <span>{t.theirs}</span>
        <input type="number" min={0} max={99} value={score.theirs} onChange={(e) => setScore({ ...score, theirs: Number(e.target.value) })} />
      </label>
      <button className="btn btn-primary btn-block">{t.saveScore}</button>
      {notice && <p className="notice" role="status">{notice}</p>}
      <ErrorBanner error={error} />
    </form>
  );
}

function UploadVideo({ matchId, onUploaded }: { matchId: string; onUploaded: () => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [localError, setLocalError] = useState("");

  const choose = (selected: File | null) => {
    setLocalError("");
    if (selected && selected.size > MAX_VIDEO_MB * 1_048_576) {
      setLocalError(t.fileTooBig(MAX_VIDEO_MB));
      setFile(null);
      return;
    }
    setFile(selected);
  };

  const upload = async () => {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const data = new FormData();
      data.append("video", file);
      await api(`/api/matches/${matchId}/videos`, { method: "POST", body: data });
      setFile(null);
      if (input.current) input.current.value = "";
      onUploaded();
    } catch (caught) {
      setError(caught);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="upload">
      <div className="upload-row">
        <label className="btn btn-ghost">
          {t.chooseFile}
          <input ref={input} type="file" accept={ALLOWED} className="visually-hidden"
            onChange={(e) => choose(e.target.files?.[0] ?? null)} />
        </label>
        <span className="upload-file">{file ? `${file.name} · ${formatFileSize(file.size)}` : t.fileHint(MAX_VIDEO_MB)}</span>
        <button type="button" className="btn btn-primary" disabled={!file || busy} onClick={() => void upload()}>
          {busy ? t.uploading : t.upload}
        </button>
      </div>
      {localError && <p className="field-error">{localError}</p>}
      <ErrorBanner error={error} />
    </div>
  );
}

function VideoItem({ video, canDelete, onChange }: { video: Video; canDelete: boolean; onChange: () => void }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState("REAL_VIDEO_ANALYSIS");
  const [direction, setDirection] = useState("unknown");
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);
  const analyses = useLoad(() => api<VideoAnalysis[]>(`/api/videos/${video.id}/analyses`), video.id + video.status);

  const start = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const analysis = await api<VideoAnalysis>(`/api/videos/${video.id}/analysis`, {
        method: "POST", body: json({ mode, team_a_attack_direction: direction, frame_stride: 3, max_frames: 300 }),
      });
      navigate(`/analisis/${analysis.id}`);
    } catch (caught) {
      setError(caught);
      setBusy(false);
    }
  };

  return (
    <li className="video-item">
      <div className="video-head">
        <span className="row-main">
          <strong>{video.file_name}</strong>
          <small>{formatFileSize(video.file_size)}{video.uploaded_at ? ` · ${formatTimestamp(video.uploaded_at)}` : ""}</small>
        </span>
        <Pill tone={VIDEO_TONE[video.status]}>{label("videoStatus", video.status)}</Pill>
        <button type="button" className="btn btn-primary btn-sm" aria-expanded={open} onClick={() => setOpen((value) => !value)}>
          {t.analyze}
        </button>
        {canDelete && (
          <ConfirmButton label={t.deleteVideo} confirmLabel={t.deleteConfirm} onConfirm={() => {
            api(`/api/videos/${video.id}`, { method: "DELETE" }).then(onChange).catch(setError);
          }} />
        )}
      </div>

      {open && (
        <form className="analysis-form" onSubmit={start}>
          <label className="field">
            <span>{t.mode}</span>
            <select value={mode} onChange={(e) => setMode(e.target.value)}>
              <option value="REAL_VIDEO_ANALYSIS">{label("analysisMode", "REAL_VIDEO_ANALYSIS")}</option>
              <option value="SIMULATION_MODE">{label("analysisMode", "SIMULATION_MODE")}</option>
            </select>
          </label>
          <label className="field">
            <span>{t.direction}</span>
            <select value={direction} onChange={(e) => setDirection(e.target.value)}>
              {(["unknown", "left_to_right", "right_to_left"] as const).map((value) => (
                <option key={value} value={value}>{label("attackDirection", value)}</option>
              ))}
            </select>
            <small className="muted">{t.directionHint}</small>
          </label>
          <button className="btn btn-primary" disabled={busy}>{busy ? es.auth.working : t.start}</button>
        </form>
      )}
      <ErrorBanner error={error} />

      {(analyses.data ?? []).length > 0 && (
        <div className="analysis-history">
          <p className="mini-title">{t.history}</p>
          <ul>
            {(analyses.data ?? []).map((analysis) => (
              <li key={analysis.id}>
                <Pill tone={ANALYSIS_TONE[analysis.status]}>{label("analysisStatus", analysis.status)}</Pill>
                <span>{label("analysisMode", analysis.analysis_mode)}</span>
                {analysis.completed_at && <small className="muted">{formatTimestamp(analysis.completed_at)}</small>}
                <Link to={`/analisis/${analysis.id}`} className="btn btn-ghost btn-sm">{t.viewResult}</Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </li>
  );
}
