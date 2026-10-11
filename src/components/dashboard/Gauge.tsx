/** Half-circle gauge made of ticks (0-100 %). Ticks up to the value are lit; a pointer marks the value. */
export default function Gauge({ value, label }: { value: number; label: string }) {
  const ticks = 44;
  const lit = Math.round((Math.max(0, Math.min(100, value)) / 100) * ticks);
  const cx = 120;
  const cy = 118;
  const angleOf = (index: number) => Math.PI - (Math.PI * index) / (ticks - 1);
  const pointer = angleOf(Math.max(0, lit - 1));
  return (
    <svg viewBox="0 0 240 132" className="gauge" role="img" aria-label={`${label}: ${Math.round(value)} %`}>
      {Array.from({ length: ticks }, (_, index) => {
        const angle = angleOf(index);
        const long = index % 11 === 0;
        const inner = long ? 78 : 84;
        return (
          <line key={index} className={index < lit ? "gauge-tick is-lit" : "gauge-tick"}
            x1={cx + Math.cos(angle) * inner} y1={cy - Math.sin(angle) * inner}
            x2={cx + Math.cos(angle) * 100} y2={cy - Math.sin(angle) * 100} />
        );
      })}
      <path className="gauge-pointer" transform={`translate(${cx + Math.cos(pointer) * 68} ${cy - Math.sin(pointer) * 68}) rotate(${90 - (pointer * 180) / Math.PI})`}
        d="M0,-6 L5,4 L-5,4 Z" />
      <text className="gauge-value" x={cx} y={cy - 14} textAnchor="middle">{Math.round(value)}<tspan className="gauge-unit"> %</tspan></text>
    </svg>
  );
}
