// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { api } from "../../api/client";
import type { AdminTeam } from "../../types";
import DeleteTeamPanel from "./DeleteTeamPanel";

vi.mock("../../api/client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../api/client")>()),
  api: vi.fn(),
}));
const apiMock = vi.mocked(api);

const TEAM: AdminTeam = {
  id: "t1", name: "Real Madrid", category: "Primera Profesional", city: "Madrid", is_active: true,
  created_at: "2026-09-01T10:00:00", coach_name: "Jhonatan Mideros", analysts: 1, players: 26, matches: 4, analyses: 4,
};

afterEach(() => { cleanup(); apiMock.mockReset(); });

describe("DeleteTeamPanel", () => {
  it("lists what will be lost and only deletes after the team's name is typed", async () => {
    const result = { team: "Real Madrid", users: 2, players: 26, matches: 4, videos: 4, files_removed: 4 };
    apiMock.mockResolvedValue(result);
    const onDeleted = vi.fn();
    render(<DeleteTeamPanel team={TEAM} onDeleted={onDeleted} onCancel={() => {}} onError={() => {}} />);
    expect(screen.getByText("26 jugadores de la plantilla")).toBeTruthy();
    expect(screen.getByText("4 partidos, con sus videos y 4 análisis")).toBeTruthy();
    expect(screen.getByText("la cuenta del entrenador y la de 1 analista")).toBeTruthy();

    const confirm = screen.getByRole("button", { name: "Eliminar equipo para siempre" }) as HTMLButtonElement;
    expect(confirm.disabled).toBe(true);
    const input = screen.getByLabelText(/escribe el nombre del equipo/);
    fireEvent.change(input, { target: { value: "Real" } });
    expect(confirm.disabled).toBe(true);
    fireEvent.change(input, { target: { value: "Real Madrid" } });
    expect(confirm.disabled).toBe(false);

    fireEvent.click(confirm);
    await waitFor(() => expect(onDeleted).toHaveBeenCalledWith(result));
    expect(apiMock).toHaveBeenCalledWith("/api/admin/teams/t1", { method: "DELETE" });
  });

  it("passes a refusal to the page and lets the administrator try again", async () => {
    const refusal = new Error("TEAM_ANALYSIS_RUNNING");
    apiMock.mockRejectedValue(refusal);
    const onError = vi.fn();
    render(<DeleteTeamPanel team={TEAM} onDeleted={() => {}} onCancel={() => {}} onError={onError} />);
    fireEvent.change(screen.getByLabelText(/escribe el nombre del equipo/), { target: { value: "Real Madrid" } });
    fireEvent.click(screen.getByRole("button", { name: "Eliminar equipo para siempre" }));
    await waitFor(() => expect(onError).toHaveBeenCalledWith(refusal));
    expect((screen.getByRole("button", { name: "Eliminar equipo para siempre" }) as HTMLButtonElement).disabled).toBe(false);
  });
});
