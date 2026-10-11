// Lightweight tactical simulation used by the login hero animation.
// Units are meters on a 105 x 68 pitch. Team A attacks left -> right.

export const PITCH_LENGTH = 105;
export const PITCH_WIDTH = 68;

export type TeamId = "A" | "B";
export type Line = "GK" | "DEF" | "MID" | "FWD";

export interface Point {
  x: number;
  y: number;
}

export interface Player extends Point {
  trackId: number;
  team: TeamId;
  line: Line;
  base: Point;
  phase: number;
  confidence: number;
  trail: Point[];
}

export interface Ball extends Point {
  from: Point;
  to: Point;
  progress: number;
  duration: number;
  carrier: Player;
  receiver: Player | null;
  holdTime: number;
}

export interface TeamMetrics {
  width: number;
  compactnessArea: number;
  lineGap: number;
  detections: number;
}

const FORMATION_A: [Line, number, number][] = [
  ["GK", 6, 34],
  ["DEF", 22, 10], ["DEF", 20, 26], ["DEF", 20, 42], ["DEF", 22, 58],
  ["MID", 38, 18], ["MID", 35, 34], ["MID", 38, 50],
  ["FWD", 55, 12], ["FWD", 58, 34], ["FWD", 55, 56],
];

const FORMATION_B: [Line, number, number][] = [
  ["GK", 99, 34],
  ["DEF", 83, 12], ["DEF", 85, 27], ["DEF", 85, 41], ["DEF", 83, 56],
  ["MID", 70, 10], ["MID", 68, 26], ["MID", 68, 42], ["MID", 70, 58],
  ["FWD", 56, 27], ["FWD", 56, 41],
];

const TRAIL_LENGTH = 14;
const TRAIL_INTERVAL = 0.12;
const PLAYER_SPEED = 6.5; // m/s
const BALL_SPEED = 20; // m/s

