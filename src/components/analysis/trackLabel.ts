import type { Player, Track } from "../../types";
import { playerLabel } from "./playerLabel";

export type LabelKind = "player" | "number" | "referee" | "other" | "unknown";

/**
 * What rides on a track's box: the squad player ("10 · Montoya"), only the number typed for it
 * ("#23", nobody in the squad wears it), the referee, someone outside, or the AI's own id and
 * confidence ("ID 04 · 0.83", the same as the landing page) while nobody has said who it is.
 */
export function trackLabel(track: Track | undefined, id: number, players: Map<string, Player>, confidence?: number):
  { text: string; kind: LabelKind } {
  if (track?.role === "REFEREE") return { text: "ÁRBITRO", kind: "referee" };
  if (track?.role === "OTHER") return { text: "EXTERNO", kind: "other" };
  const player = track?.player_id ? players.get(track.player_id) : undefined;
  if (player) return { text: playerLabel(player), kind: "player" };
  if (track?.player_number !== null && track?.player_number !== undefined) return { text: `#${track.player_number}`, kind: "number" };
  const base = `ID ${String(id).padStart(2, "0")}`;
  return { text: confidence === undefined ? base : `${base} · ${confidence.toFixed(2)}`, kind: "unknown" };
}

/** Counts as identified once a person said anything about it: a player, a number, or not a player. */
export const isIdentified = (track: Track) =>
  Boolean(track.player_id) || (track.player_number !== null && track.player_number !== undefined) || (track.role ?? "PLAYER") !== "PLAYER";
