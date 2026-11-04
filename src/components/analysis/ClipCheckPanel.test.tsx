// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import ClipCheckPanel from "./ClipCheckPanel";

afterEach(cleanup);

describe("ClipCheckPanel", () => {
  it("shows the verdict and says which checks are measured and which are estimated", () => {
    render(<ClipCheckPanel result={{
      verdict: "warn", sampled_frames: 8,
      video: { fps: 30, frame_count: 780, width: 1920, height: 1080, duration_seconds: 26 },
      checks: [
        { code: "coverage", status: "warn", measured: true, title: "Dura 26 s: usa el modo completo", detail: "El modo rápido solo analiza los primeros 20 s." },
        { code: "cuts", status: "ok", measured: false, title: "Una sola toma", detail: "No se ven cambios bruscos de plano." },
      ],
    }} />);
    expect(screen.getByText("Se puede analizar, con avisos")).toBeTruthy();
    expect(screen.getByText("Es una guía: no impide analizar.")).toBeTruthy();
    expect(screen.getByRole("img", { name: "Aviso" })).toBeTruthy();
    expect(screen.getByText("Medido")).toBeTruthy();
    expect(screen.getByText("Estimado")).toBeTruthy();
  });
});
