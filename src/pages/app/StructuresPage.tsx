import { useState } from "react";
import { Link } from "react-router";
import { api } from "../../api/client";
import { useTeam } from "../../app/teamState";
import { EmptyState, ErrorBanner, Loading, PageHeader, Pill, Section } from "../../components/ui";
import { useElementWidth } from "../../hooks/useElementWidth";
import { useLoad } from "../../hooks/useLoad";
import { es } from "../../i18n/es";
import { formatPercent, label } from "../../i18n/labels";
import type { ReviewQueue, ReviewQueueItem } from "../../types";

const t = es.pages.structures;
const h = t.heap;

interface Catalog {
  key: string;
  layer: "frontend" | "backend" | "ai" | "both";
  to?: string;
}

// In the order the course introduces them: linear structures first, then trees and graphs.
const CATALOG: Catalog[] = [
  { key: "queue", layer: "backend", to: "/partidos" },
  { key: "stack", layer: "both", to: "/diseno-tactico" },
  { key: "list", layer: "backend", to: "/partidos" },
  { key: "hash", layer: "backend" },
  { key: "trie", layer: "frontend", to: "/jugadores" },
  { key: "heap", layer: "backend", to: "#monticulo" },
  { key: "bst", layer: "frontend", to: "/jugadores/ranking" },
  { key: "graph", layer: "ai", to: "/partidos" },
];

/** Levels drawn of the heap tree: 5 levels = the first 31 positions. */
const MAX_LEVELS = 5;
const MAX_NODES = 2 ** MAX_LEVELS - 1;

export default function StructuresPage() {
  const { team } = useTeam();
  const queue = useLoad(() => api<ReviewQueue>(`/api/teams/${team!.id}/review-queue?limit=5`), team!.id);

  return (
    <div className="page page-wide">
      <PageHeader eyebrow={t.eyebrow} title={t.title} description={t.description} />

      <ol className="ds-grid">
        {CATALOG.map(({ key, layer, to }, index) => {
          const item = t.items[key];
          return (
            <li key={key} className={`ds-card ds-${layer}`}>
              <div className="ds-card-head">
                <span className="ds-number" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
                <Pill tone={layer === "ai" ? "live" : layer === "backend" ? "info" : "success"}>{t.layers[layer]}</Pill>
              </div>
              <h2>{item.name}</h2>
              <p>{item.body}</p>
              <p className="ds-cost"><span className="visually-hidden">{t.cost}: </span>{item.cost}</p>
              {to?.startsWith("#") ? <a href={to} className="ds-link">{t.seeBelow} ↓</a>
                : to ? <Link to={to} className="ds-link">{t.open} →</Link>
                : <span className="ds-link is-static">{t.inLogin}</span>}
            </li>
          );
        })}
      </ol>
      <p className="muted small ds-tests">{t.tests}</p>

      <Section title={h.title} className="heap-section">
        <div id="monticulo" className="heap-anchor" />
        <p className="network-subtitle">{h.subtitle}</p>
        <ErrorBanner error={queue.error} onRetry={queue.reload} />
        {queue.loading && !queue.data ? <Loading /> : !queue.data || queue.data.heap.length === 0 ? (
          <EmptyState title={h.empty} body={h.emptyBody} />
        ) : <HeapView queue={queue.data} />}
      </Section>
    </div>
  );
}

const SEVERITY_CLASS: Record<string, string> = { HIGH: "sev-high", MEDIUM: "sev-medium", LOW: "sev-low" };

