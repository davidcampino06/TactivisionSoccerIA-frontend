import { Link } from "react-router";
import { formatShortDate } from "./indicators";
import { Pill } from "../ui";
import { TREND_TONE } from "../../app/tones";
import { es } from "../../i18n/es";
import type { Tracking } from "../../types";

const t = es.pages.tracking;

/** Trend pill, one sentence and the analysed matches since the confirmation, each with what it showed. */
export default function TrackingSteps({ tracking, compact = false }: { tracking: Tracking; compact?: boolean }) {
  return (
    <div className={`tracking${compact ? " is-compact" : ""}`}>
      <p className="tracking-summary">
        <Pill tone={TREND_TONE[tracking.trend]}>{t.trend[tracking.trend]}</Pill>
        <span>{t.sentence(tracking.trend, tracking.measured_after, tracking.came_back, tracking.timeline.length - 1)}</span>
      </p>
      <ol className="tracking-steps" aria-label={t.steps}>
        {tracking.timeline.map((step) => (
          <li key={step.match_id} className={`tracking-step is-${step.state.toLowerCase().replace("_", "-")}`}>
            <span className="tracking-dot" aria-hidden="true" />
            <span className="tracking-text">
              <Link to={`/analisis/${step.analysis_id}`}>{es.pages.matches.vs} {step.opponent}</Link>
              <small>{formatShortDate(step.match_date)} · {t.state[step.state]}</small>
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}
