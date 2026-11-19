// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import TrainingDrill from "./TrainingDrill";

afterEach(cleanup);

const drill = {
  code: "LOW_BALL_PRESSURE", name: "Presión tras pérdida de 5 segundos",
  objective: "Presionar al poseedor justo después de perder el balón.",
  organization: "Cancha de 40 × 30 m.", development: "Juego de posesión.",
  keys: ["El más cercano sale de inmediato al poseedor.", "Orientar la presión hacia la banda."],
  variant: "Bajar a 3 segundos.", note: "Ejercicio sugerido como guía de trabajo, no calculado por la IA.",
};

describe("TrainingDrill", () => {
  it("shows the exercise folded under its name, with its parts and the note", () => {
    const { container } = render(<TrainingDrill drill={drill} />);
    expect(screen.getByText("Ejercicio sugerido: Presión tras pérdida de 5 segundos")).toBeTruthy();
    expect(container.querySelector("details")!.open).toBe(false);
    expect(screen.getByText("Orientar la presión hacia la banda.")).toBeTruthy();
    expect(screen.getByText("Cancha de 40 × 30 m.")).toBeTruthy();
    expect(screen.getByText(/no calculado por la IA/)).toBeTruthy();
  });
});
