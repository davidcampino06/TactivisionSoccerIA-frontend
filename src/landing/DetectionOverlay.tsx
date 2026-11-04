import { es } from "../i18n/es";
import type { Detection } from "./slides";

type Props = { detections: Detection[]; links?: [number, number][] };

const LABELS: Record<Detection["kind"], (box: Detection) => string> = {
  player: (box) => `${es.detections.player} ${String(box.trackId).padStart(2, "0")}`,
  ball: () => es.detections.ball,
  staff: () => es.detections.staff,
};

/** Anchor point used for links: the feet of a player, the center of the ball. */
const anchor = (box: Detection) => ({
  x: box.x + box.w / 2,
  y: box.kind === "ball" ? box.y + box.h / 2 : box.y + box.h,
});

/** Detection boxes drawn over a photo, appearing one by one like a model scanning the frame. */
export default function DetectionOverlay({ detections, links = [] }: Props) {
  const linksDelay = 450 + detections.length * 140;
  return (
    <div className="detections">
      <div className="scanline" />
      {links.length > 0 && (
        <svg className="detection-links" viewBox="0 0 100 100" preserveAspectRatio="none" style={{ animationDelay: `${linksDelay}ms` }}>
          {links.map(([from, to]) => {
            const a = anchor(detections[from]);
            const b = anchor(detections[to]);
            return <line key={`${from}-${to}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} />;
          })}
        </svg>
      )}
      {detections.map((box, position) => (
        <div
          key={`${box.trackId}-${position}`}
          className={`detection ${box.kind}${box.y < 5 ? " label-inside" : ""}`}
          style={{
            left: `${box.x}%`,
            top: `${box.y}%`,
            width: `${box.w}%`,
            height: `${box.h}%`,
            animationDelay: `${450 + position * 140}ms`,
          }}
        >
          <span className="detection-label">
            {LABELS[box.kind](box)} · {box.confidence.toFixed(2)}
          </span>
        </div>
      ))}
    </div>
  );
}
