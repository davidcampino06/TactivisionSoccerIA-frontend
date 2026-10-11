import { es } from "../../i18n/es";

export interface ThresholdBar {
  label: string;
  value: number;
  threshold: number | null;
  risky: boolean;
  text: string;
}

/** Broadcast-style bars: value on a 0-max track with a tick at the threshold (ref. SAP Laufleistung). */
export default function ThresholdBars({ bars }: { bars: ThresholdBar[] }) {
  return (
    <ul className="tbars">
      {bars.map((bar) => {
        const max = Math.max(bar.value, bar.threshold ?? 0, 1e-6) * 1.25;
        return (
          <li key={bar.label}>
            <div className="tbars-head">
              <span>{bar.label}</span>
              <strong className={bar.risky ? "is-risky" : undefined}>{bar.text}{bar.risky ? " ⚠" : ""}</strong>
            </div>
            <div className="tbars-track" role="img" aria-label={`${bar.label}: ${bar.text}${bar.risky ? `, ${es.pages.insights.exceeds}` : ""}`}>
              <span className={`tbars-fill${bar.risky ? " is-risky" : ""}`} style={{ width: `${(bar.value / max) * 100}%` }} />
              {bar.threshold !== null && <span className="tbars-mark" style={{ left: `${(bar.threshold / max) * 100}%` }} />}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
