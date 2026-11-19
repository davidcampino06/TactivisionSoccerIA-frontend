import { es } from "../../i18n/es";
import type { TrainingDrill as Drill } from "../../types";

const t = es.trainingDrill;

/** The suggested exercise of a possible issue, folded under the recommendation so the card stays short. */
export default function TrainingDrill({ drill }: { drill: Drill }) {
  return (
    <details className="drill">
      <summary>{t.title(drill.name)}</summary>
      <dl>
        <dt>{t.objective}</dt><dd>{drill.objective}</dd>
        <dt>{t.organization}</dt><dd>{drill.organization}</dd>
        <dt>{t.development}</dt><dd>{drill.development}</dd>
        <dt>{t.keys}</dt>
        <dd><ul>{drill.keys.map((key) => <li key={key}>{key}</li>)}</ul></dd>
        <dt>{t.variant}</dt><dd>{drill.variant}</dd>
      </dl>
      <p className="drill-note">{drill.note}</p>
    </details>
  );
}
