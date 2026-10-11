/**
 * Tactical board model. Coordinates are metres on a 105 x 68 pitch:
 * x goes from my goal (0) to the rival goal (105), y from the top touchline (0) to the bottom (68).
 * The board is saved as the JSON configuration of a tactical play version.
 */

export const PITCH = { length: 105, width: 68 } as const;
export const SCHEMA_VERSION = 1;

export type Side = "own" | "rival" | "ball";
export type ArrowKind = "pass" | "run" | "dribble";
export type Tool = "select" | "own" | "rival" | "ball" | ArrowKind | "erase";

export interface Token {
  id: string;
  side: Side;
  x: number;
  y: number;
  label: string;
  playerId: string | null;
}

export interface Arrow {
  id: string;
  kind: ArrowKind;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface Board {
  formation: string | null;
  tokens: Token[];
  arrows: Arrow[];
  notes: string;
}

export const EMPTY_BOARD: Board = { formation: null, tokens: [], arrows: [], notes: "" };

export const FORMATIONS = ["4-3-3", "4-4-2", "4-2-3-1", "3-5-2", "5-3-2", "4-1-4-1"] as const;
export const ACTION_TYPES = ["BUILD_UP", "PRESSING", "COUNTER_ATTACK", "POSITIONAL_ATTACK", "DEFENSIVE_BLOCK", "SET_PIECE"] as const;
export const MAX_TOKENS = 30;
export const MAX_ARROWS = 40;

const round = (value: number) => Math.round(value * 10) / 10;
export const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export function clampPoint(x: number, y: number): { x: number; y: number } {
  return { x: round(clamp(x, 0, PITCH.length)), y: round(clamp(y, 0, PITCH.width)) };
}

let counter = 0;
export function newId(prefix: string): string {
  counter += 1;
  return `${prefix}${Date.now().toString(36)}${counter.toString(36)}`;
}

/** Next free shirt-style label for a side: 1, 2, 3... */
export function nextLabel(tokens: Token[], side: Side): string {
  if (side === "ball") return "";
  const used = new Set(tokens.filter((token) => token.side === side).map((token) => token.label));
  let n = 1;
  while (used.has(String(n))) n += 1;
  return String(n);
}

/**
 * Places 11 players for a formation such as "4-2-3-1": the goalkeeper plus one line per number,
 * spread evenly along the pitch and across its width. The rival is mirrored on the other half.
 */
export function formationTokens(formation: string, side: "own" | "rival"): Token[] {
  const lines = formation.split("-").map(Number).filter((n) => n > 0);
  const firstLine = 20;
  const lastLine = 62;
  const step = lines.length > 1 ? (lastLine - firstLine) / (lines.length - 1) : 0;
  const mirror = (x: number) => (side === "own" ? x : PITCH.length - x);
  const tokens: Token[] = [{ id: newId(side[0]), side, x: mirror(5), y: PITCH.width / 2, label: "1", playerId: null }];
  let label = 2;
  lines.forEach((count, lineIndex) => {
    const x = firstLine + step * lineIndex;
    for (let i = 0; i < count; i += 1) {
      const y = (PITCH.width * (i + 1)) / (count + 1);
      tokens.push({ id: newId(side[0]), side, x: round(mirror(x)), y: round(y), label: String(label), playerId: null });
      label += 1;
    }
  });
  return tokens;
}

/** Board -> JSON saved in the version (snake_case like the rest of the API). */
export function toConfiguration(board: Board): Record<string, unknown> {
  return {
    schema: SCHEMA_VERSION,
    formation: board.formation,
    notes: board.notes,
    tokens: board.tokens.map((token) => ({
      id: token.id, side: token.side, x: token.x, y: token.y, label: token.label, player_id: token.playerId,
    })),
    arrows: board.arrows.map((arrow) => ({ ...arrow })),
  };
}

const isNumber = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);
const SIDES: Side[] = ["own", "rival", "ball"];
const KINDS: ArrowKind[] = ["pass", "run", "dribble"];

/** JSON from the server -> Board. Ignores anything malformed instead of breaking the editor. */
export function fromConfiguration(configuration: Record<string, unknown> | null | undefined): Board {
  if (!configuration) return EMPTY_BOARD;
  const rawTokens = Array.isArray(configuration.tokens) ? configuration.tokens : [];
  const rawArrows = Array.isArray(configuration.arrows) ? configuration.arrows : [];
  const tokens: Token[] = rawTokens.flatMap((raw: Record<string, unknown>) => {
    if (!raw || !SIDES.includes(raw.side as Side) || !isNumber(raw.x) || !isNumber(raw.y)) return [];
    const point = clampPoint(raw.x, raw.y);
    return [{
      id: typeof raw.id === "string" ? raw.id : newId("t"), side: raw.side as Side, ...point,
      label: typeof raw.label === "string" ? raw.label.slice(0, 3) : "",
      playerId: typeof raw.player_id === "string" ? raw.player_id : null,
    }];
  }).slice(0, MAX_TOKENS);
  const arrows: Arrow[] = rawArrows.flatMap((raw: Record<string, unknown>) => {
    if (!raw || !KINDS.includes(raw.kind as ArrowKind)) return [];
    if (![raw.x1, raw.y1, raw.x2, raw.y2].every(isNumber)) return [];
    const start = clampPoint(raw.x1 as number, raw.y1 as number);
    const end = clampPoint(raw.x2 as number, raw.y2 as number);
    return [{ id: typeof raw.id === "string" ? raw.id : newId("a"), kind: raw.kind as ArrowKind, x1: start.x, y1: start.y, x2: end.x, y2: end.y }];
  }).slice(0, MAX_ARROWS);
  return {
    formation: typeof configuration.formation === "string" ? configuration.formation : null,
    tokens,
    arrows,
    notes: typeof configuration.notes === "string" ? configuration.notes : "",
  };
}

/** Same content? (used to know whether there are unsaved changes) */
export function sameBoard(a: Board, b: Board): boolean {
  return JSON.stringify(toConfiguration(a)) === JSON.stringify(toConfiguration(b));
}
