import { useMemo, useState, type CSSProperties } from "react";
import { es } from "../../i18n/es";
import { formatNumber, formatPercent, label } from "../../i18n/labels";
import type { NetworkNode, Player, ProximityNetwork as Network, Track } from "../../types";
import { TeamTag } from "./TeamColors";
import type { TeamColors } from "./shirtColor";

const t = es.pages.analysis.network;
const TEAMS = ["TEAM_A", "TEAM_B"] as const;
type TeamKey = (typeof TEAMS)[number];
// Hop levels drawn with the validated categorical palette; 3 or more share the last colour.
const LEVEL_CLASSES = ["level-0", "level-1", "level-2", "level-3"];

// The pitch lies horizontally, like the broadcast camera: the image x axis runs along the
// 105 m length (left to right) and the image y axis across the 68 m width (far side at the top).
const PITCH_L = 105;
const PITCH_W = 68;
const toPitch = (node: NetworkNode) => ({ px: node.x * PITCH_L, py: node.y * PITCH_W });

interface Props {
  network: Network;
  tracks: Track[];
  players: Player[];
  teamColors?: TeamColors;
}

interface Who {
  /** Printed on the shirt: the squad number, or the tracker id when nobody was assigned. */
  shirt: string;
  name: string;
  position: string | null;
}

/**
 * The AI's proximity network on a 3D pitch: links between close team-mates drawn on the grass and,
 * from the chosen player, the BFS levels (how many short passes away every other player is).
 */
