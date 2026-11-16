import type { Player } from "../../types";

/** "10 · Mora" for a squad player; his full name when he has no number. */
export function playerLabel(player: Pick<Player, "first_name" | "last_name" | "shirt_number">): string {
  return player.shirt_number !== null ? `${player.shirt_number} · ${player.last_name}` : `${player.first_name} ${player.last_name}`;
}
