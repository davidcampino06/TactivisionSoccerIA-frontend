import { describe, expect, it } from "vitest";
import type { TeamNetwork } from "../../types";
import { groupSizes, networkStory } from "./networkStory";

const node = (track_id: number, group: number) => ({ track_id, x: 0.5, y: 0.5, degree: 1, group });

// Like the France - Morocco frame the coach asked about: 6 players split in two blocks of 3.
const split: TeamNetwork = {
  nodes: [node(1, 0), node(2, 0), node(3, 0), node(4, 1), node(5, 1), node(6, 1)],
  links: [[1, 2], [2, 3], [4, 5], [5, 6]],
  groups: 2, isolated: [], diameter: 2, hops: {},
};

describe("networkStory", () => {
  it("tells a split team in football words", () => {
    const story = networkStory(split, "del Equipo A (camiseta oscura)", 3);
    expect(story.seen).toBe(
      "En este momento se ven 6 jugadores del Equipo A (camiseta oscura), partidos en dos grupos que no se tocan " +
      "entre sí: uno de 3 jugadores y otro de 3 jugadores. Desde el jugador elegido el balón llega con pases cortos " +
      "a 2 de 5 compañeros; a los demás solo con un pase largo.");
    expect(story.meaning).toMatch(/^Si el balón está en un grupo, no puede llegar al otro/);
  });

  it("says when the whole team is connected", () => {
    const connected = { ...split, nodes: split.nodes.map((n) => ({ ...n, group: 0 })), groups: 1 };
    const story = networkStory(connected, "del Equipo B", 6);
    expect(story.seen).toContain("todos estaban conectados");
    expect(story.seen).toContain("llega a todos sus compañeros");
    expect(story.meaning).toMatch(/^El equipo estaba bien conectado/);
  });

  it("mentions the players left alone", () => {
    const lonely = { ...split, nodes: [...split.nodes, node(7, 2)], isolated: [7], groups: 3 };
    const story = networkStory(lonely, "del Equipo A", 3);
    expect(story.seen).toContain("tres grupos");
    expect(story.seen).toContain("Un jugador quedó solo");
    expect(groupSizes(lonely)).toEqual([3, 3, 1]);
  });
});