export default function ProximityNetwork({ network, tracks, players, teamColors }: Props) {
  const available = TEAMS.filter((team) => network.teams[team]?.nodes.length);
  const [team, setTeam] = useState<TeamKey>(available[0] ?? "TEAM_A");
  const [flat, setFlat] = useState(false);
  const data = network.teams[team];
  const hub = useMemo(
    () => (data ? [...data.nodes].sort((a, b) => b.degree - a.degree || a.track_id - b.track_id)[0]?.track_id : undefined),
    [data],
  );
  const [chosen, setChosen] = useState<number | null>(null);
  const source = chosen !== null && data?.nodes.some((node) => node.track_id === chosen) ? chosen : hub;

  const whoIs = useMemo(() => {
    const byId = new Map(players.map((player) => [player.id, player]));
    const byTrack = new Map(tracks.map((track) => [track.track_id, track.player_id]));
    return (trackId: number): Who => {
      const playerId = byTrack.get(trackId);
      const player = playerId ? byId.get(playerId) : undefined;
      if (!player) return { shirt: trackId < 0 ? "?" : String(trackId), name: t.track(trackId), position: null };
      return {
        shirt: player.shirt_number !== null ? String(player.shirt_number) : String(trackId),
        name: player.last_name,
        position: player.position ? label("position", player.position) : null,
      };
    };
  }, [players, tracks]);

  if (!data || source === undefined) return <p className="muted">{t.none}</p>;

  const hops = data.hops[String(source)] ?? {};
  const reached = Object.keys(hops).length;
  const maxLevel = Math.max(0, ...Object.values(hops));
  const position = new Map(data.nodes.map((node) => [node.track_id, toPitch(node)]));
  const isolated = new Set(data.isolated);
  const levelOf = (trackId: number) => hops[String(trackId)];
  const origin = whoIs(source);
  // Far side first, so in the flat view the players nearer the camera are drawn on top.
  const ordered = [...data.nodes].sort((a, b) => a.y - b.y || Number(a.track_id === source) - Number(b.track_id === source));

  return (
    <div className="network">
      <div className="network-head">
        <p className="muted small">{t.hint(network.frame_number, formatNumber(network.timestamp_seconds, 1), formatPercent(network.link_distance))}</p>
        <div className="network-controls">
          {available.length > 1 && (
            <div className="filter-chips" role="group" aria-label={t.title}>
              {available.map((option) => (
                <button key={option} type="button" className={`chip${team === option ? " selected" : ""}`} aria-pressed={team === option}
                  onClick={() => { setTeam(option); setChosen(null); }}><TeamTag team={option} colors={teamColors} /></button>
              ))}
            </div>
          )}
          <div className="tree-toggle" role="group" aria-label={t.view}>
            {([false, true] as const).map((option) => (
              <button key={String(option)} type="button" className={flat === option ? "selected" : undefined} aria-pressed={flat === option}
                onClick={() => setFlat(option)}>{option ? t.flat : t.perspective}</button>
            ))}
          </div>
        </div>
      </div>

      <div className={`network-stage${flat ? " is-flat" : ""}`}
        aria-label={`${t.title} · ${t.teams[team]}: ${data.groups} ${t.groups.toLowerCase()}, ${data.isolated.length} ${t.isolated.toLowerCase()}`}>
        <div className="network-field">
          <PitchMarkings />
          <svg className="network-links" viewBox={`0 0 ${PITCH_L} ${PITCH_W}`} preserveAspectRatio="none" aria-hidden="true">
            {data.links.map(([a, b]) => {
              const from = position.get(a);
              const to = position.get(b);
              if (!from || !to) return null;
              const la = levelOf(a);
              const lb = levelOf(b);
              const onRoute = la !== undefined && lb !== undefined && Math.abs(la - lb) === 1;
              return <line key={`${a}-${b}`} className={`network-link${onRoute ? " is-route" : ""}`}
                x1={from.px} y1={from.py} x2={to.px} y2={to.py} />;
            })}
          </svg>

          {ordered.map((node) => {
            const level = levelOf(node.track_id);
            const who = whoIs(node.track_id);
            const isSource = node.track_id === source;
            const alone = isolated.has(node.track_id);
            const style = { left: `${node.x * 100}%`, top: `${node.y * 100}%` } as CSSProperties;
            const classes = ["network-token",
              level === undefined ? "is-unreached" : LEVEL_CLASSES[Math.min(level, 3)],
              alone ? "is-isolated" : "", isSource ? "is-source" : ""].join(" ");
            return (
              <div key={node.track_id} className={`network-spot${isSource ? " is-source" : ""}${alone ? " is-isolated" : ""}`} style={style}>
                <span className="network-shadow" aria-hidden="true" />
                <button type="button" className={classes} aria-label={t.node(who.name, level ?? null)}
                  aria-pressed={isSource} onClick={() => setChosen(node.track_id)}>
                  {level !== undefined && level > 0 && <span className="network-badge" aria-hidden="true">{level}</span>}
                  <Jersey number={who.shirt} />
                  <span className="network-bar" aria-hidden="true" />
                  {/* Untracked players (negative ids) only show the "?" shirt: many identical labels overlap. */}
                  {node.track_id >= 0 && <span className="network-name">{who.name}</span>}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      <div className="network-side">
        <div className="network-origin level-0">
          <Jersey number={origin.shirt} />
          <div>
            <small>{t.origin}</small>
            <strong>{origin.name}</strong>
            {origin.position && <span className="muted small">{origin.position}</span>}
            <span className="small">{t.reach(reached, data.nodes.length)}</span>
          </div>
        </div>

        <div className="network-legend" aria-label={t.from(origin.name)}>
          <strong>{t.from(origin.name)}</strong>
          <ul>
            {Array.from({ length: Math.min(maxLevel, 3) + 1 }, (_, level) => (
              <li key={level}><i className={`swatch ${LEVEL_CLASSES[level]}`} aria-hidden="true" />
                {level === 3 && maxLevel > 3 ? `${t.level(3)}+` : t.level(level)}</li>
            ))}
            {reached < data.nodes.length && <li><i className="swatch is-unreached" aria-hidden="true" />{t.unreachable}</li>}
            {data.isolated.length > 0 && <li><i className="swatch is-isolated" aria-hidden="true" />{t.isolatedRing}</li>}
          </ul>
        </div>

        <dl className="network-stats">
          <div><dt>{t.groups}</dt><dd>{data.groups}</dd></div>
          <div><dt>{t.isolated}</dt><dd>{data.isolated.length}</dd></div>
          <div><dt>{t.diameter}</dt><dd>{data.diameter}</dd></div>
          <div><dt>{t.links}</dt><dd>{data.links.length}</dd></div>
        </dl>
      </div>

      <details className="tree-how">
        <summary>{t.how}</summary>
        <p>{t.explanation}</p>
        <p className="muted small">{t.complexity}</p>
      </details>
    </div>
  );
}

/** A plain football shirt with the number on the chest; its colour comes from the CSS level class. */
function Jersey({ number }: { number: string }) {
  return (
    <svg className="network-jersey" viewBox="0 0 40 40" aria-hidden="true">
      <path className="jersey-body"
        d="M14 3 L5 7.5 L1 17 L7.5 19.5 L9.5 15.5 L9.5 37 Q20 38.5 30.5 37 L30.5 15.5 L32.5 19.5 L39 17 L35 7.5 L26 3 Q20 8 14 3 Z" />
      <path className="jersey-shade" d="M20 6.2 Q25 5.6 26 3 L35 7.5 L39 17 L32.5 19.5 L30.5 15.5 L30.5 37 Q25 37.8 20 38 Z" />
      <path className="jersey-collar" d="M14 3 Q20 8 26 3 L24.5 2.4 Q20 6 15.5 2.4 Z" />
      <path className="jersey-cuffs" d="M1.6 15.6 L7.9 18.1 M38.4 15.6 L32.1 18.1" />
      <text className={`jersey-number${number.length > 2 ? " is-long" : ""}`} x="20" y="25.5">{number}</text>
    </svg>
  );
}

/** Full-size pitch lines (FIFA proportions on a 105 x 68 m pitch), lying horizontally. */
function PitchMarkings() {
  const end = (left: boolean) => {
    const x = (value: number) => (left ? value : PITCH_L - value);
    const mid = PITCH_W / 2;
    return (
      <g>
        <rect x={left ? 0 : PITCH_L - 16.5} y={mid - 20.16} width={16.5} height={40.32} />
        <rect x={left ? 0 : PITCH_L - 5.5} y={mid - 9.16} width={5.5} height={18.32} />
        <circle cx={x(11)} cy={mid} r={0.4} className="network-spot-mark" />
        <path d={`M ${x(16.5)} ${mid - 7.3} A 9.15 9.15 0 0 ${left ? 1 : 0} ${x(16.5)} ${mid + 7.3}`} />
        <rect x={left ? -1.8 : PITCH_L} y={mid - 3.66} width={1.8} height={7.32} className="network-goal" />
        <path d={`M ${x(0)} 1 A 1 1 0 0 ${left ? 0 : 1} ${x(1)} 0`} />
        <path d={`M ${x(1)} ${PITCH_W} A 1 1 0 0 ${left ? 0 : 1} ${x(0)} ${PITCH_W - 1}`} />
      </g>
    );
  };
  return (
    <svg className="network-lines" viewBox={`0 0 ${PITCH_L} ${PITCH_W}`} preserveAspectRatio="none" aria-hidden="true">
      <rect x={0} y={0} width={PITCH_L} height={PITCH_W} />
      <line x1={PITCH_L / 2} y1={0} x2={PITCH_L / 2} y2={PITCH_W} />
      <circle cx={PITCH_L / 2} cy={PITCH_W / 2} r={9.15} />
      <circle cx={PITCH_L / 2} cy={PITCH_W / 2} r={0.45} className="network-spot-mark" />
      {end(true)}
      {end(false)}
    </svg>
  );
}
