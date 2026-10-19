export type TeamKey = "TEAM_A" | "TEAM_B";
/** Shirt colour of each team as the AI saw it (#rrggbb); missing in old or simulated analyses. */
export type TeamColors = Partial<Record<TeamKey, string | null>>;

// Hue ranges (degrees) -> Spanish adjective for "camiseta". The AI colour is the average of many
// shirt pixels, so it comes out duller than on screen: washed reds drift towards orange (~20°).
const HUES: [number, string][] = [
  [25, "roja"], [40, "naranja"], [70, "amarilla"], [160, "verde"], [200, "celeste"],
  [255, "azul"], [290, "morada"], [345, "rosada"], [360, "roja"],
];

/** "#515350" -> "oscura", "#a05845" -> "roja": a word a coach can match with the video. */
export function shirtColorName(hex: string): string {
  const match = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
  if (!match) return "";
  const [r, g, b] = match.slice(1).map((part) => parseInt(part, 16) / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const chroma = max - min;
  const lightness = (max + min) / 2;
  if (chroma < 0.12) return lightness < 0.5 ? "oscura" : lightness < 0.65 ? "gris" : "blanca";
  let hue = max === r ? ((g - b) / chroma) % 6 : max === g ? (b - r) / chroma + 2 : (r - g) / chroma + 4;
  hue = (hue * 60 + 360) % 360;
  return HUES.find(([limit]) => hue < limit)?.[1] ?? "roja";
}
