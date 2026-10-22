// @vitest-environment jsdom
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { Board } from "./board";
import Pitch from "./Pitch";

afterEach(cleanup);

const BOARD: Board = {
  formation: null, arrows: [], notes: "",
  tokens: [
    { id: "a", side: "own", x: 30, y: 30, label: "12", playerId: "p12" },
    { id: "b", side: "own", x: 50, y: 30, label: "9", playerId: "p9" },
  ],
};

describe("Pitch", () => {
  it("marks a linked player who cannot play with a red cross and says why", () => {
    const { container } = render(
      <Pitch board={BOARD} tool="select" selectedId={null} readOnly ariaLabel="Jugada"
        names={{ p12: "Agudelo", p9: "Zapata" }} unavailable={{ p12: "lesionado (Esguince de tobillo)" }} />);
    const tokens = [...container.querySelectorAll("g.token")];
    expect(tokens.map((token) => token.classList.contains("is-unavailable"))).toEqual([true, false]);
    expect(tokens[0].querySelector(".token-out")).not.toBeNull();
    expect(tokens[0].querySelector("title")?.textContent).toBe("Agudelo: lesionado (Esguince de tobillo)");
    expect(tokens[1].querySelector("title")?.textContent).toBe("Zapata");
  });
});
