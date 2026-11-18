import { es } from "../../i18n/es";
import { TEAM_GROUPS, type TeamGroup } from "./indicators";

/** Chips to show the indicators of our team, the rival (or team A / B when it is not known which is
 * ours) or the whole match. A group with nothing to show is left out, so the usual case is three chips. */
export default function TeamFilter({ value, onChange, counts }:
  { value: TeamGroup; onChange: (group: TeamGroup) => void; counts?: Partial<Record<TeamGroup, number>> }) {
  return (
    <div className="filter-chips" role="group" aria-label={es.pages.insights.team}>
      {TEAM_GROUPS.filter((group) => counts?.[group] !== 0 || group === value).map((group) => (
        <button key={group} type="button" className={`chip${value === group ? " selected" : ""}`} aria-pressed={value === group}
          disabled={counts?.[group] === 0} onClick={() => onChange(group)}>
          {es.pages.insights.teams[group]}
          {counts?.[group] !== undefined && <span className="chip-count">{counts[group]}</span>}
        </button>
      ))}
    </div>
  );
}
