import { useCallback, useReducer } from "react";
import { es } from "../../i18n/es";
import { UndoHistory } from "../../structures/UndoHistory";
import { EMPTY_BOARD, PITCH, clampPoint, type Board } from "./board";
import type { DragTarget } from "./Pitch";

const t = es.pages.editor;

interface EditorState {
  board: Board;
  history: UndoHistory<Board>;
  selectedId: string | null;
  /** Board when the current drag started (null when not dragging). */
  dragOrigin: Board | null;
  dragTarget: DragTarget | null;
}

type EditorAction =
  | { type: "reset"; board: Board }
  | { type: "apply"; label: string; change: (board: Board) => Board; select?: string | null }
  | { type: "select"; id: string | null }
  | { type: "dragStart"; target: DragTarget }
  | { type: "drag"; dx: number; dy: number }
  | { type: "dragEnd" }
  | { type: "undo" }
  | { type: "redo" };

function moved(origin: Board, target: DragTarget, dx: number, dy: number): Board {
  if (target.type === "token") {
    return {
      ...origin,
      tokens: origin.tokens.map((token) => (token.id === target.id ? { ...token, ...clampPoint(token.x + dx, token.y + dy) } : token)),
    };
  }
  return {
    ...origin,
    arrows: origin.arrows.map((arrow) => {
      if (arrow.id !== target.id) return arrow;
      if (target.type === "arrow-start") {
        const start = clampPoint(arrow.x1 + dx, arrow.y1 + dy);
        return { ...arrow, x1: start.x, y1: start.y };
      }
      if (target.type === "arrow-end") {
        const end = clampPoint(arrow.x2 + dx, arrow.y2 + dy);
        return { ...arrow, x2: end.x, y2: end.y };
      }
      // Whole arrow: keep both ends inside the pitch with the same shift.
      const minX = Math.min(arrow.x1, arrow.x2);
      const maxX = Math.max(arrow.x1, arrow.x2);
      const minY = Math.min(arrow.y1, arrow.y2);
      const maxY = Math.max(arrow.y1, arrow.y2);
      const sx = Math.min(Math.max(dx, -minX), PITCH.length - maxX);
      const sy = Math.min(Math.max(dy, -minY), PITCH.width - maxY);
      const r = (value: number) => Math.round(value * 10) / 10;
      return { ...arrow, x1: r(arrow.x1 + sx), y1: r(arrow.y1 + sy), x2: r(arrow.x2 + sx), y2: r(arrow.y2 + sy) };
    }),
  };
}

function dragLabel(board: Board, target: DragTarget): string {
  if (target.type === "token") {
    const token = board.tokens.find((item) => item.id === target.id);
    return token?.side === "ball" ? t.actions.moveBall : t.actions.move(token?.label ?? "");
  }
  return target.type === "arrow" ? t.actions.moveArrow : t.actions.adjustArrow;
}

function exists(board: Board, id: string | null): boolean {
  return id !== null && (board.tokens.some((token) => token.id === id) || board.arrows.some((arrow) => arrow.id === id));
}

function reducer(state: EditorState, action: EditorAction): EditorState {
  switch (action.type) {
    case "reset":
      return { board: action.board, history: UndoHistory.create(), selectedId: null, dragOrigin: null, dragTarget: null };
    case "apply": {
      const next = action.change(state.board);
      if (next === state.board) return state;
      const selectedId = action.select !== undefined ? action.select : state.selectedId;
      return { ...state, board: next, history: state.history.record(action.label, state.board), selectedId: exists(next, selectedId) ? selectedId : null };
    }
    case "select":
      return { ...state, selectedId: action.id };
    case "dragStart":
      return { ...state, dragOrigin: state.board, dragTarget: action.target };
    case "drag":
      if (!state.dragOrigin || !state.dragTarget) return state;
      return { ...state, board: moved(state.dragOrigin, state.dragTarget, action.dx, action.dy) };
    case "dragEnd": {
      if (!state.dragOrigin || !state.dragTarget) return state;
      const changed = JSON.stringify(state.dragOrigin) !== JSON.stringify(state.board);
      return {
        ...state,
        history: changed ? state.history.record(dragLabel(state.board, state.dragTarget), state.dragOrigin) : state.history,
        dragOrigin: null,
        dragTarget: null,
      };
    }
    case "undo": {
      const step = state.history.undo(state.board);
      if (!step) return state;
      return { ...state, board: step.state, history: step.history, selectedId: exists(step.state, state.selectedId) ? state.selectedId : null };
    }
    case "redo": {
      const step = state.history.redo(state.board);
      if (!step) return state;
      return { ...state, board: step.state, history: step.history, selectedId: exists(step.state, state.selectedId) ? state.selectedId : null };
    }
  }
}

/** Board + undo/redo stacks + selection. Every change goes through `apply` so it can be undone. */
export function useBoardEditor() {
  const [state, dispatch] = useReducer(reducer, {
    board: EMPTY_BOARD, history: UndoHistory.create<Board>(), selectedId: null, dragOrigin: null, dragTarget: null,
  });
  return {
    ...state,
    reset: useCallback((board: Board) => dispatch({ type: "reset", board }), []),
    apply: useCallback((label: string, change: (board: Board) => Board, select?: string | null) =>
      dispatch({ type: "apply", label, change, select }), []),
    select: useCallback((id: string | null) => dispatch({ type: "select", id }), []),
    dragStart: useCallback((target: DragTarget) => dispatch({ type: "dragStart", target }), []),
    drag: useCallback((_: DragTarget, dx: number, dy: number) => dispatch({ type: "drag", dx, dy }), []),
    dragEnd: useCallback(() => dispatch({ type: "dragEnd" }), []),
    undo: useCallback(() => dispatch({ type: "undo" }), []),
    redo: useCallback(() => dispatch({ type: "redo" }), []),
  };
}
