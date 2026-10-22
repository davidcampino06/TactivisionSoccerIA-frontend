import { describe, expect, it } from "vitest";
import { ALL_SCENES, sceneFor } from "./scenes";

describe("stadium backdrop", () => {
  it("each section has its own stadium, at night in the dark theme and by day in the light one", () => {
    expect(sceneFor("/jugadores", "dark").src).toBe("/backdrop/noche-techo-rojo.webp");
    expect(sceneFor("/jugadores/demo-player-12", "dark").src).toBe("/backdrop/noche-techo-rojo.webp");
    expect(sceneFor("/jugadores", "light").src).toBe("/backdrop/dia-gradas-azules.webp");
    expect(sceneFor("/analisis/abc", "dark").src).toBe("/backdrop/noche-niebla.webp");
  });

  it("a page without its own photo gets the default one, and prefixes must match a whole segment", () => {
    expect(sceneFor("/perfil", "dark")).toEqual(sceneFor("/otra", "dark"));
    expect(sceneFor("/partidosx", "dark")).toEqual(sceneFor("/perfil", "dark"));
  });

  it("lists every photo once, to preload them", () => {
    expect(new Set(ALL_SCENES).size).toBe(ALL_SCENES.length);
    expect(ALL_SCENES.every((src) => src.startsWith("/backdrop/") && src.endsWith(".webp"))).toBe(true);
  });
});
