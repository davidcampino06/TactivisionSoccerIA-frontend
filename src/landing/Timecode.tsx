import { useEffect, useRef } from "react";
import { es } from "../i18n/es";

const FPS = 30;

/** Video-style timecode (HH:MM:SS:FF) that runs while the page is open. */
export default function Timecode() {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const start = performance.now();
    let frame = 0;
    const pad = (n: number) => String(n).padStart(2, "0");
    const tick = (now: number) => {
      const totalFrames = Math.floor(((now - start) / 1000) * FPS);
      const frames = totalFrames % FPS;
      const seconds = Math.floor(totalFrames / FPS);
      if (ref.current) {
        ref.current.textContent = `${pad(Math.floor(seconds / 3600))}:${pad(Math.floor(seconds / 60) % 60)}:${pad(seconds % 60)}:${pad(frames)}`;
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <div className="timecode" aria-hidden="true">
      <span className="rec-dot" />
      <span className="timecode-label">{es.landing.frame}</span>
      <span ref={ref} className="timecode-value">00:00:00:00</span>
      <span className="timecode-fps">{FPS} FPS</span>
    </div>
  );
}
