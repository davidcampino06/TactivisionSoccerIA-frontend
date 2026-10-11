import { useSyncExternalStore } from "react";
import { flushSync } from "react-dom";

/**
 * Light / dark theme for the app. The choice is saved in this browser; without a saved choice
 * the operating system preference is used (and followed if it changes).
 * The theme is the `data-theme` attribute of <html>, which the CSS tokens read.
 */
export type Theme = "light" | "dark";

const KEY = "tactivision-theme";
const listeners = new Set<() => void>();
const media = typeof window !== "undefined" ? window.matchMedia("(prefers-color-scheme: light)") : null;

function saved(): Theme | null {
  try {
    const value = localStorage.getItem(KEY);
    return value === "light" || value === "dark" ? value : null;
  } catch {
    return null; // storage blocked (private mode, previews)
  }
}

let current: Theme = saved() ?? (media?.matches ? "light" : "dark");

function apply(theme: Theme) {
  current = theme;
  document.documentElement.dataset.theme = theme;
  listeners.forEach((listener) => listener());
}

/** Call once before the first render, so the page never flashes the wrong theme. */
export function initTheme() {
  document.documentElement.dataset.theme = current;
  media?.addEventListener("change", (event) => {
    if (!saved()) apply(event.matches ? "light" : "dark");
  });
}

/**
 * Switches theme. With the View Transitions API the new theme is revealed as a circle that grows
 * from the button that was clicked; otherwise it switches instantly.
 */
export function setTheme(theme: Theme, origin?: { x: number; y: number }) {
  try {
    localStorage.setItem(KEY, theme);
  } catch {
    /* the theme still changes for this visit */
  }
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!document.startViewTransition || reduced || !origin) {
    apply(theme);
    return;
  }
  const transition = document.startViewTransition(() => flushSync(() => apply(theme)));
  const radius = Math.hypot(Math.max(origin.x, innerWidth - origin.x), Math.max(origin.y, innerHeight - origin.y));
  transition.ready.then(() => {
    document.documentElement.animate(
      { clipPath: [`circle(0px at ${origin.x}px ${origin.y}px)`, `circle(${radius}px at ${origin.x}px ${origin.y}px)`] },
      { duration: 650, easing: "cubic-bezier(0.7, 0, 0.2, 1)", pseudoElement: "::view-transition-new(root)" },
    );
  }).catch(() => undefined);
}

export function useTheme(): Theme {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => current,
  );
}
