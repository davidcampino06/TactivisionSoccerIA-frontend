import { useEffect, useRef, useState } from "react";

/**
 * Width of an element, kept up to date with a ResizeObserver. Charts and diagrams are drawn at the
 * real size of their box, so the text keeps the same size on a phone and on a wide screen.
 */
export function useElementWidth<T extends HTMLElement>(initial: number, minimum = 240) {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(initial);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.max(minimum, Math.round(entry.contentRect.width))));
    observer.observe(element);
    return () => observer.disconnect();
  }, [minimum]);
  return [ref, width] as const;
}
