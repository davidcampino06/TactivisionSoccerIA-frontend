import type { PlayerStats } from "../../types";

/** What the player statistics can be ranked by. */
export type Metric = "seconds" | "perMatch" | "detections" | "matches";
export const METRICS: Metric[] = ["seconds", "perMatch", "detections", "matches"];

/**
 * The value a player is ranked by. "perMatch" = seconds on video divided by the analysed clips he appears
 * in, so a player seen in one clip can be compared fairly with one seen in four.
 */
export function metricValue(player: PlayerStats, metric: Metric): number {
  if (metric === "perMatch") return player.matches ? Math.round((player.seconds / player.matches) * 100) / 100 : 0;
  return player[metric];
}

export interface ParticipationSummary {
  /** Players of the current squad. */
  total: number;
  /** Players with at least one track assigned by a person. */
  withData: number;
  /** Seconds on video of every identified player together. */
  seconds: number;
  /** The players with most time on video (only those with data), most first. */
  top: PlayerStats[];
}

/** Totals for the squad page. Ties keep the roster order the backend sends (shirt number). */
export function summarize(stats: PlayerStats[], topCount = 3): ParticipationSummary {
  const identified = stats.filter((player) => player.detections > 0);
  return {
    total: stats.length,
    withData: identified.length,
    seconds: Math.round(identified.reduce((sum, player) => sum + player.seconds, 0) * 10) / 10,
    top: [...identified].sort((a, b) => b.seconds - a.seconds).slice(0, topCount),
  };
}