// Deterministic pseudo-random generator so the animation looks the same on every load.
function createRandom(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export class TacticalSimulation {
  readonly players: Player[];
  readonly ball: Ball;
  private readonly random = createRandom(7);
  private time = 0;
  private trailClock = 0;

  constructor() {
    let trackId = 1;
    const build = (team: TeamId, formation: [Line, number, number][]) =>
      formation.map(([line, x, y]) => ({
        trackId: trackId++,
        team,
        line,
        x,
        y,
        base: { x, y },
        phase: this.random() * Math.PI * 2,
        confidence: 0.82 + this.random() * 0.15,
        trail: [],
      }));
    this.players = [...build("A", FORMATION_A), ...build("B", FORMATION_B)];
    const carrier = this.players[2];
    this.ball = {
      x: carrier.x, y: carrier.y,
      from: { x: carrier.x, y: carrier.y }, to: { x: carrier.x, y: carrier.y },
      progress: 1, duration: 1, carrier, receiver: null, holdTime: 0.8,
    };
  }

  step(dt: number): void {
    this.time += dt;
    this.updateBall(dt);
    this.updatePlayers(dt);
    this.trailClock += dt;
    if (this.trailClock >= TRAIL_INTERVAL) {
      this.trailClock = 0;
      for (const player of this.players) {
        player.trail.push({ x: player.x, y: player.y });
        if (player.trail.length > TRAIL_LENGTH) player.trail.shift();
      }
    }
  }

  team(team: TeamId): Player[] {
    return this.players.filter((player) => player.team === team);
  }

  metrics(team: TeamId): TeamMetrics {
    const outfield = this.team(team).filter((player) => player.line !== "GK");
    const ys = outfield.map((player) => player.y);
    const lineX = (line: Line) => {
      const members = outfield.filter((player) => player.line === line);
      return members.reduce((sum, player) => sum + player.x, 0) / members.length;
    };
    return {
      width: Math.max(...ys) - Math.min(...ys),
      compactnessArea: polygonArea(convexHull(outfield)),
      lineGap: Math.abs(lineX("MID") - lineX("DEF")),
      detections: this.players.length + 1,
    };
  }

  private updateBall(dt: number): void {
    const ball = this.ball;
    if (ball.receiver) {
      ball.progress = Math.min(1, ball.progress + dt / ball.duration);
      const eased = 1 - Math.pow(1 - ball.progress, 2);
      ball.x = ball.from.x + (ball.to.x - ball.from.x) * eased;
      ball.y = ball.from.y + (ball.to.y - ball.from.y) * eased;
      if (ball.progress >= 1) {
        ball.carrier = ball.receiver;
        ball.receiver = null;
        ball.holdTime = 0.5 + this.random() * 0.7;
      }
      return;
    }
    // Carrier dribbles slightly forward, then passes.
    ball.x = ball.carrier.x + 0.9;
    ball.y = ball.carrier.y;
    ball.holdTime -= dt;
    if (ball.holdTime <= 0) this.startPass();
  }

  private startPass(): void {
    const ball = this.ball;
    const carrier = ball.carrier;
    const deepInAttack = carrier.x > 72;
    const candidates = this.team(carrier.team).filter((player) => player !== carrier && player.line !== "GK");
    const weights = candidates.map((player) => {
      const gain = player.x - carrier.x;
      const reach = distance(player, carrier);
      if (reach < 8 || reach > 40) return 0.05;
      const direction = deepInAttack ? -gain : gain;
      return Math.max(0.15, 1 + direction / 15) * (1 - reach / 60);
    });
    const total = weights.reduce((sum, weight) => sum + weight, 0);
    let pick = this.random() * total;
    let receiver = candidates[0];
    for (let index = 0; index < candidates.length; index += 1) {
      pick -= weights[index];
      if (pick <= 0) {
        receiver = candidates[index];
        break;
      }
    }
    const lead = { x: clamp(receiver.x + 2, 2, PITCH_LENGTH - 2), y: receiver.y };
    ball.from = { x: ball.x, y: ball.y };
    ball.to = lead;
    ball.progress = 0;
    ball.duration = Math.max(0.6, distance(ball.from, lead) / BALL_SPEED);
    ball.receiver = receiver;
  }

  private updatePlayers(dt: number): void {
    const focus = this.ball.receiver ? this.ball.to : this.ball;
    const shiftX = (focus.x - PITCH_LENGTH / 2) * 0.32;
    const shiftY = (focus.y - PITCH_WIDTH / 2) * 0.22;

    for (const player of this.players) {
      let target: Point;
      if (player === this.ball.receiver) {
        target = this.ball.to;
      } else if (player.line === "GK") {
        target = { x: player.base.x, y: clamp(PITCH_WIDTH / 2 + shiftY * 0.6, 28, 40) };
      } else {
        const wobble = Math.sin(this.time * 0.9 + player.phase) * 1.4;
        target = {
          x: clamp(player.base.x + shiftX + wobble, 3, PITCH_LENGTH - 3),
          y: clamp(player.base.y + shiftY + Math.cos(this.time * 0.7 + player.phase) * 1.1, 3, PITCH_WIDTH - 3),
        };
      }
      const gap = distance(player, target);
      if (gap > 0.01) {
        const move = Math.min(gap, PLAYER_SPEED * dt * (gap > 6 ? 1.3 : 1));
        player.x += ((target.x - player.x) / gap) * move;
        player.y += ((target.y - player.y) / gap) * move;
      }
      player.confidence = clamp(player.confidence + (this.random() - 0.5) * 0.01, 0.78, 0.97);
    }
  }
}

/** Andrew's monotone chain, O(n log n). */
export function convexHull(points: Point[]): Point[] {
  const sorted = [...points].sort((a, b) => a.x - b.x || a.y - b.y);
  if (sorted.length < 3) return sorted;
  const cross = (o: Point, a: Point, b: Point) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
  const lower: Point[] = [];
  for (const point of sorted) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], point) <= 0) lower.pop();
    lower.push(point);
  }
  const upper: Point[] = [];
  for (let index = sorted.length - 1; index >= 0; index -= 1) {
    const point = sorted[index];
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], point) <= 0) upper.pop();
    upper.push(point);
  }
  return [...lower.slice(0, -1), ...upper.slice(0, -1)];
}

/** Shoelace formula. */
export function polygonArea(polygon: Point[]): number {
  let area = 0;
  for (let index = 0; index < polygon.length; index += 1) {
    const current = polygon[index];
    const next = polygon[(index + 1) % polygon.length];
    area += current.x * next.y - next.x * current.y;
  }
  return Math.abs(area) / 2;
}
