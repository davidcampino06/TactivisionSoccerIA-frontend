import { es } from "../i18n/es";
import { setTheme, useTheme } from "../theme/theme";

/** Sun / moon switch. The new theme spreads as a circle from the switch. */
export default function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const theme = useTheme();
  const next = theme === "dark" ? "light" : "dark";
  const text = theme === "dark" ? es.app.theme.toLight : es.app.theme.toDark;
  return (
    <button type="button" className={`theme-toggle${compact ? " is-compact" : ""}`} role="switch" aria-checked={theme === "light"}
      aria-label={text} title={text}
      onClick={(event) => {
        const box = event.currentTarget.getBoundingClientRect();
        setTheme(next, { x: box.left + box.width / 2, y: box.top + box.height / 2 });
      }}>
      <span className="theme-track" aria-hidden="true">
        <span className="theme-knob">
          <svg viewBox="0 0 24 24" className="theme-sun"><circle cx="12" cy="12" r="4.5" />
            {Array.from({ length: 8 }, (_, i) => <line key={i} x1="12" y1="2.5" x2="12" y2="5" transform={`rotate(${i * 45} 12 12)`} />)}
          </svg>
          <svg viewBox="0 0 24 24" className="theme-moon"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" /></svg>
        </span>
      </span>
      {!compact && <span className="theme-label">{theme === "dark" ? es.app.theme.dark : es.app.theme.light}</span>}
    </button>
  );
}
