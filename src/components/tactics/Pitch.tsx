import { useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { PITCH, clampPoint, type Arrow, type ArrowKind, type Board, type Tool } from "./board";

// Pitch lines (metres, FIFA dimensions)
const PENALTY = { depth: 16.5, width: 40.32 };
const GOAL_AREA = { depth: 5.5, width: 18.32 };
const GOAL_WIDTH = 7.32;
const CIRCLE = 9.15;
const MARGIN = 3;
const TOKEN_R = 2.3;

export type DragTarget = { type: "token" | "arrow" | "arrow-start" | "arrow-end"; id: string };

interface Props {
  board: Board;
  tool: Tool;
  selectedId: string | null;
  readOnly?: boolean;
  /** Player names for tokens linked to the squad (id -> short name). */
  names?: Record<string, string>;
  /** Linked players who cannot play now (id -> "lesionado (esguince), regreso estimado: ..."): drawn with a red cross. */
  unavailable?: Record<string, string>;
  /** Mini version for lists: no interaction, no labels below tokens. */
  compact?: boolean;
  onSelect?: (id: string | null) => void;
  onAddToken?: (side: "own" | "rival" | "ball", x: number, y: number) => void;
  onAddArrow?: (kind: ArrowKind, x1: number, y1: number, x2: number, y2: number) => void;
  onErase?: (id: string) => void;
  onDragStart?: (target: DragTarget) => void;
  /** dx, dy: displacement in metres since the drag started. */
  onDrag?: (target: DragTarget, dx: number, dy: number) => void;
  onDragEnd?: () => void;
  ariaLabel?: string;
}

const ARROW_KINDS: ArrowKind[] = ["pass", "run", "dribble"];

/** Zig-zag path for a dribble arrow (stops before the head so the tip stays clean). */
function dribblePath(arrow: Pick<Arrow, "x1" | "y1" | "x2" | "y2">): string {
  const dx = arrow.x2 - arrow.x1;
  const dy = arrow.y2 - arrow.y1;
  const length = Math.hypot(dx, dy);
  if (length < 3) return `M${arrow.x1},${arrow.y1} L${arrow.x2},${arrow.y2}`;
  const ux = dx / length;
  const uy = dy / length;
  const waves = Math.max(2, Math.floor((length - 2.5) / 2.4));
  const step = (length - 2.5) / waves;
  let path = `M${arrow.x1},${arrow.y1}`;
  for (let i = 1; i <= waves; i += 1) {
    const side = i % 2 === 0 ? -1 : 1;
    const mid = step * (i - 0.5);
    path += ` Q${arrow.x1 + ux * mid - uy * side},${arrow.y1 + uy * mid + ux * side} ${arrow.x1 + ux * step * i},${arrow.y1 + uy * step * i}`;
  }
  return `${path} L${arrow.x2},${arrow.y2}`;
}

export default function Pitch({
  board, tool, selectedId, readOnly = false, names = {}, unavailable = {}, compact = false,
  onSelect, onAddToken, onAddArrow, onErase, onDragStart, onDrag, onDragEnd, ariaLabel,
}: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [drag, setDrag] = useState<{ target: DragTarget; x: number; y: number } | null>(null);
  const [draft, setDraft] = useState<{ kind: ArrowKind; x1: number; y1: number; x2: number; y2: number } | null>(null);
  const interactive = !readOnly && !compact;

  const toPitch = (event: ReactPointerEvent): { x: number; y: number } => {
    const svg = svgRef.current!;
    const point = svg.createSVGPoint();
    point.x = event.clientX;
    point.y = event.clientY;
    const local = point.matrixTransform(svg.getScreenCTM()!.inverse());
    return clampPoint(local.x, local.y);
  };

  const startDrag = (event: ReactPointerEvent, target: DragTarget) => {
    // Other tools (add a player, draw an arrow) act on the pitch: let the event reach it,
    // so a pass can start right on top of a player.
    if (!interactive || (tool !== "select" && tool !== "erase")) return;
    event.stopPropagation();
    if (tool === "erase") {
      onErase?.(target.id);
      return;
    }
    svgRef.current?.setPointerCapture(event.pointerId);
    onSelect?.(target.id);
    setDrag({ target, ...toPitch(event) });
    onDragStart?.(target);
  };

  const pointerDownOnPitch = (event: ReactPointerEvent) => {
    if (!interactive) return;
    const { x, y } = toPitch(event);
    if (tool === "own" || tool === "rival" || tool === "ball") {
      onAddToken?.(tool, x, y);
    } else if (ARROW_KINDS.includes(tool as ArrowKind)) {
      svgRef.current?.setPointerCapture(event.pointerId);
      setDraft({ kind: tool as ArrowKind, x1: x, y1: y, x2: x, y2: y });
    } else {
      onSelect?.(null);
    }
  };

  const pointerMove = (event: ReactPointerEvent) => {
    if (drag) {
      const { x, y } = toPitch(event);
      onDrag?.(drag.target, x - drag.x, y - drag.y);
    } else if (draft) {
      const { x, y } = toPitch(event);
      setDraft({ ...draft, x2: x, y2: y });
    }
  };

  const pointerUp = () => {
    if (drag) {
      setDrag(null);
      onDragEnd?.();
    }
    if (draft) {
      if (Math.hypot(draft.x2 - draft.x1, draft.y2 - draft.y1) >= 2) {
        onAddArrow?.(draft.kind, draft.x1, draft.y1, draft.x2, draft.y2);
      }
      setDraft(null);
    }
  };

  const half = PITCH.width / 2;
  const stripes = Array.from({ length: 10 }, (_, i) => i);
  const selectedArrow = board.arrows.find((arrow) => arrow.id === selectedId);
  const cursor = !interactive ? "default" : tool === "select" ? (drag ? "grabbing" : "default") : tool === "erase" ? "not-allowed" : "crosshair";

  const renderArrow = (arrow: Pick<Arrow, "kind" | "x1" | "y1" | "x2" | "y2">, key: string, selected = false, id?: string) => (
    <g key={key} className={`arrow arrow-${arrow.kind}${selected ? " is-selected" : ""}`}
      onPointerDown={id ? (event) => startDrag(event, { type: "arrow", id }) : undefined}>
      {/* wide invisible stroke so thin arrows are easy to hit */}
      {id && <line x1={arrow.x1} y1={arrow.y1} x2={arrow.x2} y2={arrow.y2} className="arrow-hit" />}
      {arrow.kind === "dribble"
        ? <path d={dribblePath(arrow)} markerEnd={`url(#head-${arrow.kind})`} />
        : <line x1={arrow.x1} y1={arrow.y1} x2={arrow.x2} y2={arrow.y2} markerEnd={`url(#head-${arrow.kind})`} />}
    </g>
  );

  return (
    <svg ref={svgRef} className={`pitch-svg${compact ? " is-compact" : ""}`} role="img" aria-label={ariaLabel}
      viewBox={`${-MARGIN} ${-MARGIN} ${PITCH.length + MARGIN * 2} ${PITCH.width + MARGIN * 2}`}
      style={{ cursor, touchAction: interactive ? "none" : "auto" }}
      onPointerDown={pointerDownOnPitch} onPointerMove={pointerMove} onPointerUp={pointerUp} onPointerCancel={pointerUp}>
      <defs>
        {ARROW_KINDS.map((kind) => (
          <marker key={kind} id={`head-${kind}`} className={`head head-${kind}`} viewBox="0 0 10 10" refX="8" refY="5"
            markerWidth="4" markerHeight="4" orient="auto-start-reverse">
            <path d="M0,0 L10,5 L0,10 z" />
          </marker>
        ))}
      </defs>

      <rect className="pitch-grass" x={-MARGIN} y={-MARGIN} width={PITCH.length + MARGIN * 2} height={PITCH.width + MARGIN * 2} />
      {stripes.map((i) => i % 2 === 0 && (
        <rect key={i} className="pitch-stripe" x={(PITCH.length / 10) * i} y={0} width={PITCH.length / 10} height={PITCH.width} />
      ))}

      <g className="pitch-lines">
        <rect x={0} y={0} width={PITCH.length} height={PITCH.width} />
        <line x1={PITCH.length / 2} y1={0} x2={PITCH.length / 2} y2={PITCH.width} />
        <circle cx={PITCH.length / 2} cy={half} r={CIRCLE} />
        <circle cx={PITCH.length / 2} cy={half} r={0.35} className="spot" />
        {[0, 1].map((end) => {
          const flip = (x: number) => (end === 0 ? x : PITCH.length - x);
          const spotX = flip(11);
          // Arc of the penalty area: the part of the 9.15 m circle around the spot outside the box
          const dx = PENALTY.depth - 11;
          const dy = Math.sqrt(CIRCLE * CIRCLE - dx * dx);
          return (
            <g key={end}>
              <rect x={end === 0 ? 0 : PITCH.length - PENALTY.depth} y={half - PENALTY.width / 2} width={PENALTY.depth} height={PENALTY.width} />
              <rect x={end === 0 ? 0 : PITCH.length - GOAL_AREA.depth} y={half - GOAL_AREA.width / 2} width={GOAL_AREA.depth} height={GOAL_AREA.width} />
              <circle cx={spotX} cy={half} r={0.35} className="spot" />
              <path d={`M${flip(PENALTY.depth)},${half - dy} A${CIRCLE},${CIRCLE} 0 0 ${end === 0 ? 1 : 0} ${flip(PENALTY.depth)},${half + dy}`} />
              <rect className="goal" x={end === 0 ? -1.8 : PITCH.length} y={half - GOAL_WIDTH / 2} width={1.8} height={GOAL_WIDTH} />
            </g>
          );
        })}
      </g>

      {!compact && (
        <g className="pitch-direction" aria-hidden="true">
          <line x1={PITCH.length / 2 - 6} y1={PITCH.width + 1.9} x2={PITCH.length / 2 + 6} y2={PITCH.width + 1.9} markerEnd="url(#head-run)" />
        </g>
      )}

      <g className="arrows">
        {board.arrows.map((arrow) => renderArrow(arrow, arrow.id, arrow.id === selectedId, interactive ? arrow.id : undefined))}
        {draft && renderArrow(draft, "draft")}
      </g>

      {interactive && tool === "select" && selectedArrow && (
        <g className="arrow-handles">
          <circle cx={selectedArrow.x1} cy={selectedArrow.y1} r={1.2} onPointerDown={(event) => startDrag(event, { type: "arrow-start", id: selectedArrow.id })} />
          <circle cx={selectedArrow.x2} cy={selectedArrow.y2} r={1.2} onPointerDown={(event) => startDrag(event, { type: "arrow-end", id: selectedArrow.id })} />
        </g>
      )}

      <g className="tokens">
        {board.tokens.map((token) => {
          const name = token.playerId ? names[token.playerId] : undefined;
          const out = token.playerId ? unavailable[token.playerId] : undefined;
          return (
            <g key={token.id} className={`token token-${token.side}${token.id === selectedId ? " is-selected" : ""}${out ? " is-unavailable" : ""}`}
              transform={`translate(${token.x} ${token.y})`} onPointerDown={(event) => startDrag(event, { type: "token", id: token.id })}>
              {token.side === "ball" ? (
                <>
                  <circle r={1.25} className="ball" />
                  <path d="M0,-0.55 L0.52,-0.17 L0.32,0.45 L-0.32,0.45 L-0.52,-0.17 Z" className="ball-patch" />
                </>
              ) : (
                <>
                  {token.id === selectedId && <circle r={TOKEN_R + 0.9} className="token-ring" />}
                  <circle r={TOKEN_R} className="token-body" />
                  <text className="token-label" dy="0.36em">{token.label}</text>
                  {!compact && name && <text className="token-name" y={TOKEN_R + 2.4}>{name}</text>}
                  {out && (
                    <g className="token-out" transform={`translate(${TOKEN_R * 0.75} ${-TOKEN_R * 0.75})`} aria-hidden="true">
                      <circle r={1.05} />
                      <path d="M-0.45,-0.45 L0.45,0.45 M0.45,-0.45 L-0.45,0.45" />
                    </g>
                  )}
                </>
              )}
              {name && <title>{out ? `${name}: ${out}` : name}</title>}
            </g>
          );
        })}
      </g>
    </svg>
  );
}
