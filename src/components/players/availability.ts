import { es } from "../../i18n/es";
import { formatDate, label } from "../../i18n/labels";
import type { Player, PlayerStatus } from "../../types";

const t = es.pages.player;

/** Statuses of a player who belongs to the squad but cannot play now (injury, cards, other reasons). */
export const UNAVAILABLE_STATUSES: readonly PlayerStatus[] = ["INJURED", "SUSPENDED", "UNAVAILABLE"];

export const isUnavailable = (player: Pick<Player, "status">) => UNAVAILABLE_STATUSES.includes(player.status);

/** "2026-11-01" is a calendar day: read it in local time (new Date("2026-11-01") would be UTC midnight). */
export function parseDay(day: string): Date {
  const [year, month, date] = day.split("-").map(Number);
  return new Date(year, month - 1, date);
}

/** Today as "YYYY-MM-DD" in local time (for the min of a date input and comparisons). */
export function todayIso(now: Date = new Date()): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/** "Regreso estimado: 1 nov 2026", "... hoy" or "... (ya pasó, revisa su estado)"; null without a date. */
export function returnText(expectedReturn: string | null | undefined, now: Date = new Date()): string | null {
  if (!expectedReturn) return null;
  const today = todayIso(now);
  if (expectedReturn === today) return t.returnToday;
  const shown = formatDate(parseDay(expectedReturn));
  return expectedReturn < today ? t.returnPassed(shown) : t.returnOn(shown);
}

/** One line for lists and the tactical editor: "lesionado (esguince de tobillo), regreso estimado: 1 nov 2026". */
export function availabilitySummary(player: Pick<Player, "status" | "availability_note" | "expected_return">,
                                    now: Date = new Date()): string {
  const status = label("playerStatus", player.status).toLowerCase();
  const note = player.availability_note ? ` (${player.availability_note})` : "";
  const back = returnText(player.expected_return, now);
  return `${status}${note}${back ? `, ${back.charAt(0).toLowerCase()}${back.slice(1)}` : ""}`;
}
