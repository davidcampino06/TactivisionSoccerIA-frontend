import { useEffect, useRef, useState } from "react";
import { es } from "../i18n/es";

const t = es.landing.hero;
const VIDEO = "/hero/entrenamiento";

/** [x, y, width, height] as fractions of the frame, the ByteTrack id (null if not confirmed yet) and the confidence. */
type Box = [number, number, number, number, number | null, number];

interface Detections {
  model: string;
  tracker: string;
  fps: number;
  stride: number;
  aspect: number;
  players_median: number;
  tracks: number;
  mean_confidence: number;
  frames: Box[][];
}

/**
 * First screen of the landing: a training clip playing in a loop with the boxes the AI really found
 * in it (YOLO26n + ByteTrack, exported once from the same pipeline the app uses), drawn in sync with
 * the video. The numbers at the bottom come from that same run: nothing on this screen is made up.
 */
export default function VideoHero({ paused, onStart, onLogin }: { paused: boolean; onStart: () => void; onLogin: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [detections, setDetections] = useState<Detections | null>(null);
  const [userPaused, setUserPaused] = useState(false);
  const reducedMotion = usePrefersReducedMotion();
  const stopped = paused || userPaused || reducedMotion;

  useEffect(() => {
    let cancelled = false;
    fetch(`${VIDEO}-detecciones.json`)
      .then((response) => (response.ok ? response.json() : null))
      .then((data: Detections | null) => { if (!cancelled) setDetections(data); })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (stopped) video.pause();
    else void video.play().catch(() => undefined);
  }, [stopped]);

  // Draws the boxes of the frame being shown, mapped like object-fit: cover.
  useEffect(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !detections) return;
    let frame = 0;
    const draw = () => {
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
      const scale = Math.max(width / detections.aspect, height);
      const shownWidth = detections.aspect * scale;
      const offsetX = (width - shownWidth) / 2;
      const offsetY = (height - scale) / 2;
      const index = Math.min(detections.frames.length - 1,
        Math.floor((video.currentTime * detections.fps) / detections.stride));
      for (const [x, y, w, h, id, confidence] of detections.frames[index] ?? []) {
        const left = offsetX + x * shownWidth;
        const top = offsetY + y * scale;
        const boxWidth = w * shownWidth;
        const boxHeight = h * scale;
        drawCorners(context, left, top, boxWidth, boxHeight, id === null ? 0.45 : 0.9);
        if (id !== null && boxHeight > 18) {
          context.font = "500 10px 'JetBrains Mono', ui-monospace, monospace";
          context.fillStyle = "rgba(255, 255, 255, 0.85)";
          context.fillText(`ID ${String(id).padStart(2, "0")} · ${confidence.toFixed(2)}`, left, top - 4);
        }
      }
      if (!video.paused) frame = requestAnimationFrame(draw);
    };
    const start = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(draw); };
    video.addEventListener("play", start);
    video.addEventListener("seeked", start);
    video.addEventListener("loadeddata", start);
    window.addEventListener("resize", start);
    start();
    return () => {
      cancelAnimationFrame(frame);
      video.removeEventListener("play", start);
      video.removeEventListener("seeked", start);
      video.removeEventListener("loadeddata", start);
      window.removeEventListener("resize", start);
    };
  }, [detections]);

  return (
    <section id="inicio" className="vhero" aria-label={t.label}>
      <div className={`vhero-media${stopped ? " is-still" : ""}`} aria-hidden="true">
        <video ref={videoRef} className="vhero-video" poster={`${VIDEO}-poster.jpg`} muted loop playsInline
          autoPlay={!stopped} preload="auto">
          <source src={`${VIDEO}.webm`} type="video/webm" />
          <source src={`${VIDEO}.mp4`} type="video/mp4" />
        </video>
        <canvas ref={canvasRef} className="vhero-boxes" />
      </div>
      <div className="vhero-shade" aria-hidden="true" />

      <div className="vhero-copy">
        <p className="vhero-eyebrow">{t.eyebrow}</p>
        <h1 className="vhero-title">{t.title}</h1>
        <p className="vhero-body">
          {t.body[0]}<strong>{t.body[1]}</strong>{t.body[2]}<strong>{t.body[3]}</strong>{t.body[4]}
        </p>
        <div className="vhero-actions">
          <button type="button" className="cta-primary" onClick={onStart}>
            {es.landing.start}
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
          <button type="button" className="cta-ghost" onClick={onLogin}>{es.landing.login}</button>
        </div>
        <ul className="vhero-points">
          {t.points.map((point, index) => (
            <li key={point}>
              <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
                <path d={POINT_ICONS[index]} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {point}
            </li>
          ))}
        </ul>
      </div>

      <div className="vhero-bottom">
        <div className="vhero-proof">
          <p className="vhero-proof-title">{t.proofTitle}</p>
          {detections ? (
            <p className="vhero-proof-stats">
              <span><strong>{detections.players_median}</strong> {t.players}</span>
              <span><strong>{detections.tracks}</strong> {t.tracks}</span>
              <span><strong>{Math.round(detections.mean_confidence * 100)} %</strong> {t.confidence}</span>
            </p>
          ) : <p className="vhero-proof-stats">{t.loading}</p>}
          <p className="vhero-proof-source">{t.proofSource}</p>
        </div>
        <div className="vhero-side">
          <button type="button" className="vhero-toggle" onClick={() => setUserPaused((value) => !value)}
            aria-pressed={userPaused} disabled={reducedMotion}>
            {userPaused || reducedMotion ? t.play : t.pause}
          </button>
          <a href="#como-funciona" className="vhero-next">{t.next} <span aria-hidden="true">↓</span></a>
        </div>
      </div>
    </section>
  );
}

const POINT_ICONS = [
  "M4 7V4h3M17 4h3v3M20 17v3h-3M7 20H4v-3M9 9h6v6H9z",           // detection
  "M12 3l8 4v5c0 4.5-3.4 8.3-8 9-4.6-.7-8-4.5-8-9V7zM9 12l2 2 4-4", // reviewed by a person
  "M7 3h7l5 5v13H7zM14 3v5h5M10 13h6M10 17h6",                     // match plan
];

function drawCorners(context: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, alpha: number) {
  const arm = Math.max(4, Math.min(w, h) * 0.28);
  context.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
  context.lineWidth = 1.5;
  context.beginPath();
  for (const [cx, cy, dx, dy] of [[x, y, 1, 1], [x + w, y, -1, 1], [x, y + h, 1, -1], [x + w, y + h, -1, -1]]) {
    context.moveTo(cx + dx * arm, cy);
    context.lineTo(cx, cy);
    context.lineTo(cx, cy + dy * arm);
  }
  context.stroke();
}

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() =>
    typeof window !== "undefined" && typeof window.matchMedia === "function"
      ? window.matchMedia("(prefers-reduced-motion: reduce)").matches : false);
  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(query.matches);
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  return reduced;
}
