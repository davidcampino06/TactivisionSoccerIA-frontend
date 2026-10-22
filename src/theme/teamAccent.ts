/**
 * The team's kit colour as the accent of the app (highlights, active menu item, labels).
 * A kit colour can be anything, so it is adapted to stay readable: lighter on the dark theme,
 * darker on the light one. White, grey and black kits have no hue to show: the app keeps its gold.
 */
export interface TeamAccent {
  /** For dark backgrounds (dark theme and the cards that sit on photos). */
  onDark: string;
  /** For the light theme. */
  onLight: string;
}

function toHsl(hex: string): [number, number, number] | null {
  const match = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!match) return null;
  const value = parseInt(match[1], 16);
  const [r, g, b] = [(value >> 16) & 255, (value >> 8) & 255, value & 255].map((channel) => channel / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const light = (max + min) / 2;
  const delta = max - min;
  if (delta === 0) return [0, 0, light];
  const saturation = delta / (1 - Math.abs(2 * light - 1));
  const hue = max === r ? ((g - b) / delta) % 6 : max === g ? (b - r) / delta + 2 : (r - g) / delta + 4;
  return [(hue * 60 + 360) % 360, saturation, light];
}

const hsl = (hue: number, saturation: number, light: number) =>
  `hsl(${Math.round(hue)} ${Math.round(saturation * 100)}% ${Math.round(light * 100)}%)`;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export function teamAccent(kitColor: string | null | undefined): TeamAccent | null {
  const parsed = kitColor ? toHsl(kitColor) : null;
  if (!parsed) return null;
  const [hue, saturation, light] = parsed;
  if (saturation < 0.18 || light < 0.08 || light > 0.95) return null; // white, grey or black kit
  const vivid = Math.max(saturation, 0.55);
  return { onDark: hsl(hue, vivid, clamp(light, 0.58, 0.72)), onLight: hsl(hue, vivid, clamp(light, 0.3, 0.42)) };
}
