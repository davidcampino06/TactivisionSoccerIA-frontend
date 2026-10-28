// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, describe, expect, it } from "vitest";
import type { Tracking } from "../../types";
import TrackingSteps from "./TrackingSteps";

afterEach(cleanup);

const step = (id: string, opponent: string, state: Tracking["timeline"][number]["state"]) => ({
  match_id: id, opponent, match_date: "2026-10-11T15:00:00", analysis_id: `a-${id}`, state,
});

describe("TrackingSteps", () => {
  it("says what each analysed match showed after the confirmation, linking to its analysis", () => {
    render(<MemoryRouter><TrackingSteps tracking={{
      trend: "GONE", measured_after: 1, came_back: 0,
      timeline: [step("m1", "Rionegro", "CONFIRMED"), step("m2", "Marruecos", "NOT_DETECTED"), step("m3", "Cali", "NOT_MEASURED")],
    }} /></MemoryRouter>);
    expect(screen.getByText("No ha vuelto")).toBeTruthy();
    expect(screen.getByText("No ha vuelto a aparecer en 1 partido analizado después de confirmarlo.")).toBeTruthy();
    expect(screen.getByRole("link", { name: "vs Marruecos" }).getAttribute("href")).toBe("/analisis/a-m2");
    expect(screen.getAllByText(/no apareció|no se pudo juzgar|confirmado/).map((e) => e.textContent?.split("· ")[1]))
      .toEqual(["confirmado", "no apareció", "no se pudo juzgar"]);
  });

  it("warns when the problem came back in the last analysed match", () => {
    render(<MemoryRouter><TrackingSteps tracking={{
      trend: "RECURRING", measured_after: 2, came_back: 1,
      timeline: [step("m1", "Rionegro", "CONFIRMED"), step("m2", "Marruecos", "NOT_DETECTED"), step("m3", "Cali", "DETECTED")],
    }} /></MemoryRouter>);
    expect(screen.getByText("Sigue apareciendo")).toBeTruthy();
    expect(screen.getByText(/Volvió a aparecer en el último partido analizado \(1 de 2 partidos analizados/)).toBeTruthy();
  });

  it("does not say there is no match after when there is one that could not be judged", () => {
    render(<MemoryRouter><TrackingSteps tracking={{
      trend: "NO_DATA", measured_after: 0, came_back: 0,
      timeline: [step("m1", "Rionegro", "CONFIRMED"), step("m2", "Marruecos", "NOT_MEASURED")],
    }} /></MemoryRouter>);
    expect(screen.getByText("Sin datos todavía")).toBeTruthy();
    expect(screen.getByText("Hay 1 partido analizado después de confirmarlo, pero en él no se pudo juzgar.")).toBeTruthy();
  });
});
