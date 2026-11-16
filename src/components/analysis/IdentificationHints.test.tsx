// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { api } from "../../api/client";
import type { IdentificationHints as Hints, Track } from "../../types";
import IdentificationHints from "./IdentificationHints";

vi.mock("../../api/client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../api/client")>()),
  api: vi.fn(),
}));
vi.mock("./trackPhotoCache", () => ({ useTrackPhoto: () => null }));
const apiMock = vi.mocked(api);

const track = (id: number): Track => ({
  track_id: id, label: `Trayectoria ${id}`, detections: 10, first_frame: 0, last_frame: 9, mean_confidence: 0.8,
  player_id: null, first_seconds: 0, last_seconds: 1, has_snapshot: false, snapshot_seconds: null,
});

const hints = (overrides: Partial<Hints> = {}): Hints => ({
  links: [{ from_track: 12, to_track: 31, gap_seconds: 0.36, distance_heights: 0.12, color_distance: 4.28,
            same_team: true, confidence: 0.9, status: "SUGGESTED", decided_at: null }],
  kits: [{ kit_group: 1, kit_color: "#3bb3c2", suggestion: "GOALKEEPER_OR_REFEREE", confidence: 0.5,
           reason: "Camiseta #3bb3c2, que no es de ningún equipo: puede ser un arquero o el árbitro.",
           tracks: [7, 8], dismissed: false }],
  same_player: {},
  ...overrides,
});

const tracks = [12, 31, 7, 8].map(track);

afterEach(() => { cleanup(); apiMock.mockReset(); });

describe("IdentificationHints", () => {
  it("asks whether two tracks are the same player, with the reasons of the AI", () => {
    render(<IdentificationHints analysisId="a1" hints={hints()} tracks={tracks} onChanged={() => {}} onError={() => {}} />);
    expect(screen.getByText("¿ID 12 e ID 31 son el mismo jugador?")).toBeTruthy();
    expect(screen.getByText("Se dejó de ver 0,4 s y reapareció donde iba · confianza 90 %")).toBeTruthy();
    expect(screen.getByText("Posible arquero o árbitro · 2 trayectorias")).toBeTruthy();
  });

  it("accepting a link saves the decision and brings the new suggestions", async () => {
    const fresh = hints({ links: [{ ...hints().links[0], status: "ACCEPTED", decided_at: "2026-11-16T10:00:00" }],
                          same_player: { "12": 12, "31": 12 } });
    apiMock.mockResolvedValueOnce({ tracks: [12, 31] }).mockResolvedValueOnce(fresh);
    const onChanged = vi.fn();
    render(<IdentificationHints analysisId="a1" hints={hints()} tracks={tracks} onChanged={onChanged} onError={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: "Sí, es el mismo" }));
    await waitFor(() => expect(onChanged).toHaveBeenCalledWith(fresh));
    expect(apiMock).toHaveBeenNthCalledWith(1, "/api/analyses/a1/track-links/12",
      { method: "PUT", body: JSON.stringify({ decision: "ACCEPTED" }) });
    expect(screen.getByRole("status").textContent).toBe("Unidas: el dorsal de una vale para la otra.");
  });

  it("marks the whole kit as the referee, or saves the goalkeeper's number", async () => {
    apiMock.mockResolvedValue({ tracks: [7, 8] });
    render(<IdentificationHints analysisId="a1" hints={hints()} tracks={tracks} onChanged={() => {}} onError={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: "Es el árbitro" }));
    await waitFor(() => expect(apiMock).toHaveBeenCalledWith("/api/analyses/a1/kits/1/identity",
      { method: "PUT", body: JSON.stringify({ role: "REFEREE" }) }));

    const save = screen.getByRole("button", { name: "Guardar dorsal" }) as HTMLButtonElement;
    expect(save.disabled).toBe(true);
    fireEvent.change(screen.getByLabelText("Dorsal del arquero"), { target: { value: "1" } });
    fireEvent.click(save);
    await waitFor(() => expect(apiMock).toHaveBeenCalledWith("/api/analyses/a1/kits/1/identity",
      { method: "PUT", body: JSON.stringify({ role: "PLAYER", shirt_number: 1 }) }));
  });

  it("a conflict is passed to the page, which shows it", async () => {
    const conflict = new Error("conflict");
    apiMock.mockRejectedValueOnce(conflict);
    const onError = vi.fn();
    render(<IdentificationHints analysisId="a1" hints={hints()} tracks={tracks} onChanged={() => {}} onError={onError} />);
    fireEvent.click(screen.getByRole("button", { name: "Sí, es el mismo" }));
    await waitFor(() => expect(onError).toHaveBeenLastCalledWith(conflict));
  });

  it("shows nothing for an analysis without suggestions", () => {
    const { container } = render(<IdentificationHints analysisId="a1" hints={hints({ links: [], kits: [] })}
      tracks={tracks} onChanged={() => {}} onError={() => {}} />);
    expect(container.innerHTML).toBe("");
  });
});
