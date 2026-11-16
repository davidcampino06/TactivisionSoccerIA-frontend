// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { CharCount, CountedLabel } from "./CharCount";

afterEach(cleanup);

describe("CharCount", () => {
  it("shows the characters left and turns red near the limit", () => {
    const { rerender } = render(<CharCount value="Motivo" max={200} />);
    expect(screen.getByTestId("chars-left").dataset.left).toBe("194");
    expect(screen.getByTestId("chars-left").className).not.toContain("is-low");
    rerender(<CharCount value={"x".repeat(196)} max={200} />);
    expect(screen.getByTestId("chars-left").className).toContain("is-low");
    rerender(<CharCount value={"x".repeat(250)} max={200} />);
    expect(screen.getByTestId("chars-left").dataset.left).toBe("0");
  });

  it("does not change the name of the field it labels", () => {
    render(<label>
      <CountedLabel text="Motivo" value="" max={255} />
      <input />
    </label>);
    expect(screen.getByLabelText("Motivo")).toBeTruthy();
  });
});
