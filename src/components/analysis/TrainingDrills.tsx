import { es } from "../../i18n/es";
import type { TrainingDrill as Drill } from "../../types";

const t = es.trainingDrill;

/**
 * The suggested exercises of a possible issue, folded under the recommendation so the card stays short:
 * the main one first and the alternatives after it, each one opening on its own.
 */
export default function TrainingDrills({ drills }: { drills: Drill[] }) {
  if (drills.length === 0) return null;
  return (
    <section className="drills" aria-label={t.heading(drills.length)}>
      <p className="drills-title">{t.heading(drills.length)}</p>
      {drills.map((drill, index) => (
        <details key={drill.name} className="drill">
          <summary>
            <span className="drill-tag">{index === 0 ? t.main : t.alternative}</span>
            {drill.name}
          </summary>
          <dl>
            <dt>{t.objective}</dt><dd>{drill.objective}</dd>
            <dt>{t.organization}</dt><dd>{drill.organization}</dd>
            <dt>{t.development}</dt><dd>{drill.development}</dd>
            <dt>{t.keys}</dt>
            <dd><ul>{drill.keys.map((key) => <li key={key}>{key}</li>)}</ul></dd>
            <dt>{t.variant}</dt><dd>{drill.variant}</dd>
          </dl>
        </details>
      ))}
      <p className="drill-note">{drills[0].note}</p>
    </section>
  );
}
