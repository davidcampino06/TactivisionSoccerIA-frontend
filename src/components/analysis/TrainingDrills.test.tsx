// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import TrainingDrills from "./TrainingDrills";

afterEach(cleanup);

const drill = (name: string) => ({
  code: "LOW_BALL_PRESSURE", name, objective: `Objetivo de ${name}.`,
  organization: "Cancha de 40 × 30 m.", development: "Juego de posesión.",
  keys: ["El más cercano sale de inmediato al poseedor.", `Clave de ${name}.`],
  variant: "Bajar a 3 segundos.", note: "Ejercicio sugerido como guía de trabajo, no calculado por la IA.",
});

describe("TrainingDrills", () => {
  it("lists the main exercise and the alternatives, each folded, with the note once", () => {
    const { container } = render(<TrainingDrills drills={[drill("Presión tras pérdida"), drill("Presión 1 contra 1"), drill("Presión en trío")]} />);
    expect(screen.getByText("Ejercicios sugeridos (3)")).toBeTruthy();
    const summaries = [...container.querySelectorAll("summary")].map((item) => item.textContent);
    expect(summaries).toEqual(["PrincipalPresión tras pérdida", "AlternativaPresión 1 contra 1", "AlternativaPresión en trío"]);
    expect([...container.querySelectorAll("details")].every((item) => !item.open)).toBe(true);
    expect(screen.getByText("Clave de Presión en trío.")).toBeTruthy();
    expect(screen.getAllByText(/no calculado por la IA/)).toHaveLength(1);
  });

  it("shows nothing for an issue without exercises", () => {
    const { container } = render(<TrainingDrills drills={[]} />);
    expect(container.innerHTML).toBe("");
  });
});
