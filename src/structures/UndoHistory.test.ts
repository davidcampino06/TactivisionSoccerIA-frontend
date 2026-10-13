import { describe, expect, it } from "vitest";
import { UndoHistory } from "./UndoHistory";

describe("UndoHistory (two stacks)", () => {
  it("undoes and redoes changes in order", () => {
    let state = "A";
    let history = UndoHistory.create<string>();
    expect(history.canUndo).toBe(false);

    history = history.record("to B", state);
    state = "B";
    history = history.record("to C", state);
    state = "C";

    const first = history.undo(state)!;
    expect([first.state, first.label]).toEqual(["B", "to C"]);
    const second = first.history.undo(first.state)!;
    expect(second.state).toBe("A");
    expect(second.history.canUndo).toBe(false);
    expect(second.history.undo("A")).toBeNull();

    const again = second.history.redo(second.state)!;
    expect([again.state, again.label]).toEqual(["B", "to B"]);
    expect(again.history.redoStack.toArray().map((entry) => entry.state)).toEqual(["C"]);
  });

  it("a new change empties the redo stack", () => {
    const history = UndoHistory.create<number>().record("+1", 0);
    const undone = history.undo(1)!;
    expect(undone.history.canRedo).toBe(true);
    const branched = undone.history.record("+5", 0);
    expect(branched.canRedo).toBe(false);
    expect(branched.redo(5)).toBeNull();
  });

  it("keeps at most `capacity` steps, dropping the oldest", () => {
    let history = UndoHistory.create<number>(3);
    for (let step = 0; step < 6; step += 1) history = history.record(`step ${step}`, step);
    expect(history.undoStack.size).toBe(3);
    expect(history.undoStack.toArray().map((entry) => entry.state)).toEqual([5, 4, 3]);
  });
});
