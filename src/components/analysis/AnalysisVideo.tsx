import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { ApiError, api, apiUrl } from "../../api/client";
import { es } from "../../i18n/es";
import type { Player, Track } from "../../types";
import { formatClock } from "./clock";
import { boxesAt, trackAt, type Overlay, type OverlayBox } from "./overlay";
import { playerLabel } from "./playerLabel";
import TrackPhoto from "./TrackPhoto";

const t = es.pages.analysis.video;
const SPEEDS = [0.25, 0.5, 1];
const ASSIGNED = "#f2b544";

type Props = {
  analysisId: string;
  videoId: string;
  matchId?: string;
  tracks: Track[];
  players: Player[];
  savingId: number | null;
  onAssign: (track: Track, playerId: string) => void;
};

/**
 * The uploaded clip, playing with what the AI saw drawn on top (the detections stored with the
 * analysis, moved between analysed frames by `boxesAt`). Touching a player's box pauses the video
 * and lets the staff say who he is; from then on his number and name ride on his box.
 */
export default function AnalysisVideo({ analysisId, videoId, matchId, tracks, players, savingId, onAssign }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawnRef = useRef<OverlayBox[]>([]);
  const [source, setSource] = useState<string | null>(null);
  const [problem, setProblem] = useState<"missing" | "unsupported" | "error" | null>(null);
  const [overlay, setOverlay] = useState<Overlay | null>(null);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [aspect, setAspect] = useState(16 / 9);
  const [speed, setSpeed] = useState(1);
  const [showBoxes, setShowBoxes] = useState(true);
  const [selected, setSelected] = useState<number | null>(null);

  useEffect(() => {
    let alive = true;
    api<{ url: string }>(`/api/videos/${videoId}/playback`, { method: "POST" })
      .then((link) => { if (alive) setSource(apiUrl(link.url)); })
      .catch((error: unknown) => {
        if (alive) setProblem(error instanceof ApiError && error.code === "VIDEO_FILE_MISSING" ? "missing" : "error");
      });
    api<Overlay>(`/api/analyses/${analysisId}/overlay`)
      .then((data) => { if (alive) setOverlay(data); })
      .catch(() => undefined);   // without boxes the video still plays
    return () => { alive = false; };
  }, [analysisId, videoId]);

  const byTrack = useRef(new Map<number, Track>());
  const byPlayer = useRef(new Map<string, Player>());
  useEffect(() => {
    byTrack.current = new Map(tracks.map((track) => [track.track_id, track]));
    byPlayer.current = new Map(players.map((player) => [player.id, player]));
  }, [tracks, players]);

  const draw = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    const ratio = window.devicePixelRatio || 1;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    if (canvas.width !== Math.round(width * ratio) || canvas.height !== Math.round(height * ratio)) {
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
    }
    const context = canvas.getContext("2d");
    if (!context) return;
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.clearRect(0, 0, width, height);
    const boxes = overlay && showBoxes && video.videoWidth ? boxesAt(overlay, video.currentTime) : [];
    drawnRef.current = boxes;
    const scale = width / (video.videoWidth || 1);
    // On a phone the picture is small: full labels would cover the players, so only the identified
    // ones carry their number and the selected one its whole label.
    const compact = width < 560;
    for (const [x, y, w, h, id, kind] of boxes) {
      const left = x * scale;
      const top = y * scale;
      const boxWidth = w * scale;
      const boxHeight = h * scale;
      if (kind === "B") {
        context.strokeStyle = "rgba(255, 255, 255, 0.95)";
        context.lineWidth = 1.5;
        context.beginPath();
        context.arc(left + boxWidth / 2, top + boxHeight / 2, Math.max(boxWidth, boxHeight) / 2 + 3, 0, Math.PI * 2);
        context.stroke();
        continue;
      }
      const track = id === null ? undefined : byTrack.current.get(id);
      const player = track?.player_id ? byPlayer.current.get(track.player_id) : undefined;
      const isSelected = id !== null && id === selected;
      const color = player ? ASSIGNED : "#ffffff";
      context.globalAlpha = id === null ? 0.45 : 1;
      corners(context, left, top, boxWidth, boxHeight, color, isSelected ? 3 : 1.6, isSelected);
      context.globalAlpha = 1;
      if (id === null || (compact && !player && !isSelected)) continue;
      const short = player && compact && !isSelected;
      const text = player
        ? (short && player.shirt_number !== null ? String(player.shirt_number) : playerLabel(player))
        : `ID ${String(id).padStart(2, "0")}`;
      context.font = `${player ? 700 : 500} 11px 'JetBrains Mono', ui-monospace, monospace`;
      const textWidth = context.measureText(text).width;
      const labelTop = top - 18 < 0 ? top + boxHeight + 3 : top - 18;
      context.fillStyle = player ? ASSIGNED : "rgba(10, 12, 12, 0.72)";
      context.fillRect(left - 1, labelTop, textWidth + 10, 15);
      context.fillStyle = player ? "#141414" : "#ffffff";
      context.fillText(text, left + 4, labelTop + 11);
    }
  }, [overlay, showBoxes, selected]);

  // Redraw on every animation frame while playing, and once whenever something that is drawn changes.
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return undefined;
    let frame = 0;
    const loop = () => {
      draw();
      setTime(video.currentTime);
      if (!video.paused && !video.ended) frame = requestAnimationFrame(loop);
    };
    const start = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(loop); };
    for (const name of ["play", "seeked", "loadeddata", "timeupdate"]) video.addEventListener(name, start);
    window.addEventListener("resize", start);
    start();
    return () => {
      cancelAnimationFrame(frame);
      for (const name of ["play", "seeked", "loadeddata", "timeupdate"]) video.removeEventListener(name, start);
      window.removeEventListener("resize", start);
    };
  }, [draw, source, tracks, players]);

  const toggle = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) void video.play().catch(() => undefined); else video.pause();
  };

  const pick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !video.videoWidth) return;
    const bounds = canvas.getBoundingClientRect();
    const scale = video.videoWidth / bounds.width;
    const track = trackAt(drawnRef.current, (event.clientX - bounds.left) * scale, (event.clientY - bounds.top) * scale, 6 * scale);
    if (track === null) {
      if (selected !== null) setSelected(null); else toggle();
      return;
    }
    video.pause();
    setSelected(track);
  };

  if (problem === "missing") {
    return (
      <div className="analysis-video-note" role="status">
        <p>{t.missing}</p>
        {matchId && <Link to={`/partidos/${matchId}`} className="btn btn-ghost btn-sm">{t.goToMatch}</Link>}
      </div>
    );
  }
  if (problem === "error") return null;   // the rest of the analysis is still useful
  if (!source) return <p className="muted" role="status">{t.loading}</p>;

  const selectedTrack = selected === null ? undefined : tracks.find((track) => track.track_id === selected);
  return (
    <div className="analysis-video">
      <div className="analysis-video-stage" style={{ aspectRatio: String(aspect) }}>
        <video ref={videoRef} src={source} playsInline preload="metadata"
          onLoadedMetadata={(event) => {
            const video = event.currentTarget;
            setDuration(Number.isFinite(video.duration) ? video.duration : 0);
            if (video.videoWidth && video.videoHeight) setAspect(video.videoWidth / video.videoHeight);
          }}
          onDurationChange={(event) => setDuration(Number.isFinite(event.currentTarget.duration) ? event.currentTarget.duration : 0)}
          onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onEnded={() => setPlaying(false)}
          onError={() => setProblem("unsupported")} />
        <canvas ref={canvasRef} onClick={pick} role="img" aria-label={t.canvasLabel} />
        {problem === "unsupported" && <p className="analysis-video-unsupported" role="alert">{t.unsupported}</p>}
      </div>

      <div className="analysis-video-controls">
        <button type="button" className="btn btn-primary btn-sm" onClick={toggle}>{playing ? t.pause : t.play}</button>
        <input type="range" min={0} max={duration || 0} step={0.01} value={Math.min(time, duration || 0)} aria-label={t.seek}
          onChange={(event) => { if (videoRef.current) videoRef.current.currentTime = Number(event.target.value); }} />
        <span className="analysis-video-time">{formatClock(time)} / {formatClock(duration)}</span>
        <label className="analysis-video-speed">
          <span>{t.speed}</span>
          <select value={speed} onChange={(event) => {
            const value = Number(event.target.value);
            setSpeed(value);
            if (videoRef.current) videoRef.current.playbackRate = value;
          }}>
            {SPEEDS.map((value) => <option key={value} value={value}>{value}×</option>)}
          </select>
        </label>
        <label className="analysis-video-check">
          <input type="checkbox" checked={showBoxes} onChange={(event) => setShowBoxes(event.target.checked)} />
          {t.showBoxes}
        </label>
      </div>

      {selectedTrack ? (
        <div className="analysis-video-pick" role="group" aria-label={t.selected(selectedTrack.track_id)}>
          <TrackPhoto analysisId={analysisId} track={selectedTrack} />
          <div className="analysis-video-pick-body">
            <p><strong>{t.selected(selectedTrack.track_id)}</strong>
              <span className="muted"> · {formatClock(selectedTrack.first_seconds)}–{formatClock(selectedTrack.last_seconds)}</span></p>
            <label>
              <span>{t.who}</span>
              <select className="track-select" value={selectedTrack.player_id ?? ""} disabled={savingId === selectedTrack.track_id}
                onChange={(event) => onAssign(selectedTrack, event.target.value)}>
                <option value="">{es.pages.analysis.unassigned}</option>
                {players.map((player) => (
                  <option key={player.id} value={player.id}>
                    {player.shirt_number !== null ? `${player.shirt_number} · ` : ""}{player.first_name} {player.last_name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setSelected(null)}>{t.close}</button>
        </div>
      ) : <p className="muted small">{t.pickHint}</p>}
      {overlay && duration > 0 && overlay.until < duration - 1 && (
        <p className="muted small">{t.coverage(formatClock(overlay.until))}</p>
      )}
    </div>
  );
}

function corners(context: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string,
  lineWidth: number, whole: boolean) {
  context.strokeStyle = color;
  context.lineWidth = lineWidth;
  if (whole) {
    context.strokeRect(x, y, w, h);
    return;
  }
  const arm = Math.max(4, Math.min(w, h) * 0.28);
  context.beginPath();
  for (const [cx, cy, dx, dy] of [[x, y, 1, 1], [x + w, y, -1, 1], [x, y + h, 1, -1], [x + w, y + h, -1, -1]]) {
    context.moveTo(cx + dx * arm, cy);
    context.lineTo(cx, cy);
    context.lineTo(cx, cy + dy * arm);
  }
  context.stroke();
}
