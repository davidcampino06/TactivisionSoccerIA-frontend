import { useEffect, useRef } from "react";
import { es } from "../i18n/es";
import {
  PITCH_LENGTH, PITCH_WIDTH, TacticalSimulation, convexHull, type Player, type Point, type TeamMetrics,
} from "../pitch/simulation";

type Props = { onMetrics?: (metrics: TeamMetrics) => void };

const COLORS = {
  grass: "#0b2318",
  stripe: "#0e2a1c",
  chalk: "rgba(226, 236, 228, 0.42)",
  teamA: [191, 227, 255] as const,
  teamB: [255, 107, 87] as const,
  ball: "#ffffff",
};

const rgba = (rgb: readonly [number, number, number], alpha: number) => `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${alpha})`;
const LABEL_ROTATION_SECONDS = 2.6;
const METRICS_INTERVAL_SECONDS = 0.6;

/** Animated top-down pitch with detection boxes, tracking trails and team shape overlays. */
export default function PitchCanvas({ onMetrics }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const metricsRef = useRef(onMetrics);
  useEffect(() => {
    metricsRef.current = onMetrics;
  }, [onMetrics]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;

    const simulation = new TacticalSimulation();
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let frame = 0;
    let last = performance.now();
    let labelClock = LABEL_ROTATION_SECONDS;
    let metricsClock = METRICS_INTERVAL_SECONDS;
    let labeled = new Set<Player>();
    let view = { scale: 1, offsetX: 0, offsetY: 0, width: 0, height: 0, dpr: 1 };

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      // clientWidth/Height = layout size, unaffected by the CSS 3D tilt (getBoundingClientRect is not).
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      const margin = 0.06;
      const scale = Math.min((width * (1 - margin * 2)) / PITCH_LENGTH, (height * (1 - margin * 2)) / PITCH_WIDTH);
      view = {
        scale, dpr, width, height,
        offsetX: (width - PITCH_LENGTH * scale) / 2,
        offsetY: (height - PITCH_WIDTH * scale) / 2,
      };
    };

    const toScreen = (point: Point) => ({ x: view.offsetX + point.x * view.scale, y: view.offsetY + point.y * view.scale });

    const pickLabels = () => {
      const pool = simulation.players.filter((player) => player !== simulation.ball.carrier);
      const next = new Set<Player>([simulation.ball.carrier]);
      while (next.size < 7) next.add(pool[Math.floor(Math.random() * pool.length)]);
      labeled = next;
    };

    const draw = () => {
      const { scale: s } = view;
      context.setTransform(view.dpr, 0, 0, view.dpr, 0, 0);
      context.clearRect(0, 0, view.width, view.height);
      drawPitch(context, view, s);

      // Team A shape: convex hull of outfield players (compactness indicator).
      const teamA = simulation.team("A").filter((player) => player.line !== "GK");
      const hull = convexHull(teamA).map(toScreen);
      context.beginPath();
      hull.forEach((point, index) => (index ? context.lineTo(point.x, point.y) : context.moveTo(point.x, point.y)));
      context.closePath();
      context.fillStyle = rgba(COLORS.teamA, 0.07);
      context.fill();
      context.setLineDash([4, 5]);
      context.strokeStyle = rgba(COLORS.teamA, 0.32);
      context.lineWidth = 1;
      context.stroke();
      context.setLineDash([]);

      // Defensive lines of both teams.
      for (const [team, color] of [["A", COLORS.teamA], ["B", COLORS.teamB]] as const) {
        const defenders = simulation.team(team).filter((player) => player.line === "DEF").sort((a, b) => a.y - b.y).map(toScreen);
        context.beginPath();
        defenders.forEach((point, index) => (index ? context.lineTo(point.x, point.y) : context.moveTo(point.x, point.y)));
        context.strokeStyle = rgba(color, team === "A" ? 0.55 : 0.3);
        context.lineWidth = 1.4;
        context.stroke();
      }

      // Pass line.
      const ball = simulation.ball;
      if (ball.receiver) {
        const from = toScreen(ball.from);
        const to = toScreen(ball.to);
        context.setLineDash([2, 4]);
        context.strokeStyle = "rgba(255, 255, 255, 0.45)";
        context.lineWidth = 1;
        context.beginPath();
        context.moveTo(from.x, from.y);
        context.lineTo(to.x, to.y);
        context.stroke();
        context.setLineDash([]);
      }

      // Tracking trails, players and detection boxes.
      const radius = Math.max(3, s * 0.85);
      const box = Math.max(9, s * 2.3);
      context.font = `500 ${Math.max(9, Math.round(s * 1.25))}px "JetBrains Mono", ui-monospace, monospace`;
      context.textBaseline = "bottom";
      for (const player of simulation.players) {
        const color = player.team === "A" ? COLORS.teamA : COLORS.teamB;
        const position = toScreen(player);

        player.trail.forEach((point, index) => {
          const trailPoint = toScreen(point);
          context.fillStyle = rgba(color, (index / player.trail.length) * 0.25);
          context.beginPath();
          context.arc(trailPoint.x, trailPoint.y, radius * 0.35, 0, Math.PI * 2);
          context.fill();
        });

        context.fillStyle = rgba(color, 1);
        context.strokeStyle = "rgba(4, 14, 9, 0.9)";
        context.lineWidth = 1.5;
        context.beginPath();
        context.arc(position.x, position.y, radius, 0, Math.PI * 2);
        context.fill();
        context.stroke();

        const highlighted = labeled.has(player);
        drawBrackets(context, position, box, rgba(color, highlighted ? 0.95 : 0.35));
        if (highlighted) {
          const label = `ID ${String(player.trackId).padStart(2, "0")} · ${player.confidence.toFixed(2)}`;
          context.fillStyle = rgba(color, 0.95);
          context.fillText(label, position.x - box / 2, position.y - box / 2 - 3);
        }
      }

      // Ball with its own detection box.
      const ballPoint = toScreen(ball);
      context.shadowColor = "rgba(255, 255, 255, 0.8)";
      context.shadowBlur = 8;
      context.fillStyle = COLORS.ball;
      context.beginPath();
      context.arc(ballPoint.x, ballPoint.y, Math.max(2.2, s * 0.5), 0, Math.PI * 2);
      context.fill();
      context.shadowBlur = 0;
      drawBrackets(context, ballPoint, box * 0.8, "rgba(255, 255, 255, 0.85)");
    };

    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      simulation.step(dt);
      labelClock += dt;
      if (labelClock >= LABEL_ROTATION_SECONDS) {
        labelClock = 0;
        pickLabels();
      }
      metricsClock += dt;
      if (metricsClock >= METRICS_INTERVAL_SECONDS) {
        metricsClock = 0;
        metricsRef.current?.(simulation.metrics("A"));
      }
      draw();
      frame = requestAnimationFrame(tick);
    };

    resize();
    const observer = new ResizeObserver(() => {
      resize();
      draw();
    });
    observer.observe(canvas);

    if (reducedMotion) {
      for (let index = 0; index < 120; index += 1) simulation.step(1 / 30);
      pickLabels();
      metricsRef.current?.(simulation.metrics("A"));
      draw();
    } else {
      frame = requestAnimationFrame(tick);
    }

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, []);

  return <canvas ref={canvasRef} className="pitch-canvas" role="img" aria-label={es.pitch.tracking} />;
}

