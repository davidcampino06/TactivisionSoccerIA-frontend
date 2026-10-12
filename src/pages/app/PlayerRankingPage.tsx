import { useMemo, useState } from "react";
import { Link } from "react-router";
import { api } from "../../api/client";
import { useTeam } from "../../app/teamState";
import { EmptyState, ErrorBanner, Loading, PageHeader, Section } from "../../components/ui";
import { useElementWidth } from "../../hooks/useElementWidth";
import { useLoad } from "../../hooks/useLoad";
import { es } from "../../i18n/es";
import { formatNumber, label } from "../../i18n/labels";
import { BinarySearchTree, minimumHeight } from "../../structures/BinarySearchTree";
import type { PlayerStats } from "../../types";

const t = es.pages.ranking;
type Metric = "seconds" | "detections" | "matches";
const METRICS: Metric[] = ["seconds", "detections", "matches"];

/** Tree key: the metric, and the surname to break ties (so every key is unique). */
interface RankKey { value: number; name: string }
// Bigger value = bigger key; with the same value the alphabetically FIRST surname is the bigger key,
// so the descending ranking lists ties in alphabetical order.
const compareKeys = (a: RankKey, b: RankKey) => a.value - b.value || b.name.localeCompare(a.name, "es");
const keyOf = (player: PlayerStats, metric: Metric): RankKey => ({ value: player[metric], name: `${player.last_name} ${player.first_name}` });

const formatValue = (value: number, metric: Metric) =>
  t.unit[metric](metric === "seconds" ? formatNumber(value, 1) : String(value));

export default function PlayerRankingPage() {
  const { team } = useTeam();
  const stats = useLoad(() => api<PlayerStats[]>(`/api/teams/${team!.id}/player-stats`), team!.id);
  const [metric, setMetric] = useState<Metric>("seconds");
  const [minimum, setMinimum] = useState(0);
  const [hovered, setHovered] = useState<PlayerStats | null>(null);
  const [balanced, setBalanced] = useState(true);

  const players = useMemo(() => stats.data ?? [], [stats.data]);
  // Both trees get the players in roster order (shirt number). The plain one keeps whatever shape
  // that order produces; the AVL one rotates to stay short. The page lets you compare them.
  const trees = useMemo(() => {
    const build = (avl: boolean) => {
      const bst = new BinarySearchTree<RankKey, PlayerStats>(compareKeys, { balanced: avl });
      for (const player of players) bst.insert(keyOf(player, metric), player);
      return bst;
    };
    return { plain: build(false), avl: build(true) };
  }, [players, metric]);
  const tree = balanced ? trees.avl : trees.plain;

  const ranking = useMemo(() => tree.descending(), [tree]);
  const max = Math.max(0, ...players.map((player) => player[metric]));
  const threshold = Math.min(minimum, max);
  const range = useMemo(
    // Lower bound just under the threshold: every key with value >= threshold is inside, whatever its name.
    () => tree.range({ value: threshold - 1e-9, name: "" }, { value: Number.POSITIVE_INFINITY, name: "" }),
    [tree, threshold],
  );
  const inRange = new Set(range.values);
  const path = hovered ? tree.searchPath(keyOf(hovered, metric)).path : [];
  const hasData = max > 0;

  const changeMetric = (next: Metric) => {
    setMetric(next);
    setMinimum(0);
  };

  return (
    <div className="page page-wide">
      <Link to="/jugadores" className="back-link">← {t.back}</Link>
      <PageHeader eyebrow={t.eyebrow} title={t.title} description={t.description} />

      <ErrorBanner error={stats.error} onRetry={stats.reload} />
      {stats.loading && !stats.data ? <Section><Loading /></Section> : players.length === 0 ? (
        <Section><EmptyState title={t.empty} /></Section>
      ) : (
        <>
          <div className="ranking-toolbar">
            <div className="filter-chips" role="group" aria-label={t.metric}>
              {METRICS.map((option) => (
                <button key={option} type="button" className={`chip${metric === option ? " selected" : ""}`}
                  aria-pressed={metric === option} onClick={() => changeMetric(option)}>{t.metrics[option]}</button>
              ))}
            </div>
            {hasData && (
              <label className="ranking-range">
                <span>{t.minimum}</span>
                <input type="range" min={0} max={max} step={metric === "seconds" ? 0.5 : 1} value={threshold}
                  onChange={(event) => setMinimum(Number(event.target.value))} />
                <strong>{t.minimumValue(formatValue(threshold, metric))}</strong>
                <small>{t.inRange(range.values.length, players.length)}</small>
              </label>
            )}
          </div>
          {!hasData && <p className="notice notice-info">{t.noData}</p>}

          <div className="ranking-layout">
            <Section title={t.listTitle} className="ranking-list-panel">
              <ol className="ranking-list">
                {ranking.map((player, index) => {
                  const value = player[metric];
                  return (
                    <li key={player.player_id}>
                      <Link to={`/jugadores/${player.player_id}`}
                        className={`ranking-row${inRange.has(player) ? "" : " is-out"}${hovered === player ? " is-hovered" : ""}`}
                        onPointerEnter={() => setHovered(player)} onPointerLeave={() => setHovered(null)}
                        onFocus={() => setHovered(player)} onBlur={() => setHovered(null)}>
                        <span className="ranking-pos" aria-label={t.rank(index + 1)}>{index + 1}</span>
                        <span className="ranking-shirt" aria-hidden="true">{player.shirt_number ?? "–"}</span>
                        <span className="ranking-name">
                          <strong>{player.first_name} {player.last_name}</strong>
                          <small>{player.position ? label("position", player.position) : ""}</small>
                        </span>
                        <span className="ranking-bar" aria-hidden="true">
                          <span style={{ width: max ? `${(value / max) * 100}%` : "0%" }} />
                        </span>
                        <span className="ranking-value">{formatValue(value, metric)}</span>
                      </Link>
                    </li>
                  );
                })}
              </ol>
            </Section>

            <Section title={t.treeTitle} className="ranking-tree-panel" actions={
              <div className="tree-toggle" role="group" aria-label={t.treeTitle}>
                {([true, false] as const).map((option) => (
                  <button key={String(option)} type="button" className={balanced === option ? "selected" : undefined}
                    aria-pressed={balanced === option} onClick={() => setBalanced(option)}>
                    {option ? t.balanced : t.plain}
                  </button>
                ))}
              </div>
            }>
              <TreeDiagram tree={tree} metric={metric} path={path} visited={range.visited} inRange={inRange} hovered={hovered} />
              <dl className="tree-stats">
                <div><dt>{t.stats.nodes}</dt><dd>{tree.size}</dd></div>
                <div><dt>{t.stats.height}</dt><dd>{tree.height()}</dd></div>
                <div><dt>{t.stats.minimum}</dt><dd>{minimumHeight(tree.size)}</dd></div>
                <div><dt>{t.stats.search}</dt><dd>{hovered ? path.length : "—"}</dd></div>
              </dl>
              <p className="tree-compare">
                {t.stats.compare(trees.plain.height(), trees.avl.height(), trees.avl.rotations)}
              </p>
              <p className="muted small">{hovered ? `${hovered.first_name} ${hovered.last_name}: ${path.length} ${t.stats.search}.` : t.hover}
                {" "}{t.stats.range(range.visited.size, tree.size)}.</p>
              <details className="tree-how">
                <summary>{t.how}</summary>
                <p>{t.explanation}</p>
                <p className="muted small">{t.complexity}</p>
              </details>
            </Section>
          </div>
        </>
      )}
    </div>
  );
}