function HeapView({ queue }: { queue: ReviewQueue }) {
  const [selected, setSelected] = useState(0);
  const heap = queue.heap;
  const shown = heap.slice(0, MAX_NODES);
  const index = Math.min(selected, heap.length - 1);
  const item = heap[index];
  const parent = index > 0 ? Math.floor((index - 1) / 2) : null;
  const children = [2 * index + 1, 2 * index + 2].filter((child) => child < heap.length);
  const related = new Set([index, ...(parent !== null ? [parent] : []), ...children]);

  return (
    <div className="heap">
      <p className="muted small">{h.hint}</p>
      <div className="heap-layout">
        <div className="heap-main">
          <HeapTree heap={shown} selected={index} related={related} onSelect={setSelected} />
          {heap.length > MAX_NODES && <p className="muted small">{h.more(heap.length - MAX_NODES)}</p>}

          <p className="dash-label">{h.array}</p>
          <ol className="heap-array" aria-label={h.array}>
            {heap.map((entry, position) => (
              <li key={entry.id}>
                <button type="button" onClick={() => setSelected(position)} aria-pressed={position === index}
                  className={`heap-cell ${SEVERITY_CLASS[entry.severity] ?? ""}${position === index ? " is-selected" : related.has(position) ? " is-related" : ""}`}
                  title={entry.title}>
                  <small>{position}</small>
                  <span>{label("severity", entry.severity).charAt(0)}</span>
                </button>
              </li>
            ))}
          </ol>
          <p className="heap-legend small">
            <span className="muted">{h.legend}:</span>
            {["HIGH", "MEDIUM", "LOW"].map((severity) => (
              <span key={severity}><i className={`heap-dot ${SEVERITY_CLASS[severity]}`} aria-hidden="true" />
                {label("severity", severity)} ({label("severity", severity).charAt(0)})</span>
            ))}
          </p>
          <p className="muted small">{h.rule}</p>
        </div>

        <aside className="heap-side">
          <div className="heap-detail">
            <small>{h.position(index)}</small>
            <strong>{item.title}</strong>
            <div className="heap-tags">
              <Pill tone={item.severity === "HIGH" ? "danger" : item.severity === "MEDIUM" ? "warning" : "info"}>
                {label("severity", item.severity)}</Pill>
              <Pill>{h.confidence(formatPercent(item.confidence))}</Pill>
              {item.status === "GENERATED" && <Pill tone="live">{h.unreviewed}</Pill>}
            </div>
            <span className="muted small">{h.versus(item.opponent)}</span>
            <ul className="heap-relations">
              <li>{parent === null ? h.root : h.parent(parent)}</li>
              <li>{children.length ? h.children(children.join(" y ")) : h.leaf}</li>
            </ul>
            {item.analysis_id && <Link to={`/analisis/${item.analysis_id}`} className="btn btn-ghost btn-sm">{h.openAnalysis}</Link>}
          </div>

          <div className="heap-order">
            <p className="dash-label">{h.order} · {h.total(queue.total)}</p>
            <ol>
              {queue.items.map((entry) => (
                <li key={entry.id}>
                  <span className={`heap-rank ${SEVERITY_CLASS[entry.severity] ?? ""}`}>{entry.rank}</span>
                  <span>{entry.title}<small className="muted">{h.versus(entry.opponent)}</small></span>
                </li>
              ))}
            </ol>
            <p className="muted small">{h.orderHint}</p>
          </div>
        </aside>
      </div>
    </div>
  );
}

interface TreeProps {
  heap: ReviewQueueItem[];
  selected: number;
  related: Set<number>;
  onSelect: (index: number) => void;
}

/** The array drawn as the tree it represents: position i has its children at 2i + 1 and 2i + 2. */
function HeapTree({ heap, selected, related, onSelect }: TreeProps) {
  const [ref, width] = useElementWidth<HTMLDivElement>(640, 280);
  const levels = Math.floor(Math.log2(heap.length)) + 1;
  const slots = 2 ** (levels - 1);
  const W = Math.max(width, slots * 40 + 16);
  const LEVEL = 64;
  const H = (levels - 1) * LEVEL + 56;
  const point = (index: number) => {
    const depth = Math.floor(Math.log2(index + 1));
    const offset = index - (2 ** depth - 1);
    return { x: 8 + ((offset + 0.5) * (W - 16)) / 2 ** depth, y: 24 + depth * LEVEL };
  };

  return (
    <div className="tree-scroll" ref={ref}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="bst-svg heap-svg" role="img" aria-label={`${h.tree}: ${heap.length}`}>
        {heap.map((_, index) => {
          if (index === 0) return null;
          const parent = Math.floor((index - 1) / 2);
          const from = point(parent);
          const to = point(index);
          const active = (index === selected || parent === selected) && related.has(index) && related.has(parent);
          return <line key={`e-${index}`} className={`bst-edge${active ? " is-path" : ""}`} x1={from.x} y1={from.y} x2={to.x} y2={to.y} />;
        })}
        {heap.map((entry, index) => {
          const { x, y } = point(index);
          const classes = ["heap-node", SEVERITY_CLASS[entry.severity] ?? "",
            index === selected ? "is-selected" : related.has(index) ? "is-related" : ""].join(" ");
          return (
            <g key={entry.id} className={classes} transform={`translate(${x},${y})`} tabIndex={0} role="button"
              aria-label={`${h.position(index)}: ${entry.title}`} aria-pressed={index === selected}
              onClick={() => onSelect(index)}
              onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onSelect(index); } }}>
              <title>{`${h.position(index)} · ${entry.title} · ${label("severity", entry.severity)} · ${formatPercent(entry.confidence)}`}</title>
              <circle r={16} />
              <text className="bst-label" dy="0.35em">{index}</text>
              <text className="bst-value" dy="2.6em">{formatPercent(entry.confidence)}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
