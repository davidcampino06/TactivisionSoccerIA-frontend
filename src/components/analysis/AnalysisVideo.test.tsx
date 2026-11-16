// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { tokenStore } from "../../api/client";
import AnalysisVideo, { LabelEditor } from "./AnalysisVideo";
import type { Track } from "../../types";
import { playerLabel } from "./playerLabel";

const reply = (status: number, body: unknown) =>
  ({ ok: status < 400, status, json: async () => body, text: async () => JSON.stringify(body) }) as Response;

beforeEach(() => {
  tokenStore.set("token-123");
  HTMLCanvasElement.prototype.getContext = vi.fn(() => null) as never;
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  tokenStore.clear();
});

const show = () => render(
  <MemoryRouter>
    <AnalysisVideo analysisId="a1" videoId="v1" matchId="m1" tracks={[]} players={[]} savingId={null} onAssign={() => {}} onIdentity={async () => {}} />
  </MemoryRouter>);

describe("AnalysisVideo", () => {
  it("asks the backend for a playback link and plays the uploaded clip from it", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async (url) => (
      String(url).includes("/playback") ? reply(200, { url: "/api/videos/v1/stream?token=abc" })
        : reply(200, { frames: [], interval: 0, until: 0 })));
    show();
    await waitFor(() => expect(document.querySelector("video")?.getAttribute("src")).toContain("/api/videos/v1/stream?token=abc"));
    const playback = fetchMock.mock.calls.find(([url]) => String(url).includes("/api/videos/v1/playback"))!;
    expect((playback[1] ?? {}).method).toBe("POST");
    expect(fetchMock.mock.calls.some(([url]) => String(url).includes("/api/analyses/a1/overlay"))).toBe(true);
    expect(screen.getByRole("button", { name: "Reproducir" })).toBeTruthy();
    expect(screen.getByRole("checkbox", { name: "Mostrar análisis" })).toBeTruthy();
  });

  it("says so when the server no longer has the file, with the way to upload it again", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async (url) => (
      String(url).includes("/playback") ? reply(409, { code: "VIDEO_FILE_MISSING", detail: "gone" })
        : reply(200, { frames: [], interval: 0, until: 0 })));
    show();
    expect(await screen.findByText(/ya no está en el servidor/)).toBeTruthy();
    expect(screen.getByRole("link", { name: "Ir al partido" }).getAttribute("href")).toBe("/partidos/m1");
    expect(document.querySelector("video")).toBeNull();
  });
});

describe("playerLabel", () => {
  it("is the number and surname, or the full name without a number", () => {
    expect(playerLabel({ first_name: "Andrés", last_name: "Mora", shirt_number: 10 })).toBe("10 · Mora");
    expect(playerLabel({ first_name: "Andrés", last_name: "Mora", shirt_number: null })).toBe("Andrés Mora");
  });
});

const track = { track_id: 4, label: "Trayectoria 4", detections: 9, first_frame: 0, last_frame: 9, mean_confidence: 0.8,
  player_id: null, first_seconds: 0, last_seconds: 1, has_snapshot: false, snapshot_seconds: null, role: "PLAYER",
  player_number: null } as Track;

describe("LabelEditor (opens when the ID of a box is touched)", () => {
  it("saves the shirt number typed for the track and closes", async () => {
    const onSave = vi.fn(async () => {});
    const onClose = vi.fn();
    render(<LabelEditor track={track} position={{ left: "10%", top: "20%" }} saving={false} onSave={onSave} onClose={onClose} />);
    const input = screen.getByLabelText("Dorsal") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "1a0x7" } });
    expect(input.value).toBe("10");        // only digits, at most two
    fireEvent.click(screen.getByRole("button", { name: "Guardar" }));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(onSave).toHaveBeenCalledWith({ role: "PLAYER", shirt_number: 10 });
  });

  it("marks the referee or someone outside, and an empty number clears it", async () => {
    const onSave = vi.fn(async () => {});
    render(<LabelEditor track={{ ...track, player_number: 7 }} position={{ left: "0", top: "0" }} saving={false} onSave={onSave} onClose={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: "Árbitro" }));
    await waitFor(() => expect(onSave).toHaveBeenCalledWith({ role: "REFEREE", shirt_number: null }));
    fireEvent.click(screen.getByRole("button", { name: "Externo" }));
    await waitFor(() => expect(onSave).toHaveBeenCalledWith({ role: "OTHER", shirt_number: null }));
    fireEvent.change(screen.getByLabelText("Dorsal"), { target: { value: "" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar" }));
    await waitFor(() => expect(onSave).toHaveBeenCalledWith({ role: "PLAYER", shirt_number: null }));
  });

  it("says so when it could not be saved and stays open", async () => {
    const onClose = vi.fn();
    render(<LabelEditor track={track} position={{ left: "0", top: "0" }} saving={false}
      onSave={async () => { throw new Error("offline"); }} onClose={onClose} />);
    fireEvent.change(screen.getByLabelText("Dorsal"), { target: { value: "9" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar" }));
    expect(await screen.findByRole("alert")).toBeTruthy();
    expect(onClose).not.toHaveBeenCalled();
  });
});
