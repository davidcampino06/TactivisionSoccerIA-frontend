// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { tokenStore } from "../../api/client";
import type { Track } from "../../types";
import { formatClock } from "./clock";
import TrackPhoto from "./TrackPhoto";

const track = (over: Partial<Track> = {}): Track => ({
  track_id: 7, label: "Trayectoria 7", detections: 40, first_frame: 0, last_frame: 300, mean_confidence: 0.8,
  player_id: null, first_seconds: 0, last_seconds: 12, has_snapshot: true, snapshot_seconds: 83.4, ...over,
});

beforeEach(() => {
  tokenStore.set("token-123");
  URL.createObjectURL = vi.fn(() => "blob:photo");
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  tokenStore.clear();
});

describe("TrackPhoto", () => {
  it("downloads the photo with the session and shows it with the minute it comes from", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch")
      .mockResolvedValue({ ok: true, status: 200, blob: async () => new Blob(["jpg"]) } as Response);
    render(<TrackPhoto analysisId="a1" track={track()} />);
    const image = await screen.findByRole("img", { name: "Trayectoria 7, cuadro del minuto 1:23" });
    expect(image.getAttribute("src")).toBe("blob:photo");
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toContain("/api/analyses/a1/tracks/7/snapshot");
    expect(((init ?? {}).headers as Record<string, string>).Authorization).toBe("Bearer token-123");
  });

  it("without a photo it shows the track number and never asks the server", () => {
    const fetchMock = vi.spyOn(globalThis, "fetch");
    render(<TrackPhoto analysisId="a2" track={track({ has_snapshot: false, snapshot_seconds: null })} />);
    expect(screen.getByRole("img", { name: "Trayectoria 7, sin foto" }).textContent).toBe("7");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("if the download fails it falls back to the number instead of a broken image", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({ ok: false, status: 404, json: async () => ({}) } as Response);
    render(<TrackPhoto analysisId="a3" track={track()} />);
    await waitFor(() => expect(screen.getByRole("img", { name: /sin foto/ }).textContent).toBe("…"));
    expect(document.querySelector("img")).toBeNull();
  });

  it("asks once for the same photo even if the table draws it again", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch")
      .mockResolvedValue({ ok: true, status: 200, blob: async () => new Blob(["jpg"]) } as Response);
    const first = render(<TrackPhoto analysisId="a4" track={track()} />);
    await first.findByRole("img", { name: /cuadro del minuto/ });
    first.unmount();
    render(<TrackPhoto analysisId="a4" track={track()} />);
    await screen.findByRole("img", { name: /cuadro del minuto/ });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe("formatClock", () => {
  it("writes where in the video something appears", () => {
    expect([0, 9.9, 83.4, 600, -3].map(formatClock)).toEqual(["0:00", "0:09", "1:23", "10:00", "0:00"]);
  });
});
