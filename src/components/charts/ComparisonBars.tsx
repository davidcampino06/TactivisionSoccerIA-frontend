import { useState } from "react";
import { es } from "../../i18n/es";
import type { ThresholdStatus } from "../../types";

export interface BarDatum {
  label: string;   // "vs Deportivo Sur"
  slot: number;    // categorical colour slot (1-4), fixed per match
  value: number | null;
  status: ThresholdStatus;
}

interface Props {
  bars: BarDatum[];
  threshold: number | null;
  riskDirection: "above" | "below";
  format: (value: number) => string;
  title: string;
}

const W = 320;
const ROW = 24;
const BAR = 12;
const M = { top: 8, right: 52, bottom: 8, left: 96 };
const t = es.pages.insights;

/** Rectangle with only the data end rounded, so the bar stays anchored to the zero line. */
function barPath(x0: number, y: number, width: number, height: number, radius = 4): string {
  if (width <= 0) return "";
  const r = Math.min(radius, width, height / 2);
  return `M${x0},${y} H${x0 + width - r} Q${x0 + width},${y} ${x0 + width},${y + r} V${y + height - r} Q${x0 + width},${y + height} ${x0 + width - r},${y + height} H${x0} Z`;
}

/** One indicator, one horizontal bar per match (one axis from 0, threshold and risky side marked). */
export default function ComparisonBars({ bars, threshold, riskDirection, format, title }: Props) {
  const [hover, setHover] = useState<number | null>(null);
  const known = bars.map((bar) => bar.value).filter((value): value is number => value !== null);
  const peak = Math.max(...known, threshold ?? 0);
  const top = peak > 0 ? peak * 1.12 : 1;
  const innerW = W - M.left - M.right;
  const H = M.top + M.bottom + ROW * bars.length;
  const x = (value: number) => M.left + (value / top) * innerW;
  const hovered = hover !== null ? bars[hover] : null;

  return (
    <div className="viz" onPointerLeave={() => setHover(null)}>
      <svg viewBox={`0 0 ${W} ${H}`} className="viz-svg" role="img" aria-label={title}>
        {threshold !== null && (
          <rect className="viz-risk" y={M.top} height={ROW * bars.length}
            x={riskDirection === "above" ? x(threshold) : M.left}
            width={riskDirection === "above" ? M.left + innerW - x(threshold) : x(threshold) - M.left} />
        )}
        <line className="viz-baseline" x1={M.left} x2={M.left} y1={M.top} y2={H - M.bottom} />
        {bars.map((bar, index) => {
          const rowY = M.top + ROW * index;
          const barY = rowY + (ROW - BAR) / 2;
          return (
            <g key={bar.label + index} className={hover === index ? "is-active" : undefined}>
              <text className="viz-axis viz-row-label" x={M.left - 8} y={rowY + ROW / 2} dy="0.32em" textAnchor="end">
                {bar.label.length > 15 ? `${bar.label.slice(0, 14)}…` : bar.label}
              </text>
              {bar.value === null ? (
                <text className="viz-axis" x={M.left + 6} y={rowY + ROW / 2} dy="0.32em">{t.noData}</text>
              ) : (
                <>
                  <path className={`viz-bar series-${bar.slot}`} d={barPath(M.left, barY, x(bar.value) - M.left, BAR)} />
                  <text className="viz-value" x={x(bar.value) + 5} y={rowY + ROW / 2} dy="0.32em">
                    {format(bar.value)}{bar.status === "EXCEEDS" ? " ⚠" : ""}
                  </text>
                </>
              )}
              <rect className="viz-hit" x={0} y={rowY} width={W} height={ROW}
                onPointerEnter={() => setHover(index)} onPointerDown={() => setHover(index)} />
            </g>
          );
        })}
        {threshold !== null && (
          <line className="viz-threshold" x1={x(threshold)} x2={x(threshold)} y1={M.top - 4} y2={H - M.bottom + 4} />
        )}
      </svg>
      {hovered && hover !== null && (
        <div className="viz-tooltip" style={{ left: "50%", top: `${((M.top + ROW * hover) / H) * 100}%` }} role="status">
          <strong>{hovered.label}</strong>
          <span>{hovered.value === null ? t.noData : format(hovered.value)}</span>
          {threshold !== null && <span className="muted">{t.threshold}: {format(threshold)}</span>}
          {hovered.status === "EXCEEDS" && <span className="viz-flag">⚠ {t.exceeds}</span>}
        </div>
      )}
    </div>
  );
}
