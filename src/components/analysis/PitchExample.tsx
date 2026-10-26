import type { CSSProperties } from "react";
import type { ExampleOverlay, IssueExample } from "../../types";
import type { TeamColors, TeamKey } from "./shirtColor";

// The drawing is the camera frame (16:9 by default), not the whole pitch: the broadcast image never
// shows the whole pitch, and image units are what the AI measured. 160 units = the image width.
const W = 160;
const FALLBACK: Record<TeamKey, string> = { TEAM_A: "var(--team-a)", TEAM_B: "var(--team-b)" };

interface Props {
  example: IssueExample;
  colors?: TeamColors;
  label: string;
  /** It shows something done well: the marks of the rule are drawn in green instead of red. */
  positive?: boolean;
}

/** One real frame of the analysis with the players, the ball and a drawing of the rule. */
export default function PitchExample({ example, colors, label, positive = false }: Props) {
  const aspect = example.aspect_ratio && example.aspect_ratio > 0.3 && example.aspect_ratio < 1.5 ? example.aspect_ratio : 9 / 16;
  const H = W * aspect;
  const px = (x: number) => x * W;
  const py = (y: number) => y * H;
  const byId = new Map(example.players.map((player) => [player.id, player]));
  const colorOf = (team: string) =>
    team === "TEAM_A" || team === "TEAM_B" ? colors?.[team] ?? FALLBACK[team] : "var(--chalk-muted)";
  const focus = example.team;
  const stripes = Array.from({ length: 8 }, (_, index) => index);

  return (
    <svg className={`pitch-example${positive ? " is-positive" : ""}`} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label}>
      <rect className="pitch-example-grass" x={0} y={0} width={W} height={H} />
      {stripes.map((index) => index % 2 === 1 && (
        <rect key={index} className="pitch-example-stripe" x={(index * W) / stripes.length} y={0} width={W / stripes.length} height={H} />
      ))}
      <rect className="pitch-example-frame" x={0.4} y={0.4} width={W - 0.8} height={H - 0.8} />

      <Overlay overlay={example.overlay} px={px} py={py} W={W} H={H} byId={byId} />
      {example.overlay?.kind === "pressure" && example.ball && (
        // The radius is a share of the image width; both axes are drawn in width units, so it is a circle.
        <circle className="pitch-example-pressure" cx={px(example.ball[0])} cy={py(example.ball[1])} r={example.overlay.radius * W} />
      )}

      {example.players.map((player) => {
        const mine = focus === "MATCH" || player.team === focus;
        const assigned = player.team === "TEAM_A" || player.team === "TEAM_B";
        return (
          <circle key={player.id} className={`pitch-example-player${mine ? " is-focus" : ""}${assigned ? "" : " is-unassigned"}`}
            cx={px(player.x)} cy={py(player.y)} r={assigned ? 2.3 : 1.6}
            style={{ "--player": colorOf(player.team) } as CSSProperties} />
        );
      })}
      {example.ball && (
        <circle className="pitch-example-ball" cx={px(example.ball[0])} cy={py(example.ball[1])} r={1.3} />
      )}
    </svg>
  );
}

interface OverlayProps {
  overlay: ExampleOverlay | null;
  px: (x: number) => number;
  py: (y: number) => number;
  W: number;
  H: number;
  byId: Map<number, { x: number; y: number }>;
}

function Overlay({ overlay, px, py, W, H, byId }: OverlayProps) {
  if (!overlay) return null;
  const at = (id: number) => byId.get(id);
  switch (overlay.kind) {
    case "nearest":
      return (
        <g>
          {overlay.pairs.map(({ from, to, too_far }) => {
            const a = at(from);
            const b = at(to);
            if (!a || !b) return null;
            return <line key={`${from}-${to}`} className={`pitch-example-link ${too_far ? "is-bad" : "is-good"}`}
              x1={px(a.x)} y1={py(a.y)} x2={px(b.x)} y2={py(b.y)} />;
          })}
        </g>
      );
    case "hull":
      return <polygon className="pitch-example-area" points={overlay.polygon.map(([x, y]) => `${px(x)},${py(y)}`).join(" ")} />;
    case "network":
      return (
        <g>
          {overlay.links.map(([from, to]) => {
            const a = at(from);
            const b = at(to);
            return a && b ? <line key={`${from}-${to}`} className="pitch-example-link is-good" x1={px(a.x)} y1={py(a.y)} x2={px(b.x)} y2={py(b.y)} /> : null;
          })}
          {overlay.isolated.map((id) => {
            const player = at(id);
            return player ? <circle key={id} className="pitch-example-ring is-bad" cx={px(player.x)} cy={py(player.y)} r={4.4} /> : null;
          })}
        </g>
      );
    case "lines": {
      const [from, to] = [Math.min(...overlay.gap), Math.max(...overlay.gap)];
      return (
        <g>
          <rect className="pitch-example-gap" x={px(from)} y={0} width={px(to) - px(from)} height={H} />
          {overlay.lines.map((x, index) => <line key={index} className="pitch-example-line" x1={px(x)} y1={0} x2={px(x)} y2={H} />)}
        </g>
      );
    }
    case "zone":
      return (
        <g>
          {[1, 2].map((cut) => <line key={`v${cut}`} className="pitch-example-grid" x1={(cut * W) / 3} y1={0} x2={(cut * W) / 3} y2={H} />)}
          {[1, 2].map((cut) => <line key={`h${cut}`} className="pitch-example-grid" x1={0} y1={(cut * H) / 3} x2={W} y2={(cut * H) / 3} />)}
          <rect className="pitch-example-cell" x={(overlay.column * W) / 3} y={(overlay.row * H) / 3} width={W / 3} height={H / 3} />
        </g>
      );
    case "third":
      return (
        <g>
          {[1, 2].map((cut) => <line key={cut} className="pitch-example-grid" x1={(cut * W) / 3} y1={0} x2={(cut * W) / 3} y2={H} />)}
          <rect className="pitch-example-cell" x={(overlay.third * W) / 3} y={0} width={W / 3} height={H} />
        </g>
      );
    case "width":
      return <rect className="pitch-example-band" x={0} y={py(overlay.from)} width={W} height={Math.max(py(overlay.to) - py(overlay.from), 0.6)} />;
    case "pressure":
      return null; // drawn around the ball by PitchExample, which knows where the ball is
    case "ahead":
      return (
        <g>
          <line className="pitch-example-line" x1={px(overlay.ball_x)} y1={0} x2={px(overlay.ball_x)} y2={H} />
          {overlay.ahead.map((id) => {
            const player = at(id);
            return player ? <circle key={id} className="pitch-example-ring is-good" cx={px(player.x)} cy={py(player.y)} r={4.4} /> : null;
          })}
        </g>
      );
    default:
      return null;
  }
}
