import type { KitHint, Track } from "../../types";

/** What a person already said about a kit, read from its tracks: all marked referee, or all with one number. */
export type KitDecision = { kind: "referee" } | { kind: "number"; number: number } | null;

export function kitDecision(kit: KitHint, byId: Map<number, Track>): KitDecision {
  const tracks = kit.tracks.map((id) => byId.get(id));
  if (tracks.length === 0 || tracks.some((track) => !track)) return null;
  if (tracks.every((track) => track!.role === "REFEREE")) return { kind: "referee" };
  const number = tracks[0]!.player_number;
  if (number != null && tracks.every((track) => (track!.role ?? "PLAYER") === "PLAYER" && track!.player_number === number)) {
    return { kind: "number", number };
  }
  return null;
}
