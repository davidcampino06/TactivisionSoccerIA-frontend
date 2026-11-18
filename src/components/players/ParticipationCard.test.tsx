// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, describe, expect, it } from "vitest";
import type { PlayerStats } from "../../types";
import ParticipationCard from "./ParticipationCard";

const player = (id: string, name: string, shirt: number, seconds: number, detections: number): PlayerStats => ({
  player_id: id, first_name: name, last_name: "", shirt_number: shirt, position: "FORWARD", status: "ACTIVE",
  seconds, matches: detections ? 1 : 0, detections,
});

afterEach(cleanup);

describe("ParticipationCard", () => {
  it("shows the players with most time on video and leads to the statistics", () => {
    render(<MemoryRouter><ParticipationCard stats={[
      player("p1", "Courtois", 1, 0, 0), player("p7", "Vinícius", 7, 18.4, 90), player("p10", "Mbappé", 10, 22, 100),
    ]} /></MemoryRouter>);
    expect(screen.getByText(/2 de 3 jugadores con datos/)).toBeTruthy();
    const rows = screen.getAllByRole("listitem").map((item) => item.textContent);
    expect(rows[0]).toContain("Mbappé");
    expect(rows[1]).toContain("Vinícius");
    expect(rows).toHaveLength(2);
    expect(screen.getByRole("link", { name: "Ver estadísticas y ranking" }).getAttribute("href")).toBe("/estadisticas");
  });

  it("explains how to get data when nobody is identified yet", () => {
    render(<MemoryRouter><ParticipationCard stats={[player("p1", "Courtois", 1, 0, 0)]} /></MemoryRouter>);
    expect(screen.getByText(/Todavía no hay datos/)).toBeTruthy();
    expect(screen.queryByRole("list")).toBeNull();
  });
});
