// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { ProximityNetwork as Network } from "../../types";
import ProximityNetwork from "./ProximityNetwork";

// Track 3 was followed by the tracker; -5 is a player the AI saw only in this frame.
const network: Network = {
  frame_number: 40,
  timestamp_seconds: 1.6,
  link_distance: 0.18,
  teams: {
    TEAM_A: {
      nodes: [
        { track_id: 3, x: 0.3, y: 0.4, degree: 1, group: 0 },
        { track_id: -5, x: 0.35, y: 0.5, degree: 1, group: 0 },
      ],
      links: [[3, -5]],
      groups: 1,
      isolated: [],
      diameter: 1,
      hops: { "3": { "3": 0, "-5": 1 }, "-5": { "-5": 0, "3": 1 } },
    },
  },
};

afterEach(cleanup);

describe("ProximityNetwork", () => {
  it("names untracked players instead of showing a negative number", () => {
    render(<ProximityNetwork network={network} tracks={[]} players={[]} />);
    expect(screen.getAllByText("Sin seguimiento").length).toBeGreaterThan(0);
    expect(screen.getAllByText("T3").length).toBeGreaterThan(0);
    expect(screen.queryByText("-5")).toBeNull();
    expect(screen.queryByText("T-5")).toBeNull();
  });
});
