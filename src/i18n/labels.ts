import { es } from "./es";

type LabelGroup = keyof typeof es.labels;

/** Spanish label for a backend code (status, role, severity...). Unknown codes are shown as they are. */
export function label(group: LabelGroup, code: string | null | undefined): string {
  if (!code) return "—";
  const map = es.labels[group] as unknown as Record<string, string>;
  return map[code] ?? code;
}

/** "team_a.team_width" -> { team: "Equipo A", name: "Ancho del equipo" } */
export function indicatorLabel(fullName: string): { team: string; name: string } {
  const [prefix, ...rest] = fullName.split(".");
  const key = rest.length ? rest.join(".") : prefix;
  const team = rest.length ? label("team", prefix) : "";
  return { team, name: es.labels.indicator[key] ?? key.replaceAll("_", " ") };
}

export function unitLabel(unit: string): string {
  return es.labels.unit[unit] ?? unit;
}

const dateFormat = new Intl.DateTimeFormat("es-CO", { day: "numeric", month: "short", year: "numeric" });
const dateTimeFormat = new Intl.DateTimeFormat("es-CO", { dateStyle: "medium", timeStyle: "short" });

// Match dates are typed by the user in local time and come back without a time zone: show them as they are.
export const formatDate = (value: string | Date) => dateFormat.format(new Date(value));
export const formatDateTime = (value: string | Date) => dateTimeFormat.format(new Date(value));

/** Server timestamps (created, uploaded, completed) are UTC without a zone marker: read them as UTC. */
export function parseServerTime(value: string): Date {
  return new Date(/[zZ]|[+-]\d{2}:?\d{2}$/.test(value) ? value : `${value}Z`);
}
export const formatTimestamp = (value: string) => dateTimeFormat.format(parseServerTime(value));
export const formatServerDate = (value: string) => dateFormat.format(parseServerTime(value));
export const formatNumber = (value: number, digits = 2) =>
  value.toLocaleString("es-CO", { minimumFractionDigits: digits, maximumFractionDigits: digits });
export const formatPercent = (value: number) => `${Math.round(value * 100)} %`;
export const formatFileSize = (bytes: number) => `${formatNumber(bytes / 1_048_576, 1)} MB`;

/** Indicator value with its unit: ratios as percentages ("42 % del ancho de imagen"), counts as numbers. */
export function formatIndicatorValue(value: number, unit: string, withUnit = true): string {
  const number = unit.endsWith("_ratio") ? formatPercent(value) : formatNumber(value);
  return withUnit ? `${number} ${unitLabel(unit)}` : number;
}
