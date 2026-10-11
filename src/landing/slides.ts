// Hero slides. Each one presents a stage of the analysis pipeline. User-facing copy lives in i18n/es.ts.
import { es } from "../i18n/es";

// Photos live in /public/hero. Detection boxes use percentages of the photo (x, y = top-left corner).

export type DetectionKind = "player" | "ball" | "staff";

export interface Detection {
  x: number;
  y: number;
  w: number;
  h: number;
  trackId: number;
  confidence: number;
  kind: DetectionKind;
}

export interface Slide {
  id: string;
  module: string;
  eyebrow: string;
  title: string;
  body: string;
  stat: { value: number; decimals?: number; label: string };
  tint: string;
  image: string | null;
  imageAspect: number;
  detections: Detection[];
  /** Framing on wide screens: zoom >= 1 and horizontal focus (0 = show left side, 1 = show right side). */
  focus?: { x: number; zoom: number; y?: number };
  /** "natural" keeps real colors with a cinematic grade; "tinted" washes the photo in the stage color. */
  look?: "natural" | "tinted";
  /** Pairs of detection indexes joined by a line (team shape, carry path). */
  links?: [number, number][];
}

const box = (x1: number, y1: number, x2: number, y2: number, trackId: number, confidence: number, kind: DetectionKind = "player"): Detection => ({
  x: x1, y: y1, w: x2 - x1, h: y2 - y1, trackId, confidence, kind,
});

export const SLIDES: Slide[] = [
  {
    id: "detection",
    module: es.slides.detection.module,
    eyebrow: es.slides.detection.eyebrow,
    title: es.slides.detection.title,
    body: es.slides.detection.body,
    stat: { value: 7, label: es.slides.detection.stat },
    tint: "#c4122f",
    image: "/hero/01-deteccion.jpg",
    imageAspect: 1537 / 1023,
    focus: { x: 1, zoom: 1.18 },
    detections: [
      box(25.8, 20.4, 65, 75.5, 10, 0.96),
      box(33, 65, 75.7, 91, 8, 0.93),
      box(46.6, 80, 53, 89.5, 0, 0.88, "ball"),
      box(11.3, 32, 24.3, 70.3, 5, 0.91),
      box(66.8, 29.5, 76, 64.6, 7, 0.89),
      box(92.3, 32.5, 99.6, 57, 1, 0.84),
    ],
  },
  {
    id: "tracking",
    module: es.slides.tracking.module,
    eyebrow: es.slides.tracking.eyebrow,
    title: es.slides.tracking.title,
    body: es.slides.tracking.body,
    stat: { value: 22, label: es.slides.tracking.stat },
    tint: "#1d4ed8",
    image: "/hero/02-seguimiento.jpg",
    imageAspect: 1536 / 1024,
    focus: { x: 1, zoom: 1.12 },
    detections: [
      box(36.5, 22, 73, 84, 9, 0.92),
      box(0.5, 10, 38, 95, 11, 0.86),
      box(34, 23.5, 51, 63, 4, 0.83),
      box(67.5, 79, 75, 89, 0, 0.9, "ball"),
    ],
    links: [[0, 3]],
  },
  {
    id: "context",
    module: es.slides.context.module,
    eyebrow: es.slides.context.eyebrow,
    title: es.slides.context.title,
    body: es.slides.context.body,
    stat: { value: 14, label: es.slides.context.stat },
    tint: "#0f7a55",
    image: "/hero/03-contexto.jpg",
    imageAspect: 1685 / 933,
    look: "tinted",
    detections: [
      box(4, 40.3, 7.4, 55.5, 2, 0.93),
      box(13.6, 29.7, 16.1, 43.1, 3, 0.9),
      box(19.7, 16.8, 22.6, 27.9, 5, 0.87),
      box(22.7, 58.1, 26.6, 78.7, 6, 0.95),
      box(46.4, 23, 49.1, 34.8, 9, 0.9),
      box(54.9, 56.4, 58.9, 74.2, 10, 0.94),
      box(47.3, 39.4, 51.7, 52.3, 11, 0.92),
      box(42.7, 27.4, 47.1, 36.6, 14, 0.85),
      box(40.6, 10.6, 42.7, 19.6, 15, 0.82),
      box(84.9, 29.9, 87.3, 43.4, 17, 0.88),
      box(90.4, 43.6, 92.9, 59.4, 18, 0.9),
      box(58.8, 47.7, 60.1, 49.8, 0, 0.86, "ball"),
      box(63.1, 63.6, 66, 82.6, 99, 0.91, "staff"),
    ],
    // White team shape: back line and the line ahead of it.
    links: [[0, 1], [1, 2], [0, 3], [3, 5], [5, 4], [2, 4], [1, 4]],
  },
  {
    id: "insight",
    module: es.slides.insight.module,
    eyebrow: es.slides.insight.eyebrow,
    title: es.slides.insight.title,
    body: es.slides.insight.body,
    stat: { value: 0.87, decimals: 2, label: es.slides.insight.stat },
    tint: "#c2410c",
    image: "/hero/04-recomendacion.jpg",
    imageAspect: 1470 / 979,
    focus: { x: 0, zoom: 1.12 },
    detections: [
      box(2.2, 34, 14.8, 87.7, 4, 0.94),
      box(14.9, 42.8, 23.4, 82.8, 7, 0.91),
      box(35.7, 47.9, 44.6, 80.4, 12, 0.88),
      box(76, 54.4, 88.1, 83.7, 9, 0.86),
      box(86.5, 49, 97.6, 81.2, 15, 0.9),
      box(35.6, 70.8, 37.5, 73.8, 0, 0.82, "ball"),
      box(58.4, 25.3, 77.7, 92.3, 98, 0.95, "staff"),
    ],
  },
];

export const SLIDE_DURATION_MS = 7000;
