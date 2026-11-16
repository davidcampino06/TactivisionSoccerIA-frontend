import { describe, expect, it } from "vitest";
import type { Player, Track } from "../../types";
import { isIdentified, trackLabel } from "./trackLabel";

const track = (over: Partial<Track> = {}): Track => ({
  track_id: 4, label: "Trayectoria 4", detections: 10, first_frame: 0, last_frame: 30, mean_confidence: 0.8,
  player_id: null, first_seconds: 0, last_seconds: 1, has_snapshot: false, snapshot_seconds: null, role: "PLAYER",
  player_number: null, ...over,
});
const montoya = { id: "p10", first_name: "Daniel", last_name: "Montoya", shirt_number: 10 } as Player;
const squad = new Map([[montoya.id, montoya]]);

describe("trackLabel", () => {
  it("shows the AI id and confidence until someone says who it is, like the landing page", () => {
    expect(trackLabel(track(), 4, squad, 0.834)).toEqual({ text: "ID 04 · 0.83", kind: "unknown" });
    expect(trackLabel(undefined, 12, squad)).toEqual({ text: "ID 12", kind: "unknown" });
  });

  it("shows the squad player, or only the number when nobody in the squad wears it", () => {
    expect(trackLabel(track({ player_id: "p10", player_number: 10 }), 4, squad, 0.8).text).toBe("10 · Montoya");
    expect(trackLabel(track({ player_number: 23 }), 4, squad, 0.8)).toEqual({ text: "#23", kind: "number" });
    expect(trackLabel(track({ player_number: 0 }), 4, squad).text).toBe("#0");
  });

  it("says when it is the referee or someone outside the game", () => {
    expect(trackLabel(track({ role: "REFEREE" }), 4, squad).kind).toBe("referee");
    expect(trackLabel(track({ role: "OTHER" }), 4, squad).text).toBe("EXTERNO");
  });
});

describe("isIdentified", () => {
  it("counts a player, a number or a non-player mark", () => {
    expect(isIdentified(track())).toBe(false);
    expect(isIdentified(track({ player_number: 7 }))).toBe(true);
    expect(isIdentified(track({ role: "REFEREE" }))).toBe(true);
    expect(isIdentified(track({ player_id: "p10" }))).toBe(true);
  });
});
