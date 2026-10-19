// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { shirtColorName } from "./shirtColor";
import { TeamLegend, TeamTag } from "./TeamColors";

afterEach(cleanup);

describe("shirtColorName", () => {
  // Colours the AI really returned for the calibration clips (CALIBRATION.md in the AI repository).
  it.each([
    ["#515350", "oscura"],   // France
    ["#a05845", "roja"],     // Morocco
    ["#d6ebd0", "blanca"],
    ["#7f7f69", "oscura"],
    ["#b27055", "roja"],     // Bayern, washed towards orange by the average
    ["#ced0b2", "blanca"],
    ["#763f35", "roja"],
    ["#abaf6a", "amarilla"],
    ["#3d6db5", "azul"],
  ])("%s is a %s shirt", (hex, name) => {
    expect(shirtColorName(hex)).toBe(name);
  });

  it("returns nothing for a value that is not a colour", () => {
    expect(shirtColorName("red")).toBe("");
  });
});

describe("TeamLegend and TeamTag", () => {
  it("says which team is which", () => {
    render(<TeamLegend colors={{ TEAM_A: "#515350", TEAM_B: "#a05845" }} />);
    expect(screen.getByText("camiseta oscura")).toBeTruthy();
    expect(screen.getByText("camiseta roja")).toBeTruthy();
  });

  it("shows nothing for analyses without colours", () => {
    const { container } = render(<TeamLegend colors={{ TEAM_A: null, TEAM_B: null }} />);
    expect(container.innerHTML).toBe("");
  });

  it("keeps the plain label when the colour is unknown", () => {
    render(<TeamTag team="TEAM_B" />);
    expect(screen.getByText("Equipo B")).toBeTruthy();
  });
});
