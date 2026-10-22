import { describe, expect, it } from "vitest";
import { teamAccent } from "./teamAccent";

describe("team accent", () => {
  it("keeps the hue of the kit, lighter on dark backgrounds and darker on light ones", () => {
    expect(teamAccent("#e3b23c")).toEqual({ onDark: "hsl(42 75% 58%)", onLight: "hsl(42 75% 42%)" });
  });

  it("a very dark kit (navy) is lifted so it can be read on the dark theme", () => {
    expect(teamAccent("#0e1f4d")).toEqual({ onDark: "hsl(224 69% 58%)", onLight: "hsl(224 69% 30%)" });
  });

  it("white, grey and black kits, or no kit, keep the app's own gold", () => {
    expect(teamAccent("#ffffff")).toBeNull();
    expect(teamAccent("#808080")).toBeNull();
    expect(teamAccent("#000000")).toBeNull();
    expect(teamAccent(null)).toBeNull();
    expect(teamAccent("rojo")).toBeNull();
  });
});
