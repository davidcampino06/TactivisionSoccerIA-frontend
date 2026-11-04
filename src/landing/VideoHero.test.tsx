// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import VideoHero from "./VideoHero";

const detections = { model: "YOLO26n", tracker: "ByteTrack", fps: 30, stride: 2, aspect: 2.69,
  players_median: 15, tracks: 48, mean_confidence: 0.553, frames: [[[0.1, 0.2, 0.02, 0.08, 7, 0.8]]] };

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, json: async () => detections })));
  HTMLMediaElement.prototype.play = vi.fn(async () => undefined);
  HTMLMediaElement.prototype.pause = vi.fn();
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe("VideoHero", () => {
  it("shows the numbers of the real detection of the clip, not invented ones", async () => {
    render(<VideoHero paused={false} onStart={() => {}} onLogin={() => {}} />);
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Mira cómo juega tu equipo, jugada por jugada");
    expect(await screen.findByText("15")).toBeTruthy();
    expect(screen.getByText("48")).toBeTruthy();
    expect(screen.getByText("55 %")).toBeTruthy();
    expect(fetch).toHaveBeenCalledWith("/hero/entrenamiento-detecciones.json");
  });

  it("pauses the video while the login drawer is open", () => {
    render(<VideoHero paused onStart={() => {}} onLogin={() => {}} />);
    expect(HTMLMediaElement.prototype.pause).toHaveBeenCalled();
  });
});
