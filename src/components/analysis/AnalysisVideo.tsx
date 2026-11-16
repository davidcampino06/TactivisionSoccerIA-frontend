import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Link } from "react-router";
import { ApiError, api, apiUrl } from "../../api/client";
import { es } from "../../i18n/es";
import type { Player, Track, TrackRole } from "../../types";
import { formatClock } from "./clock";
import { boxesAt, fitRect, type Overlay, type OverlayBox } from "./overlay";
import { trackLabel, type LabelKind } from "./trackLabel";
import TrackPhoto from "./TrackPhoto";

const t = es.pages.analysis.video;
const SPEEDS = [0.1, 0.25, 0.5, 1];
const COLORS: Record<LabelKind, { box: string; tag: string; text: string }> = {
  unknown: { box: "rgba(255, 255, 255, 0.9)", tag: "rgba(10, 12, 12, 0.72)", text: "#ffffff" },
  player: { box: "#f2b544", tag: "#f2b544", text: "#141414" },
  number: { box: "#f2b544", tag: "#f2b544", text: "#141414" },
  referee: { box: "#5fb3ff", tag: "#5fb3ff", text: "#0b1a2a" },
  other: { box: "rgba(255, 255, 255, 0.35)", tag: "rgba(10, 12, 12, 0.6)", text: "rgba(255, 255, 255, 0.7)" },
};

export interface IdentityChange { role: TrackRole; shirt_number: number | null }

type Props = {
  analysisId: string;
  videoId: string;
  matchId?: string;
  tracks: Track[];
  players: Player[];
  savingId: number | null;
  onAssign: (track: Track, playerId: string) => void;
  onIdentity: (track: Track, change: IdentityChange) => Promise<void>;
};

/** A drawn box and its label, in pixels of the element, to know what was touched. */
interface Hit { id: number; box: [number, number, number, number]; tag: [number, number, number, number] }

/**
 * The uploaded clip, playing with what the AI saw drawn on top (the detections stored with the
 * analysis, moved between analysed frames by `boxesAt`), in the style of the landing page. Touching
 * a box or its "ID" label pauses the video and opens a small editor right there: type the shirt
 * number and the label follows that player for the whole track, or mark the referee or someone
 * outside the game.
 */
