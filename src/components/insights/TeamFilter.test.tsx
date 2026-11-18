// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import TeamFilter from "./TeamFilter";

afterEach(cleanup);

describe("TeamFilter", () => {
  it("shows our team and the rival, and leaves out the groups with nothing", () => {
    const onChange = vi.fn();
    render(<TeamFilter value="own" onChange={onChange} counts={{ own: 12, rival: 12, team_a: 0, team_b: 0, match: 3 }} />);
    expect(screen.getAllByRole("button").map((button) => button.textContent))
      .toEqual(["Nuestro equipo12", "Rival12", "Partido3"]);
    fireEvent.click(screen.getByRole("button", { name: /Rival/ }));
    expect(onChange).toHaveBeenCalledWith("rival");
  });

  it("keeps A and B when it is not known which team is ours", () => {
    render(<TeamFilter value="team_a" onChange={() => {}} counts={{ own: 0, rival: 0, team_a: 5, team_b: 5, match: 1 }} />);
    expect(screen.getAllByRole("button").map((button) => button.textContent)).toEqual(["Equipo A5", "Equipo B5", "Partido1"]);
  });
});
