import type { Theme } from "../../theme/theme";

/**
 * Stadium photo behind each section of the app (public/backdrop, Unsplash licence).
 * Dark theme = a match at night; light theme = a match by day. `position` keeps the pitch in view
 * when the photo is cropped to the window.
 */
export interface Scene {
  src: string;
  position: string;
}

const photo = (name: string, position = "center"): Scene => ({ src: `/backdrop/${name}.webp`, position });

const NIGHT = {
  home: photo("noche-arco", "center 40%"),
  matches: photo("noche-tribuna-llena", "center 55%"),
  analysis: photo("noche-niebla", "center 45%"),
  tactics: photo("aerea", "center 60%"),
  players: photo("noche-techo-rojo", "center 62%"),
  team: photo("atardecer", "center 40%"),
  performance: photo("noche-tribuna-llena", "center 40%"),
  reports: photo("noche-niebla", "center 60%"),
  structures: photo("sillas-azules", "center 45%"),
  other: photo("noche-arco", "center 40%"),
};

const DAY: typeof NIGHT = {
  home: photo("dia-tribuna-llena", "center 72%"),
  matches: photo("dia-cubierta", "center 55%"),
  analysis: photo("dia-nublado", "center 55%"),
  tactics: photo("aerea", "center 60%"),
  players: photo("dia-gradas-azules", "center 50%"),
  team: photo("dia-cubierta", "center 45%"),
  performance: photo("dia-nublado", "center 50%"),
  reports: photo("dia-tribuna-llena", "center 60%"),
  structures: photo("sillas-azules", "center 45%"),
  other: photo("dia-tribuna-llena", "center 72%"),
};

const SECTIONS: [string, keyof typeof NIGHT][] = [
  ["/panel", "home"],
  ["/partidos", "matches"],
  ["/analisis", "analysis"],
  ["/revision", "analysis"],
  ["/diseno-tactico", "tactics"],
  ["/jugadores", "players"],
  ["/equipo", "team"],
  ["/comparacion", "performance"],
  ["/evolucion", "performance"],
  ["/reportes", "reports"],
  ["/estructuras", "structures"],
];

export function sceneFor(pathname: string, theme: Theme): Scene {
  const section = SECTIONS.find(([prefix]) => pathname === prefix || pathname.startsWith(`${prefix}/`))?.[1] ?? "other";
  return (theme === "light" ? DAY : NIGHT)[section];
}

/** Every photo, to warm the browser cache so changing section never shows an empty frame. */
export const ALL_SCENES = [...new Set([...Object.values(NIGHT), ...Object.values(DAY)].map((scene) => scene.src))];