export default function AnalysisVideo({ analysisId, videoId, matchId, tracks, players, savingId, onAssign, onIdentity }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hitsRef = useRef<Hit[]>([]);
  const [source, setSource] = useState<string | null>(null);
  const [problem, setProblem] = useState<"missing" | "unsupported" | "error" | null>(null);
  const [overlay, setOverlay] = useState<Overlay | null>(null);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [aspect, setAspect] = useState(16 / 9);
  const [speed, setSpeed] = useState(1);
  const [showBoxes, setShowBoxes] = useState(true);
  const [selected, setSelected] = useState<{ id: number; x: number; y: number } | null>(null);

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

  const byTrack = useMemo(() => new Map(tracks.map((track) => [track.track_id, track])), [tracks]);
  const byPlayer = useMemo(() => new Map(players.map((player) => [player.id, player])), [players]);

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
    const boxes: OverlayBox[] = overlay && showBoxes && video.videoWidth ? boxesAt(overlay, video.currentTime) : [];
    // The picture keeps its proportions inside the element: scale and shift the boxes the same way.
    const fit = fitRect(width, height, video.videoWidth, video.videoHeight);
    const compact = width < 560;   // on a phone only identified players carry a label
    const hits: Hit[] = [];
    context.font = "500 10px 'JetBrains Mono', ui-monospace, monospace";
    for (const [x, y, w, h, id, kind, confidence] of boxes) {
      const left = fit.x + x * fit.scale;
      const top = fit.y + y * fit.scale;
      const boxWidth = w * fit.scale;
      const boxHeight = h * fit.scale;
      if (kind === "B") {
        context.strokeStyle = "rgba(255, 255, 255, 0.95)";
        context.lineWidth = 1.5;
        context.beginPath();
        context.arc(left + boxWidth / 2, top + boxHeight / 2, Math.max(boxWidth, boxHeight) / 2 + 3, 0, Math.PI * 2);
        context.stroke();
        continue;
      }
      if (id === null) {
        corners(context, left, top, boxWidth, boxHeight, "rgba(255, 255, 255, 0.4)", 1.2, false);
        continue;
      }
      const label = trackLabel(byTrack.get(id), id, byPlayer, confidence);
      const colors = COLORS[label.kind];
      const isSelected = selected?.id === id;
      corners(context, left, top, boxWidth, boxHeight, colors.box, isSelected ? 2.6 : 1.5, isSelected);
      const known = label.kind !== "unknown";
      const showTag = isSelected || !compact || (known && label.kind !== "other");
      let tag: Hit["tag"] = [left, top - 16, 0, 0];
      if (showTag) {
        context.font = `${known ? 700 : 500} ${known ? 11 : 10}px 'JetBrains Mono', ui-monospace, monospace`;
        const text = compact && label.kind === "player" && !isSelected ? label.text.split(" · ")[0] : label.text;
        const tagWidth = context.measureText(text).width + 8;
        const tagTop = top - 16 < 0 ? top + boxHeight + 2 : top - 16;
        tag = [left - 1, tagTop, tagWidth, 14];
        context.fillStyle = colors.tag;
        context.fillRect(tag[0], tag[1], tag[2], tag[3]);
        context.fillStyle = colors.text;
        context.fillText(text, left + 3, tagTop + 10.5);
      }
      hits.push({ id, box: [left, top, boxWidth, boxHeight], tag });
    }
    hitsRef.current = hits;
  }, [overlay, showBoxes, selected, byTrack, byPlayer]);

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
    const events = ["play", "seeked", "loadeddata", "timeupdate"];
    for (const name of events) video.addEventListener(name, start);
    window.addEventListener("resize", start);
    start();
    return () => {
      cancelAnimationFrame(frame);
      for (const name of events) video.removeEventListener(name, start);
      window.removeEventListener("resize", start);
    };
  }, [draw, source]);

  const toggle = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) void video.play().catch(() => undefined); else video.pause();
  };

  const pick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const bounds = canvas.getBoundingClientRect();
    const x = event.clientX - bounds.left;
    const y = event.clientY - bounds.top;
    const inside = (rect: number[], pad = 0) =>
      x >= rect[0] - pad && x <= rect[0] + rect[2] + pad && y >= rect[1] - pad && y <= rect[1] + rect[3] + pad;
    // The label wins (it is what people aim at), then the smallest box under the pointer.
    const onTag = hitsRef.current.find((hit) => hit.tag[2] > 0 && inside(hit.tag, 2));
    const onBox = hitsRef.current.filter((hit) => inside(hit.box, 4))
      .sort((a, b) => a.box[2] * a.box[3] - b.box[2] * b.box[3])[0];
    const hit = onTag ?? onBox;
    if (!hit) {
      if (selected) setSelected(null); else toggle();
      return;
    }
    videoRef.current?.pause();
    setSelected({ id: hit.id, x: hit.box[0] / bounds.width, y: (hit.box[1] + hit.box[3]) / bounds.height });
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

  const selectedTrack = selected ? byTrack.get(selected.id) : undefined;
  return (
    <div className="analysis-video">
      <div className="analysis-video-frame">
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
        {selected && selectedTrack && (
          <LabelEditor key={selected.id} track={selectedTrack} saving={savingId === selected.id}
            position={{ left: `${Math.min(selected.x, 0.7) * 100}%`, top: `${Math.min(selected.y, 0.86) * 100}%` }}
            onSave={(change) => onIdentity(selectedTrack, change)} onClose={() => setSelected(null)} />
        )}
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
            {SPEEDS.map((value) => <option key={value} value={value}>{String(value).replace(".", ",")}×</option>)}
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
        </div>
      ) : <p className="muted small">{t.pickHint}</p>}
      {overlay && duration > 0 && overlay.until < duration - 1 && (
        <p className="muted small">{t.coverage(formatClock(overlay.until))}</p>
      )}
    </div>
  );
}

/** Small editor that opens on the touched box: the shirt number, or "not a player". */
export function LabelEditor({ track, position, saving, onSave, onClose }: {
  track: Track; position: { left: string; top: string }; saving: boolean;
  onSave: (change: IdentityChange) => Promise<void>; onClose: () => void;
}) {
  const [number, setNumber] = useState(track.player_number === null || track.player_number === undefined ? "" : String(track.player_number));
  const [error, setError] = useState("");
  const save = async (change: IdentityChange) => {
    setError("");
    try {
      await onSave(change);
      onClose();
    } catch {
      setError(t.labelNotSaved);
    }
  };
  const submit = (event: FormEvent) => {
    event.preventDefault();
    const value = number.trim();
    if (value !== "" && !/^\d{1,2}$/.test(value)) { setError(t.numberRule); return; }
    void save({ role: "PLAYER", shirt_number: value === "" ? null : Number(value) });
  };
  return (
    <form className="label-editor" style={position} onSubmit={submit} aria-label={t.editLabel(track.track_id)}>
      <label>
        <span>{t.shirt}</span>
        <input inputMode="numeric" autoFocus value={number} maxLength={2} placeholder="10"
          onChange={(event) => setNumber(event.target.value.replace(/\D/g, "").slice(0, 2))} />
      </label>
      <button className="btn btn-primary btn-sm" disabled={saving}>{t.saveNumber}</button>
      <div className="label-editor-roles">
        <button type="button" className={`btn btn-ghost btn-sm${track.role === "REFEREE" ? " is-on" : ""}`} disabled={saving}
          onClick={() => void save({ role: "REFEREE", shirt_number: null })}>{t.referee}</button>
        <button type="button" className={`btn btn-ghost btn-sm${track.role === "OTHER" ? " is-on" : ""}`} disabled={saving}
          onClick={() => void save({ role: "OTHER", shirt_number: null })}>{t.outsider}</button>
        <button type="button" className="btn btn-ghost btn-sm" onClick={onClose} aria-label={t.close}>✕</button>
      </div>
      {error && <p className="field-error" role="alert">{error}</p>}
      <p className="muted small">{t.followsTrack}</p>
    </form>
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