type View = { scale: number; offsetX: number; offsetY: number; width: number; height: number };

function drawPitch(context: CanvasRenderingContext2D, view: View, s: number) {
  const { offsetX: x0, offsetY: y0 } = view;
  const L = PITCH_LENGTH * s;
  const W = PITCH_WIDTH * s;

  // Mowing stripes.
  const stripes = 14;
  for (let index = 0; index < stripes; index += 1) {
    context.fillStyle = index % 2 ? COLORS.stripe : COLORS.grass;
    context.fillRect(x0 + (L / stripes) * index, y0, L / stripes + 0.5, W);
  }

  context.strokeStyle = COLORS.chalk;
  context.lineWidth = Math.max(1, s * 0.12);
  const m = (x: number, y: number) => [x0 + x * s, y0 + y * s] as const;
  const rect = (x: number, y: number, w: number, h: number) => context.strokeRect(x0 + x * s, y0 + y * s, w * s, h * s);

  rect(0, 0, PITCH_LENGTH, PITCH_WIDTH);
  context.beginPath();
  context.moveTo(...m(PITCH_LENGTH / 2, 0));
  context.lineTo(...m(PITCH_LENGTH / 2, PITCH_WIDTH));
  context.stroke();
  context.beginPath();
  context.arc(...m(PITCH_LENGTH / 2, PITCH_WIDTH / 2), 9.15 * s, 0, Math.PI * 2);
  context.stroke();

  for (const side of [0, 1]) {
    const flip = (x: number, w: number) => (side ? PITCH_LENGTH - x - w : x);
    rect(flip(0, 16.5), 13.84, 16.5, 40.32);
    rect(flip(0, 5.5), 24.84, 5.5, 18.32);
    rect(flip(-1.6, 1.6), 30.34, 1.6, 7.32);
    const spotX = side ? PITCH_LENGTH - 11 : 11;
    context.fillStyle = COLORS.chalk;
    context.beginPath();
    context.arc(...m(spotX, PITCH_WIDTH / 2), Math.max(1.2, s * 0.25), 0, Math.PI * 2);
    context.fill();
    // Penalty arc: only the part outside the box.
    const angle = Math.acos(5.5 / 9.15);
    context.beginPath();
    if (side) context.arc(...m(spotX, PITCH_WIDTH / 2), 9.15 * s, Math.PI - angle, Math.PI + angle);
    else context.arc(...m(spotX, PITCH_WIDTH / 2), 9.15 * s, -angle, angle);
    context.stroke();
  }
}

function drawBrackets(context: CanvasRenderingContext2D, center: Point, size: number, color: string) {
  const half = size / 2;
  const arm = size * 0.28;
  context.strokeStyle = color;
  context.lineWidth = 1.2;
  context.beginPath();
  for (const [dx, dy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]] as const) {
    const cx = center.x + dx * half;
    const cy = center.y + dy * half;
    context.moveTo(cx, cy - dy * arm);
    context.lineTo(cx, cy);
    context.lineTo(cx - dx * arm, cy);
  }
  context.stroke();
}
