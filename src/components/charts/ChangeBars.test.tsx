// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import ChangeBars from "./ChangeBars";

afterEach(cleanup);

describe("ChangeBars", () => {
  it("says how much each indicator changed and whether that is better or worse, in words", () => {
    render(<ChangeBars rows={[
      { name: "Ancho del equipo", percent: 25, assessment: "BETTER", delta: "+10 pts" },
      { name: "Mayor espacio entre líneas", percent: -12.5, assessment: "WORSE", delta: "−3 pts" },
    ]} />);
    expect(screen.getByText("+25 %")).toBeTruthy();
    expect(screen.getByText("+10 pts · mejora")).toBeTruthy();
    expect(screen.getByText("−12,5 %")).toBeTruthy();
    expect(screen.getByText("−3 pts · empeora")).toBeTruthy();
  });

  it("draws increases to the right of the centre and decreases to the left, on one scale", () => {
    const { container } = render(<ChangeBars rows={[
      { name: "A", percent: 50, assessment: "BETTER", delta: "+1" },
      { name: "B", percent: -25, assessment: null, delta: "−1" },
    ]} />);
    const [up, down] = [...container.querySelectorAll<HTMLElement>(".change-bar")];
    expect(up.style.left).toBe("50%");
    expect(up.style.width).toBe("50%");
    expect(down.style.right).toBe("50%");
    expect(down.style.width).toBe("25%");
    expect(container.querySelectorAll(".is-better, .is-same").length).toBe(2);
  });
});
