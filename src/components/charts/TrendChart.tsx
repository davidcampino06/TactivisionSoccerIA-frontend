import { useState } from "react";
import { es } from "../../i18n/es";
import type { ThresholdStatus } from "../../types";

export interface TrendPoint {
  label: string;       // "vs Deportivo Sur"
  shortLabel: string;  // "8 sep"
  value: number | null;
  delta: number | null;
  status: ThresholdStatus;
}

interface Props {
  points: TrendPoint[];
  threshold: number | null;
  riskDirection: "above" | "below";
  format: (value: number) => string;
  formatDelta: (value: number) => string;
  title: string;
}

const W = 320;
const H = 168;
const M = { top: 14, right: 14, bottom: 28, left: 40 };
const t = es.pages.insights;

/**
 * Small-multiple line chart: one indicator across matches (single series, one axis from 0).
 * The risky side of the threshold is shaded; hovering a match shows its value and change.
 */
export default function TrendChart({ points, threshold, riskDirection, format, formatDelta, title }: Props) {
  const [hover, setHover] = useState<number | null>(null);
  const known = points.map((point) => point.value).filter((value): value is number => value !== null);
  // With every value at 0 the scale would collapse: fall back to 0-1 (0-100 % for ratios).
  const peak = Math.max(...known, threshold ?? 0);
  const top = peak > 0 ? peak * 1.15 : 1;
  const innerW = W - M.left - M.right;
  const innerH = H - M.top - M.bottom;
  const x = (index: number) => M.left + (points.length === 1 ? innerW / 2 : (innerW * index) / (points.length - 1));
  const y = (value: number) => M.top + innerH - (value / top) * innerH;

  // Line segments, broken where a match has no value.
  const segments: string[] = [];
  let current = "";
  points.forEach((point, index) => {
    if (point.value === null) {
      if (current) segments.push(current);
      current = "";
      return;
    }
    current += `${current ? "L" : "M"}${x(index).toFixed(1)},${y(point.value).toFixed(1)}`;
  });
  if (current) segments.push(current);

  const ticks = [0, top / 2, top];
  const lastIndex = points.map((point) => point.value !== null).lastIndexOf(true);
  const showAllLabels = points.length <= 6;
  const hovered = hover !== null ? points[hover] : null;
  const band = points.length > 1 ? innerW / (points.length - 1) : innerW;

  return (
    <div className="viz" onPointerLeave={() => setHover(null)}>
      <svg viewBox={`0 0 ${W} ${H}`} className="viz-svg" role="img" aria-label={title}>
        {threshold !== null && (
          <rect className="viz-risk" x={M.left} width={innerW}
            y={riskDirection === "above" ? M.top : y(threshold)}
            height={riskDirection === "above" ? y(threshold) - M.top : M.top + innerH - y(threshold)} />
        )}
        {ticks.map((tick) => (
          <g key={tick}>
            <line className="viz-grid" x1={M.left} x2={W - M.right} y1={y(tick)} y2={y(tick)} />
            <text className="viz-axis" x={M.left - 6} y={y(tick)} dy="0.32em" textAnchor="end">{format(tick)}</text>
          </g>
        ))}
        {threshold !== null && (
          <g>
            <line className="viz-threshold" x1={M.left} x2={W - M.right} y1={y(threshold)} y2={y(threshold)} />
            <text className="viz-threshold-label" x={M.left + 4} y={y(threshold) - 4}>{t.threshold.toLowerCase()}</text>
          </g>
        )}
        {hover !== null && <line className="viz-guide" x1={x(hover)} x2={x(hover)} y1={M.top} y2={M.top + innerH} />}
        {segments.map((d) => <path key={d} className="viz-line" d={d} />)}
        {points.map((point, index) => point.value !== null && (
          <circle key={index} className={`viz-dot${hover === index ? " is-active" : ""}`} cx={x(index)} cy={y(point.value)} r={4} />
        ))}
        {lastIndex >= 0 && hover === null && (
          <text className="viz-value" x={x(lastIndex)} y={y(points[lastIndex].value!) - 9}
            textAnchor={lastIndex === points.length - 1 && points.length > 1 ? "end" : "middle"}>
            {format(points[lastIndex].value!)}
          </text>
        )}
        {points.map((point, index) => (showAllLabels || index === 0 || index === points.length - 1) && (
          <text key={index} className="viz-axis" x={x(index)} y={H - 8}
            textAnchor={points.length > 1 && index === 0 ? "start" : points.length > 1 && index === points.length - 1 ? "end" : "middle"}>
            {point.shortLabel}
          </text>
        ))}
        {/* Hit areas wider than the marks */}
        {points.map((_, index) => (
          <rect key={index} className="viz-hit" x={x(index) - band / 2} y={M.top} width={band} height={innerH + M.bottom}
            onPointerEnter={() => setHover(index)} onPointerDown={() => setHover(index)} />
        ))}
      </svg>
      {hovered && hover !== null && (
        <div className="viz-tooltip" style={{ left: `${(x(hover) / W) * 100}%` }} role="status">
          <strong>{hovered.label}</strong>
          <span>{hovered.value === null ? t.noData : format(hovered.value)}</span>
          {hovered.delta !== null && <span className="muted">{es.pages.evolution.delta}: {formatDelta(hovered.delta)}</span>}
          {hovered.status === "EXCEEDS" && <span className="viz-flag">⚠ {t.exceeds}</span>}
        </div>
      )}
    </div>
  );
}
