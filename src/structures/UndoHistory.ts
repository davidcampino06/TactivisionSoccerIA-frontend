import { Stack } from "./Stack";

/**
 * Undo / redo with two stacks.
 *
 * - Every change pushes the state BEFORE it onto the undo stack and empties the redo stack.
 * - Undo pops the undo stack, pushes the current state onto the redo stack and returns
 *   the popped state. Redo does the opposite.
 *
 * Entries carry a label ("Mover 9", "Flecha de pase") so the screen can show what each
 * stack holds. Like Stack, the history is immutable: every operation returns a new one.
 */

export interface HistoryEntry<S> {
  label: string;
  state: S;
}

export class UndoHistory<S> {
  readonly undoStack: Stack<HistoryEntry<S>>;
  readonly redoStack: Stack<HistoryEntry<S>>;
  private readonly capacity: number;

  private constructor(undoStack: Stack<HistoryEntry<S>>, redoStack: Stack<HistoryEntry<S>>, capacity: number) {
    this.undoStack = undoStack;
    this.redoStack = redoStack;
    this.capacity = capacity;
  }

  static create<S>(capacity = 100): UndoHistory<S> {
    return new UndoHistory<S>(Stack.empty(), Stack.empty(), capacity);
  }

  get canUndo(): boolean {
    return !this.undoStack.isEmpty();
  }

  get canRedo(): boolean {
    return !this.redoStack.isEmpty();
  }

  /** Records a change: `before` is the state the change started from. */
  record(label: string, before: S): UndoHistory<S> {
    return new UndoHistory(this.undoStack.push({ label, state: before }).limit(this.capacity), Stack.empty(), this.capacity);
  }

  /** Goes one step back. Returns null when there is nothing to undo. */
  undo(current: S): { history: UndoHistory<S>; state: S; label: string } | null {
    if (this.undoStack.isEmpty()) return null;
    const [entry, rest] = this.undoStack.pop();
    const history = new UndoHistory(rest, this.redoStack.push({ label: entry.label, state: current }), this.capacity);
    return { history, state: entry.state, label: entry.label };
  }

  /** Re-applies the last undone change. Returns null when there is nothing to redo. */
  redo(current: S): { history: UndoHistory<S>; state: S; label: string } | null {
    if (this.redoStack.isEmpty()) return null;
    const [entry, rest] = this.redoStack.pop();
    const history = new UndoHistory(this.undoStack.push({ label: entry.label, state: current }), rest, this.capacity);
    return { history, state: entry.state, label: entry.label };
  }
}
