import { useEffect, useRef } from "react";

type Props = { value: number; decimals?: number; durationMs?: number };

/** Animates a number from 0 to `value`. Writes to the DOM directly to avoid re-rendering every frame. */
export default function CountUp({ value, decimals = 0, durationMs = 1400 }: Props) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const format = (n: number) => n.toLocaleString("es-CO", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      element.textContent = format(value);
      return;
    }
    const start = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - progress, 3);
      element.textContent = format(value * eased);
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, decimals, durationMs]);

  return <span ref={ref} className="count-up">0</span>;
}
