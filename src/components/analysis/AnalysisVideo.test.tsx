// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { tokenStore } from "../../api/client";
import AnalysisVideo from "./AnalysisVideo";
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
    <AnalysisVideo analysisId="a1" videoId="v1" matchId="m1" tracks={[]} players={[]} savingId={null} onAssign={() => {}} />
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
