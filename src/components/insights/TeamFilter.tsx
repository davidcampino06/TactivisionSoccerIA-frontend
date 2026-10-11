import { es } from "../../i18n/es";
import { TEAM_GROUPS, type TeamGroup } from "./indicators";

/** Chips to show the indicators of team A, team B or the whole match. */
export default function TeamFilter({ value, onChange, counts }:
  { value: TeamGroup; onChange: (group: TeamGroup) => void; counts?: Partial<Record<TeamGroup, number>> }) {
  return (
    <div className="filter-chips" role="group" aria-label={es.pages.insights.team}>
      {TEAM_GROUPS.map((group) => (
        <button key={group} type="button" className={`chip${value === group ? " selected" : ""}`} aria-pressed={value === group}
          disabled={counts?.[group] === 0} onClick={() => onChange(group)}>
          {es.pages.insights.teams[group]}
          {counts?.[group] !== undefined && <span className="chip-count">{counts[group]}</span>}
        </button>
      ))}
    </div>
  );
}
