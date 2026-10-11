import { formatIndicatorValue, indicatorLabel } from "../../i18n/labels";

export type TeamGroup = "team_a" | "team_b" | "match";
export const TEAM_GROUPS: TeamGroup[] = ["team_a", "team_b", "match"];

/** "team_a.team_width" -> "team_a"; indicators without a team prefix belong to the whole match. */
export function groupOf(indicator: string): TeamGroup {
  const prefix = indicator.split(".")[0];
  return prefix === "team_a" || prefix === "team_b" ? prefix : "match";
}

/** How many indicators each group has. */
export function countByGroup(indicators: string[]): Record<TeamGroup, number> {
  const counts: Record<TeamGroup, number> = { team_a: 0, team_b: 0, match: 0 };
  indicators.forEach((indicator) => { counts[groupOf(indicator)] += 1; });
  return counts;
}

export const indicatorName = (indicator: string) => indicatorLabel(indicator).name;

/** Value formatter for one indicator (short: without the unit text, used on chart axes). */
export function valueFormatter(unit: string | null, withUnit = false) {
  return (value: number) => formatIndicatorValue(value, unit ?? "", withUnit && unit !== null);
}

/** Signed change: "+4 pts", "−0,12". Ratios change in percentage points. */
export function deltaFormatter(unit: string | null) {
  return (value: number) => {
    const sign = value > 0 ? "+" : value < 0 ? "−" : "±";
    const magnitude = Math.abs(value);
    if (unit?.endsWith("_ratio")) return `${sign}${Math.round(magnitude * 100)} pts`;
    return `${sign}${magnitude.toLocaleString("es-CO", { maximumFractionDigits: 2 })}`;
  };
}

const MONTHS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
/** "6 sep": short enough for chart axes. Match dates are local wall-clock times. */
export function formatShortDate(value: string): string {
  const date = new Date(value);
  return `${date.getDate()} ${MONTHS[date.getMonth()]}`;
}
