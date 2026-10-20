import type { TeamNetwork } from "../../types";

/** Sizes of the groups of a team network, biggest first. */
export function groupSizes(data: TeamNetwork): number[] {
  const counts = new Map<number, number>();
  data.nodes.forEach((node) => counts.set(node.group, (counts.get(node.group) ?? 0) + 1));
  return [...counts.values()].sort((a, b) => b - a);
}

const NUMBERS = ["cero", "un", "dos", "tres", "cuatro", "cinco", "seis", "siete", "ocho", "nueve", "diez", "once"];
const say = (count: number) => NUMBERS[count] ?? String(count);
const players = (count: number) => `${count} ${count === 1 ? "jugador" : "jugadores"}`;

function listSizes(sizes: number[]): string {
  const parts = sizes.map((size, index) => `${index === 0 ? "uno" : "otro"} de ${players(size)}`);
  return parts.length > 1 ? `${parts.slice(0, -1).join(", ")} y ${parts[parts.length - 1]}` : parts[0];
}

/**
 * ``ofTeam`` reads after "jugadores": "del Equipo A (camiseta oscura)".
 * The network told like a coach would: is the team connected or split, who is alone, and how far
 * the ball can travel with short passes from the chosen player.
 */
export function networkStory(data: TeamNetwork, ofTeam: string, reached: number): { seen: string; meaning: string } {
  const total = data.nodes.length;
  const sizes = groupSizes(data);
  const alone = data.isolated.length;
  const parts: string[] = [];

  if (sizes.length <= 1) {
    parts.push(`En este momento se ven ${players(total)} ${ofTeam} y todos estaban conectados: cualquiera podía recibir un pase corto de algún compañero.`);
  } else {
    parts.push(`En este momento se ven ${players(total)} ${ofTeam}, partidos en ${say(sizes.length)} grupos que no se tocan entre sí: ${listSizes(sizes)}.`);
  }
  if (alone) {
    parts.push(alone === 1
      ? "Un jugador quedó solo, sin ningún compañero a distancia de pase corto (anillo rojo)."
      : `${players(alone)} quedaron solos, sin ningún compañero a distancia de pase corto (anillo rojo).`);
  }
  parts.push(reached >= total
    ? "Desde el jugador elegido el balón llega a todos sus compañeros con pases cortos."
    : `Desde el jugador elegido el balón llega con pases cortos a ${reached - 1} de ${total - 1} compañeros; a los demás solo con un pase largo.`);

  const meaning = sizes.length > 1 || alone
    ? "Si el balón está en un grupo, no puede llegar al otro con un pase corto: hace falta un pase largo, que es más fácil de perder. Y al defender, entre los grupos queda un hueco por donde el rival puede pasar."
    : "El equipo estaba bien conectado: el balón puede circular con pases cortos y, al perderlo, hay compañeros cerca para presionar y cubrir.";
  return { seen: parts.join(" "), meaning };
}
