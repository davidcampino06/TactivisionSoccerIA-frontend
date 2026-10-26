// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { IssueExplanation as Explanation } from "../../types";
import IssueExplanation from "./IssueExplanation";

const explanation: Explanation = {
  seen: "Cuando el rival tenía el balón (unos 2 segundos de juego), en el Equipo B el número de defensores cerca del jugador que llevaba el balón fue en promedio 0,1 jugadores.",
  meaning: "Dejaron jugar al rival con tranquilidad.",
  coach: "Que el jugador más cercano salga a presionar.",
  example: {
    frame_number: 65, timestamp_seconds: 2.17, aspect_ratio: 0.5625, team: "TEAM_B", value: 0, owner: "TEAM_A",
    players: [
      { id: 1, team: "TEAM_A", x: 0.22, y: 0.43 },
      { id: 101, team: "TEAM_B", x: 0.6, y: 0.5 },
      { id: 102, team: "TEAM_B", x: 0.7, y: 0.4 },
      { id: 900, team: "UNASSIGNED", x: 0.5, y: 0.3 },
    ],
    ball: [0.23, 0.43],
    overlay: { kind: "pressure", radius: 0.1, pressing: [] },
  },
};

afterEach(cleanup);

describe("IssueExplanation", () => {
  it("is closed until the coach opens it", () => {
    render(<IssueExplanation explanation={explanation} />);
    const toggle = screen.getByRole("button", { name: "Ver explicación y jugada" });
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByText("Qué vio la IA")).toBeNull();
    fireEvent.click(toggle);
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByText(explanation.meaning!)).toBeTruthy();
    expect(screen.getByText(explanation.coach!)).toBeTruthy();
  });

  it("draws the frame with every player, the ball and the pressure circle", () => {
    render(<IssueExplanation explanation={explanation} colors={{ TEAM_A: "#515350", TEAM_B: "#a05845" }} />);
    fireEvent.click(screen.getByRole("button"));
    const svg = document.querySelector("svg.pitch-example")!;
    expect(svg.querySelectorAll(".pitch-example-player")).toHaveLength(4);
    expect(svg.querySelectorAll(".pitch-example-player.is-focus")).toHaveLength(2);   // Team B, the one judged
    expect(svg.querySelector(".pitch-example-ball")).toBeTruthy();
    // 10 % of the image width, drawn in a 160-unit wide frame.
    expect(svg.querySelector(".pitch-example-pressure")!.getAttribute("r")).toBe("16");
    expect(screen.getByText(/ningún defensor dentro/)).toBeTruthy();
    expect(screen.getByText(/Tenía el balón: el Equipo A/)).toBeTruthy();
    expect(screen.getByText(/^En este cuadro se ven 2 jugadores del Equipo B \(resaltados\)/)).toBeTruthy();
  });

  it("says so when an older analysis has no example frame", () => {
    render(<IssueExplanation explanation={{ ...explanation, example: null }} />);
    fireEvent.click(screen.getByRole("button"));
    expect(screen.getByText(/no trae una jugada de ejemplo/)).toBeTruthy();
    expect(document.querySelector("svg.pitch-example")).toBeNull();
  });
});

describe("IssueExplanation captions", () => {
  it("counts the groups of a split team", () => {
    const split: Explanation = { ...explanation, example: { ...explanation.example!, team: "TEAM_A",
      overlay: { kind: "network", links: [[1, 2]], groups: [[1, 2], [3], [4]], isolated: [3, 4] } } };
    render(<IssueExplanation explanation={split} />);
    fireEvent.click(screen.getByRole("button"));
    expect(screen.getByText(/^3 grupos sin conexión entre sí, 2 jugadores solos/)).toBeTruthy();
  });

  it("explains a strength: how to keep it, and the drawing in green", () => {
    const strength: Explanation = {
      seen: "Cuando el rival tenía el balón (unos 3 segundos de juego), en el Equipo A hubo al menos un jugador encima del rival que llevaba el balón en el 90 % de esos momentos.",
      meaning: "El rival casi nunca pudo jugar tranquilo.",
      keep: "Mantener la reacción del jugador más cercano.",
      example: { ...explanation.example!, team: "TEAM_A", owner: "TEAM_B", overlay: { kind: "pressure", radius: 0.1, pressing: [1] } },
    };
    const { container } = render(<IssueExplanation explanation={strength} positive />);
    fireEvent.click(screen.getByRole("button"));
    expect(screen.getByText("Cómo mantenerlo")).toBeTruthy();
    expect(screen.getByText(strength.keep!)).toBeTruthy();
    expect(screen.queryByText("Qué podría trabajar el cuerpo técnico")).toBeNull();
    expect(container.querySelector("svg.pitch-example.is-positive")).not.toBeNull();
    expect(screen.getByText("Círculo: zona de presión alrededor del balón; 1 defensor encima.")).toBeTruthy();
  });
});
