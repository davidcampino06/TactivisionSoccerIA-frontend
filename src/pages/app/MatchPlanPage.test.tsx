// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import { api } from "../../api/client";
import type { MatchPlan } from "../../types";
import MatchPlanPage from "./MatchPlanPage";

vi.mock("../../api/client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../api/client")>()),
  api: vi.fn(),
}));
const apiMock = vi.mocked(api);
afterEach(() => { cleanup(); apiMock.mockReset(); });

const occurrence = { match_id: "m0", opponent: "Nacional", match_date: "2026-09-01T15:00:00", analysis_id: "a0",
                     team: "TEAM_A", team_known: true, confidence: 0.8 };
const plan: MatchPlan = {
  match: { id: "m1", opponent: "Medellín", match_date: "2026-11-08T15:00:00", is_home: true, location: "Atanasio", status: "SCHEDULED" },
  squad: {
    available_count: 1,
    groups: [{ position: "GOALKEEPER", label: "Porteros", players: [{ id: "p1", shirt_number: 1, name: "Martín Pérez", position: "GOALKEEPER" }] }],
    unavailable: [{ id: "p4", shirt_number: 4, name: "Juan Pérez", position: "DEFENDER", status: "INJURED", reason: "Esguince",
                    expected_return: "2026-11-20", back_before_match: false }],
  },
  plays: [{ id: "play1", name: "Salida corta", action_type: "BUILD_UP", description: null, formation: "4-3-3",
            notes: "El arquero juega corto con el 4.", version: 1 }],
  based_on: [{ match_id: "m0", opponent: "Nacional", match_date: "2026-09-01T15:00:00", analysis_id: "a0" }],
  to_correct: [{ title: "Líneas separadas", recommendation: "Acortar la distancia entre líneas.", severity: "HIGH",
                 occurrences: [occurrence],
                 notes: [{ author: "Luis", role: "analista", text: "El 5 sube y nadie cubre.", created_at: "2026-09-02T10:00:00", opponent: "Nacional" }] }],
  to_keep: [{ title: "Presión sobre el balón", meaning: "Siempre hubo alguien encima.", keep: "Seguir presionando.", occurrences: [occurrence] }],
  left_out: { problems: 2, strengths: 1 },
};

function renderPlan(data: MatchPlan) {
  apiMock.mockResolvedValue(data);
  render(<MemoryRouter initialEntries={["/partidos/m1/plan"]}>
    <Routes><Route path="/partidos/:matchId/plan" element={<MatchPlanPage />} /></Routes>
  </MemoryRouter>);
}

describe("MatchPlanPage", () => {
  it("shows the squad, the plays and only the confirmed items with their notes", async () => {
    renderPlan(plan);
    expect(await screen.findByText("vs Medellín")).toBeTruthy();
    expect(apiMock).toHaveBeenCalledWith("/api/matches/m1/plan");
    expect(screen.getByText("1 · Martín Pérez")).toBeTruthy();
    expect(screen.getByText(/Esguince/)).toBeTruthy();
    expect(screen.getByText("Salida corta")).toBeTruthy();
    expect(screen.getByText("Líneas separadas")).toBeTruthy();
    expect(screen.getByText("«El 5 sube y nadie cubre.»")).toBeTruthy();
    expect(screen.getByText("Presión sobre el balón")).toBeTruthy();
    expect(screen.getByText(/Fuera del plan por estar sin revisar: 2 posibles problemas y 1 fortaleza/)).toBeTruthy();
  });

  it("says so when there is no analysed match before this one", async () => {
    renderPlan({ ...plan, based_on: [], to_correct: [], to_keep: [], left_out: { problems: 0, strengths: 0 } });
    expect(await screen.findByText(/No hay partidos analizados antes de este/)).toBeTruthy();
    expect(screen.queryByText("A corregir")).toBeNull();
    expect(screen.queryByText(/Fuera del plan/)).toBeNull();
  });
});
