// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import { api } from "../../api/client";
import type { InboxContext, ReviewInbox } from "../../types";
import ReviewInboxPage from "./ReviewInboxPage";

vi.mock("../../api/client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../api/client")>()),
  api: vi.fn(),
}));
vi.mock("../../app/teamState", () => ({ useTeam: () => ({ team: { id: "t1" }, user: { id: "u1" }, isCoach: true }) }));
const apiMock = vi.mocked(api);
afterEach(() => { cleanup(); apiMock.mockReset(); });

const context = (match: string, opponent: string): InboxContext => ({
  match_id: match, opponent, match_date: "2026-10-11T15:00:00", analysis_id: `a-${match}`,
  team_a_color: "#f2c200", team_b_color: "#1f4fbf", own_team: "TEAM_A",
});
const inbox: ReviewInbox = {
  problems: [
    { id: "r1", title: "Líneas separadas", description: "Acortar distancias.", evidence: "0,26 > 0,22", confidence: 0.71,
      severity: "HIGH", status: "GENERATED", team: "TEAM_A", notes: [], context: context("m1", "Rionegro") },
    { id: "r2", title: "Ataque estrecho", description: "Abrir la cancha.", evidence: "0,30 < 0,35", confidence: 0.5,
      severity: "LOW", status: "REVIEWED", team: "TEAM_A", notes: [], context: context("m2", "Marruecos") },
  ],
  strengths: [
    { id: "s1", team: "TEAM_A", code: "PRESSURE_ON_BALL", title: "Presión sobre el balón", evidence: "100 %",
      confidence: 0.54, status: "GENERATED", context: context("m1", "Rionegro") },
  ],
  matches: [
    { match_id: "m2", opponent: "Marruecos", match_date: "2026-10-16T15:00:00", problems: 1, strengths: 0 },
    { match_id: "m1", opponent: "Rionegro", match_date: "2026-10-11T15:00:00", problems: 1, strengths: 1 },
  ],
  rival_problems: 3,
};

function renderInbox() {
  apiMock.mockImplementation(async (path: string) => (path === "/api/teams/t1/review-inbox" ? inbox : {}));
  render(<MemoryRouter><ReviewInboxPage /></MemoryRouter>);
}

describe("ReviewInboxPage", () => {
  it("lists the open problems most urgent first and says how many of the rival are left out", async () => {
    renderInbox();
    expect(await screen.findByText("Líneas separadas")).toBeTruthy();
    const titles = screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent);
    expect(titles).toEqual(["1Líneas separadas", "2Ataque estrecho"]);
    expect(screen.getByText(/Además hay 3 posibles problemas del rival/)).toBeTruthy();
    expect(screen.getByRole("tab", { name: "Posibles problemas (2)" })).toBeTruthy();
  });

  it("confirming removes the item and tells it counts for the plan", async () => {
    renderInbox();
    await screen.findByText("Líneas separadas");
    fireEvent.click(screen.getAllByRole("button", { name: "Confirmar" })[0]);
    await waitFor(() => expect(screen.queryByText("Líneas separadas")).toBeNull());
    expect(apiMock).toHaveBeenCalledWith("/api/recommendations/r1", { method: "PATCH", body: JSON.stringify({ action: "confirm" }) });
    expect(screen.getByText(/Confirmado: «Líneas separadas» \(vs Rionegro\)/)).toBeTruthy();
    expect(screen.getByRole("tab", { name: "Posibles problemas (1)" })).toBeTruthy();
  });

  it("reviews strengths through their analysis and filters by match", async () => {
    renderInbox();
    await screen.findByText("Líneas separadas");
    fireEvent.click(screen.getByRole("tab", { name: "Fortalezas (1)" }));
    expect(screen.getByText("Presión sobre el balón")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Descartar" }));
    await waitFor(() => expect(screen.queryByText("Presión sobre el balón")).toBeNull());
    expect(apiMock).toHaveBeenCalledWith("/api/analyses/a-m1/strengths/s1", { method: "PATCH", body: JSON.stringify({ action: "dismiss" }) });
    expect(screen.getByText("Todo revisado")).toBeTruthy();

    fireEvent.click(screen.getByRole("tab", { name: "Posibles problemas (2)" }));
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "m2" } });
    expect(screen.queryByText("Líneas separadas")).toBeNull();
    expect(screen.getByText("Ataque estrecho")).toBeTruthy();
  });
});
