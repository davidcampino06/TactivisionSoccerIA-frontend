import { describe, expect, it } from "vitest";
import { indicatorLabel } from "../../i18n/labels";
import { countByGroup, groupOf, indicatorName, isRisky } from "./indicators";

describe("tactical indicators in the app", () => {
  it("knows which side of the threshold is a possible problem (same rule as the AI)", () => {
    expect(isRisky("team_a.defensive_midfield_distance", 0.3, 0.22)).toBe(true);
    expect(isRisky("team_a.team_width", 0.2, 0.3)).toBe(true);
    expect(isRisky("team_a.team_width", 0.5, 0.3)).toBe(false);
    for (const low of ["team_b.pressure_on_ball", "team_a.attacking_width", "team_a.players_ahead_of_ball"]) {
      expect(isRisky(low, 0, 0.5)).toBe(true);
      expect(isRisky(low, 2, 0.5)).toBe(false);
    }
    expect(isRisky("team_a.team_length", 0.9, null)).toBe(false);
  });

  it("shows every indicator name in Spanish", () => {
    expect(indicatorName("team_b.pressure_on_ball")).toBe("Presión sobre el balón");
    expect(indicatorName("team_a.attacking_width")).toBe("Amplitud en ataque");
    expect(indicatorName("team_a.players_ahead_of_ball")).toBe("Jugadores por delante del balón");
    expect(indicatorLabel("team_a.team_width")).toEqual({ team: "Equipo A", name: "Ancho del equipo" });
    expect(indicatorName("team_a.some_future_metric")).toBe("some future metric");
  });

  it("groups indicators by team", () => {
    expect(groupOf("team_b.isolated_players")).toBe("team_b");
    expect(groupOf("max_zone_numerical_difference")).toBe("match");
    expect(countByGroup(["team_a.x", "team_a.y", "team_b.x", "match.ball_detection_rate"])).toEqual({ team_a: 2, team_b: 1, match: 1 });
  });
});
