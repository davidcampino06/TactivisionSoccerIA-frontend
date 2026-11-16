/** One box the AI found: [x, y, width, height, track id or null, "P" player / "B" ball / "O" other], in video pixels. */
export type OverlayBox = [number, number, number, number, number | null, "P" | "B" | "O"];
export type OverlayFrame = [number, OverlayBox[]];

export interface Overlay {
  frames: OverlayFrame[];
  /** Usual time between analysed frames: the AI samples the video, it does not look at every frame. */
  interval: number;
  /** Last second analysed; after it the video has no boxes. */
  until: number;
}

/**
 * The boxes to draw at a moment of the video. The AI analysed one frame every `interval` seconds, so
 * between two analysed frames each track is moved in a straight line from where it was to where it
 * will be: the boxes follow the players instead of jumping. Nothing is invented beyond that: a track
 * that is not in the next frame stays where it was seen, and outside the analysed part there are no boxes.
 */
export function boxesAt(overlay: Overlay, seconds: number): OverlayBox[] {
  const { frames } = overlay;
  if (frames.length === 0) return [];
  const hold = Math.max(overlay.interval, 0.04) * 1.5;
  let low = 0;
  let high = frames.length - 1;
  if (seconds < frames[0][0] - hold) return [];
  while (low < high) {                       // last analysed frame at or before `seconds`
    const middle = (low + high + 1) >> 1;
    if (frames[middle][0] <= seconds) low = middle; else high = middle - 1;
  }
  const [time, boxes] = frames[low];
  const next = frames[low + 1];
  if (seconds <= time || !next || next[0] - time > hold * 2) {
    return Math.abs(seconds - time) <= hold ? boxes : [];
  }
  const progress = (seconds - time) / (next[0] - time);
  const later = new Map<number, OverlayBox>();
  for (const box of next[1]) if (box[4] !== null) later.set(box[4], box);
  return boxes.map((box) => {
    const target = box[4] === null ? undefined : later.get(box[4]);
    if (!target) return box;
    const mix = (from: number, to: number) => from + (to - from) * progress;
    return [mix(box[0], target[0]), mix(box[1], target[1]), mix(box[2], target[2]), mix(box[3], target[3]), box[4], box[5]];
  });
}

/** The tracked player under a point (video pixels); the smallest box wins when several overlap. */
export function trackAt(boxes: OverlayBox[], x: number, y: number, margin = 0): number | null {
  let found: OverlayBox | null = null;
  for (const box of boxes) {
    if (box[4] === null || box[5] !== "P") continue;
    if (x < box[0] - margin || x > box[0] + box[2] + margin || y < box[1] - margin || y > box[1] + box[3] + margin) continue;
    if (!found || box[2] * box[3] < found[2] * found[3]) found = box;
  }
  return found ? found[4] : null;
}
