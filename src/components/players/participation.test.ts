import { describe, expect, it } from "vitest";
import type { PlayerStats } from "../../types";
import { metricValue, summarize } from "./participation";

const player = (id: string, shirt: number, seconds: number, matches: number, detections: number): PlayerStats => ({
  player_id: id, first_name: "Jugador", last_name: id, shirt_number: shirt, position: "MIDFIELDER", status: "ACTIVE",
  seconds, matches, detections,
});

describe("player statistics", () => {
  it("the average per match divides the time on video by the clips the player appears in", () => {
    expect(metricValue(player("a", 5, 30, 4, 120), "perMatch")).toBe(7.5);
    expect(metricValue(player("b", 8, 10, 3, 40), "perMatch")).toBe(3.33);
    expect(metricValue(player("c", 9, 0, 0, 0), "perMatch")).toBe(0);
    expect(metricValue(player("a", 5, 30, 4, 120), "seconds")).toBe(30);
  });

  it("the summary counts only identified players and lists the three with most time", () => {
    const summary = summarize([
      player("courtois", 1, 0, 0, 0),
      player("valverde", 8, 12.5, 2, 60),
      player("mbappe", 10, 30, 3, 140),
      player("vinicius", 7, 30, 4, 150),
      player("bellingham", 5, 4.2, 1, 20),
    ]);
    expect(summary.total).toBe(5);
    expect(summary.withData).toBe(4);
    expect(summary.seconds).toBe(76.7);
    // Mbappé and Vinícius tie: the roster order sent by the backend decides.
    expect(summary.top.map((p) => p.last_name)).toEqual(["mbappe", "vinicius", "valverde"]);
  });

  it("with nobody identified the summary is empty", () => {
    const summary = summarize([player("courtois", 1, 0, 0, 0)]);
    expect(summary.withData).toBe(0);
    expect(summary.top).toEqual([]);
  });
});
