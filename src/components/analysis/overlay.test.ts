import { describe, expect, it } from "vitest";
import { boxesAt, trackAt, type Overlay } from "./overlay";

const overlay: Overlay = {
  interval: 0.2, until: 0.4,
  frames: [
    [0.0, [[100, 100, 40, 80, 1, "P"], [300, 100, 40, 80, 2, "P"], [50, 50, 10, 10, null, "B"]]],
    [0.2, [[120, 100, 40, 80, 1, "P"]]],
    [0.4, [[140, 110, 40, 80, 1, "P"]]],
  ],
};

describe("boxesAt", () => {
  it("shows exactly what the AI saw on an analysed frame", () => {
    expect(boxesAt(overlay, 0.2)).toEqual([[120, 100, 40, 80, 1, "P"]]);
  });

  it("between two analysed frames moves each track in a straight line", () => {
    const [first, second, ball] = boxesAt(overlay, 0.1);
    expect(first.slice(0, 2)).toEqual([110, 100]);
    expect(second).toEqual([300, 100, 40, 80, 2, "P"]);  // not in the next frame: stays where it was seen
    expect(ball[5]).toBe("B");
    expect(boxesAt(overlay, 0.3)[0].slice(0, 2)).toEqual([130, 105]);
  });

  it("draws nothing outside the analysed part of the video", () => {
    expect(boxesAt(overlay, 5)).toEqual([]);
    expect(boxesAt({ frames: [], interval: 0, until: 0 }, 1)).toEqual([]);
    expect(boxesAt({ ...overlay, frames: [[3, overlay.frames[0][1]]] }, 0.5)).toEqual([]);
  });

  it("does not join frames separated by a gap (a cut or a pause in the detections)", () => {
    const gap: Overlay = { interval: 0.2, until: 5, frames: [[0, [[0, 0, 10, 10, 1, "P"]]], [5, [[500, 0, 10, 10, 1, "P"]]]] };
    expect(boxesAt(gap, 0.1)).toEqual([[0, 0, 10, 10, 1, "P"]]);
    expect(boxesAt(gap, 2.5)).toEqual([]);
  });
});

describe("trackAt", () => {
  const boxes = overlay.frames[0][1];
  it("finds the tracked player under the pointer and ignores the ball and the empty grass", () => {
    expect(trackAt(boxes, 110, 150)).toBe(1);
    expect(trackAt(boxes, 55, 55)).toBeNull();
    expect(trackAt(boxes, 600, 300)).toBeNull();
  });

  it("picks the smallest box when two players overlap", () => {
    expect(trackAt([[0, 0, 100, 200, 1, "P"], [20, 20, 30, 60, 2, "P"]], 30, 40)).toBe(2);
  });
});
