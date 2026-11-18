import { formatIndicatorValue, indicatorLabel } from "../../i18n/labels";

/**
 * In comparisons and evolution the backend names the indicators from the user's team ("own.", "rival.")
 * when it knows which AI team was ours in each clip; otherwise they keep "team_a." / "team_b.".
 */
export type TeamGroup = "own" | "rival" | "team_a" | "team_b" | "match";
export const TEAM_GROUPS: TeamGroup[] = ["own", "rival", "team_a", "team_b", "match"];
const TEAM_PREFIXES = new Set<string>(["own", "rival", "team_a", "team_b"]);

/** "team_a.team_width" -> "team_a", "own.team_width" -> "own"; without a team prefix: the whole match. */
export function groupOf(indicator: string): TeamGroup {
  const prefix = indicator.split(".")[0];
  return TEAM_PREFIXES.has(prefix) ? (prefix as TeamGroup) : "match";
}

/** How many indicators each group has. */
export function countByGroup(indicators: string[]): Record<TeamGroup, number> {
  const counts: Record<TeamGroup, number> = { own: 0, rival: 0, team_a: 0, team_b: 0, match: 0 };
  indicators.forEach((indicator) => { counts[groupOf(indicator)] += 1; });
  return counts;
}

// Same rule as the AI service: these are a risk when LOW, the rest when HIGH.
const RISK_WHEN_LOW = new Set([
  "team_width", "defensive_line_position", "network_average_links",
  "pressure_on_ball", "attacking_width", "players_ahead_of_ball",
]);

/** True when the value is on the risky side of its threshold. */
export function isRisky(indicator: string, value: number, threshold: number | null): boolean {
  if (threshold === null) return false;
  const base = indicator.split(".").pop() ?? indicator;
  return RISK_WHEN_LOW.has(base) ? value <= threshold : value >= threshold;
}

export const indicatorName = (indicator: string) => indicatorLabel(indicator).name;

/** Value formatter for one indicator (short: without the unit text, used on chart axes). */
export function valueFormatter(unit: string | null, withUnit = false) {
  return (value: number) => formatIndicatorValue(value, unit ?? "", withUnit && unit !== null);
}

/** Signed change: "+4 pts", "−0,12". Ratios change in percentage points. */
export function deltaFormatter(unit: string | null) {
  return (value: number) => {
    const magnitude = Math.abs(value);
    const ratio = Boolean(unit?.endsWith("_ratio"));
    const shown = ratio ? String(Math.round(magnitude * 100)) : magnitude.toLocaleString("es-CO", { maximumFractionDigits: 2 });
    // A change that rounds to zero has no direction: "±0", never "−0".
    const sign = shown === "0" ? "±" : value > 0 ? "+" : "−";
    return ratio ? `${sign}${shown} pts` : `${sign}${shown}`;
  };
}

const MONTHS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
/** "6 sep": short enough for chart axes. Match dates are local wall-clock times. */
export function formatShortDate(value: string): string {
  const date = new Date(value);
  return `${date.getDate()} ${MONTHS[date.getMonth()]}`;
}
