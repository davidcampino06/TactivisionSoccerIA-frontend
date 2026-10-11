/** Small trend line; the shape changes with the seed so each module shows its own series. */
export default function Sparkline({ seed }: { seed: number }) {
  const points = Array.from({ length: 14 }, (_, index) => {
    const wave = Math.sin(index * 0.9 + seed * 1.7) * 7 + Math.sin(index * 2.3 + seed) * 4;
    const rise = index * 1.1;
    return [index * 8, 30 - (wave + rise) * 0.8] as const;
  });
  const path = points.map(([x, y], index) => `${index ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
  const [lastX, lastY] = points[points.length - 1];
  return (
    <svg className="sparkline" viewBox="-2 -6 110 48" width="112" height="48" aria-hidden="true">
      <path key={seed} d={path} pathLength={1} />
      <circle cx={lastX} cy={lastY} r="2.6" />
    </svg>
  );
}
