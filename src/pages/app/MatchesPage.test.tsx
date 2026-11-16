// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import MatchesPage from "./MatchesPage";

vi.mock("../../app/teamState", () => ({ useTeam: () => ({ team: { id: "t1" }, isCoach: true }) }));
vi.mock("../../hooks/useLoad", () => ({
  useLoad: () => ({
    data: [{ id: "m1", opponent: "Itagüí FC", match_date: "2026-11-08T15:00:00", is_home: true, status: "PLAYED",
             result: "LOSS", home_score: 0, away_score: 2 }],
    loading: false, error: null, reload: () => {},
  }),
}));

afterEach(cleanup);

describe("MatchesPage", () => {
  it("opens the match when any part of its row is clicked", () => {
    render(
      <MemoryRouter initialEntries={["/partidos"]}>
        <Routes>
          <Route path="/partidos" element={<MatchesPage />} />
          <Route path="/partidos/:id" element={<p>Detalle del partido</p>} />
        </Routes>
      </MemoryRouter>);
    fireEvent.click(screen.getByText("Local"));   // the venue cell, not the link
    expect(screen.getByText("Detalle del partido")).toBeTruthy();
  });
});
