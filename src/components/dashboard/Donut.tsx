/** Single-value ring (0-1) with the percentage in the middle. */
export default function Donut({ value, caption, label }: { value: number; caption: string; label: string }) {
  const r = 46;
  const circumference = 2 * Math.PI * r;
  const share = Math.max(0, Math.min(1, value));
  return (
    <svg viewBox="0 0 120 120" className="donut" role="img" aria-label={`${label}: ${Math.round(share * 100)} %`}>
      <circle className="donut-track" cx="60" cy="60" r={r} />
      <circle className="donut-value" cx="60" cy="60" r={r} strokeDasharray={`${share * circumference} ${circumference}`}
        transform="rotate(-90 60 60)" />
      <text className="donut-number" x="60" y="60" textAnchor="middle">{Math.round(share * 100)}<tspan className="donut-unit">%</tspan></text>
      <text className="donut-caption" x="60" y="78" textAnchor="middle">{caption}</text>
    </svg>
  );
}
