import { es } from "../../i18n/es";

const t = es.pages.comparison;

export interface ChangeRow {
  name: string;
  /** Change from the first to the last match, in percent of the first value. */
  percent: number;
  assessment: "BETTER" | "WORSE" | "SAME" | null;
  /** The change in the indicator's own unit ("+4 pts"). */
  delta: string;
}

/**
 * Differences chart: how much each indicator changed between the first and the last chosen match.
 * Percent of the first value, so indicators of different units share one scale. Bars grow to the
 * right when the value went up and to the left when it went down; the colour (and the word next to
 * the number, never the colour alone) says whether that is better or worse for the team.
 */
export default function ChangeBars({ rows }: { rows: ChangeRow[] }) {
  const top = Math.max(1, ...rows.map((row) => Math.abs(row.percent)));
  return (
    <ul className="change-bars">
      {rows.map((row) => {
        const share = (Math.abs(row.percent) / top) * 50;
        const tone = row.assessment === "BETTER" ? "better" : row.assessment === "WORSE" ? "worse" : "same";
        const sign = row.percent > 0 ? "+" : row.percent < 0 ? "−" : "±";
        return (
          <li key={row.name} className={`change-row is-${tone}`}>
            <span className="change-name">{row.name}</span>
            <span className="change-track" aria-hidden="true">
              <span className="change-bar" style={row.percent >= 0 ? { left: "50%", width: `${share}%` } : { right: "50%", width: `${share}%` }} />
            </span>
            <span className="change-value">
              <strong>{sign}{Math.abs(row.percent).toLocaleString("es-CO", { maximumFractionDigits: 1 })} %</strong>
              <small>{row.delta} · {t.assessment[row.assessment ?? "SAME"]}</small>
            </span>
          </li>
        );
      })}
    </ul>
  );
}
