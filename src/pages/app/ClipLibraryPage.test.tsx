// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import { api } from "../../api/client";
import type { ClipLibrary } from "../../types";
import ClipLibraryPage from "./ClipLibraryPage";

vi.mock("../../api/client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../api/client")>()),
  api: vi.fn(),
}));
vi.mock("../../app/teamState", () => ({ useTeam: () => ({ team: { id: "t1" } }) }));
const apiMock = vi.mocked(api);
afterEach(() => { cleanup(); apiMock.mockReset(); });

const clip = (id: string, opponent: string, situation: string | null, problems: ClipLibrary["clips"][number]["problems"]) => ({
  video_id: id, file_name: `${id}.mp4`, situation, situation_note: null,
  match: { id: `m-${id}`, opponent, match_date: "2026-10-11T15:00:00" },
  analysis: { id: `a-${id}`, mode: "REAL_VIDEO_ANALYSIS", completed_at: null, own_team_known: true },
  problems, strengths: [],
});
const data: ClipLibrary = {
  clips: [
    clip("v1", "Rionegro", "BUILD_UP", [{ title: "Baja compactación del equipo", severity: "HIGH", status: "CONFIRMED" }]),
    clip("v2", "Marruecos", "PRESSING", []),
    clip("v3", "Envigado", null, [{ title: "Baja compactación del equipo", severity: "MEDIUM", status: "GENERATED" }]),
  ],
  facets: {
    situations: [{ key: "BUILD_UP", count: 1, clips: ["v1"] }, { key: "NONE", count: 1, clips: ["v3"] }, { key: "PRESSING", count: 1, clips: ["v2"] }],
    problems: [{ key: "Baja compactación del equipo", count: 2, clips: ["v1", "v3"] }],
    strengths: [],
  },
};

function renderLibrary() {
  apiMock.mockResolvedValue(data);
  render(<MemoryRouter><ClipLibraryPage /></MemoryRouter>);
}

describe("ClipLibraryPage", () => {
  it("lists every analysed clip with its situation and the review state of each problem", async () => {
    renderLibrary();
    expect(await screen.findByText("vs Rionegro")).toBeTruthy();
    expect(apiMock).toHaveBeenCalledWith("/api/teams/t1/clip-library");
    expect(screen.getByRole("button", { name: "Todas (3)" })).toBeTruthy();
    expect(screen.getByText("Confirmada")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Clasificar en el partido" }).getAttribute("href")).toBe("/partidos/m-v3");
  });

  it("shows a situation written by the staff on the clip and as its own filter", async () => {
    apiMock.mockResolvedValue({
      clips: [{ ...clip("v9", "Roma", "OTHER", []), situation_custom: "Pelotazo al 9" }],
      facets: { situations: [{ key: "OTHER:Pelotazo al 9", count: 1, clips: ["v9"] }], problems: [], strengths: [] },
    });
    render(<MemoryRouter><ClipLibraryPage /></MemoryRouter>);
    expect(await screen.findByText("vs Roma")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Pelotazo al 9 (1)" })).toBeTruthy();
    expect(screen.getAllByText("Pelotazo al 9").length).toBeGreaterThan(0);
  });

  it("combines filters by intersecting the clip lists of the index", async () => {
    renderLibrary();
    await screen.findByText("vs Rionegro");
    fireEvent.change(screen.getByLabelText("Con el problema"), { target: { value: "Baja compactación del equipo" } });
    expect(screen.queryByText("vs Marruecos")).toBeNull();
    expect(screen.getByText("vs Envigado")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Salida de balón (1)" }));
    expect(screen.getByText("vs Rionegro")).toBeTruthy();
    expect(screen.queryByText("vs Envigado")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Presión alta (1)" }));
    expect(screen.getByText("Ningún clip cumple estos filtros.")).toBeTruthy();
  });
});