interface DiagramProps {
  tree: BinarySearchTree<RankKey, PlayerStats>;
  metric: Metric;
  path: PlayerStats[];
  visited: Set<PlayerStats>;
  inRange: Set<PlayerStats>;
  hovered: PlayerStats | null;
}

/** Draws the tree: x = in-order position (never crosses), y = depth. The search path is highlighted. */
function TreeDiagram({ tree, metric, path, visited, inRange, hovered }: DiagramProps) {
  const [ref, width] = useElementWidth<HTMLDivElement>(560);
  const layout = tree.layout();
  const levels = Math.max(1, tree.height());
  const slot = Math.max(34, (width - 24) / Math.max(1, layout.length));
  const W = Math.max(width, slot * layout.length + 24);
  const LEVEL = 58;
  const H = levels * LEVEL + 10;
  const position = new Map(layout.map(({ node, x, depth }) => [node, { cx: 12 + slot * (x + 0.5), cy: 24 + depth * LEVEL }]));
  const onPath = new Set(path);

  return (
    <div className="tree-scroll" ref={ref}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="bst-svg" role="img"
        aria-label={`${t.treeTitle}: ${tree.size} ${t.stats.nodes}, ${t.stats.height} ${tree.height()}`}>
        {layout.map(({ node, parent }) => {
          if (!parent) return null;
          const from = position.get(parent)!;
          const to = position.get(node)!;
          const active = onPath.has(node.value) && onPath.has(parent.value);
          return <line key={`e-${node.value.player_id}`} className={`bst-edge${active ? " is-path" : ""}`} x1={from.cx} y1={from.cy} x2={to.cx} y2={to.cy} />;
        })}
        {layout.map(({ node }) => {
          const { cx, cy } = position.get(node)!;
          const player = node.value;
          const classes = ["bst-node",
            inRange.has(player) ? "is-in" : visited.has(player) ? "is-visited" : "is-skipped",
            onPath.has(player) ? "is-path" : "", hovered === player ? "is-target" : ""].join(" ");
          return (
            <g key={player.player_id} className={classes} transform={`translate(${cx},${cy})`}>
              <title>{`${player.first_name} ${player.last_name}: ${formatValue(player[metric], metric)}`}</title>
              <circle r={15} />
              <text className="bst-label" dy="0.35em">{player.shirt_number ?? "–"}</text>
              <text className="bst-value" dy="2.35em">{formatValue(player[metric], metric)}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
