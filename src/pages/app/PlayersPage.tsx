import { useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { api } from "../../api/client";
import { PLAYER_STATUS_TONE } from "../../app/tones";
import { useTeam } from "../../app/teamState";
import PlayerForm from "../../components/players/PlayerForm";
import { EmptyState, ErrorBanner, Loading, PageHeader, Pill, Section } from "../../components/ui";
import { useLoad } from "../../hooks/useLoad";
import { es } from "../../i18n/es";
import { label } from "../../i18n/labels";
import { Trie, searchAll } from "../../structures/Trie";
import type { Player } from "../../types";

const t = es.pages.players;
type Filter = "active" | "INJURED" | "SUSPENDED" | "INACTIVE";
const FILTERS: Filter[] = ["active", "INJURED", "SUSPENDED", "INACTIVE"];
const GROUP_ORDER = ["GOALKEEPER", "DEFENDER", "MIDFIELDER", "FORWARD", "OTHER", "NONE"] as const;
type Group = (typeof GROUP_ORDER)[number];

function groupOf(player: Player): Group {
  if (!player.position) return "NONE";
  return (GROUP_ORDER as readonly string[]).includes(player.position) ? player.position as Group : "OTHER";
}

function inFilter(player: Player, filter: Filter): boolean {
  return filter === "active" ? player.status !== "INACTIVE" : player.status === filter;
}

/** Builds the search tree: every first name, last name and shirt number points to the player id. */
function buildIndex(players: Player[]): Trie<string> {
  const trie = new Trie<string>();
  for (const player of players) {
    for (const word of `${player.first_name} ${player.last_name}`.split(/\s+/)) trie.insert(word, player.id);
    if (player.shirt_number !== null) trie.insert(String(player.shirt_number), player.id);
  }
  return trie;
}

export default function PlayersPage() {
  const { team, isCoach } = useTeam();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const showForm = isCoach && params.get("nuevo") === "1";
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("active");
  const players = useLoad(() => api<Player[]>(`/api/teams/${team!.id}/players?include_inactive=true`), team!.id);

  const all = useMemo(() => players.data ?? [], [players.data]);
  const trie = useMemo(() => buildIndex(all), [all]);
  const search = query.trim() ? searchAll(trie, query) : null;
  const visible = all.filter((player) => inFilter(player, filter) && (!search || search.matches.has(player.id)));
  const squadSize = all.filter((player) => player.status !== "INACTIVE").length;

  const groups = GROUP_ORDER
    .map((group) => ({
      group,
      players: visible.filter((player) => groupOf(player) === group)
        .sort((a, b) => (a.shirt_number ?? 100) - (b.shirt_number ?? 100) || a.last_name.localeCompare(b.last_name)),
    }))
    .filter((entry) => entry.players.length > 0);

  return (
    <div className="page">
      <PageHeader eyebrow={t.eyebrow} title={t.title} description={players.data ? t.description(squadSize) : undefined}
        actions={isCoach && !showForm && (
          <button type="button" className="btn btn-primary" onClick={() => setParams({ nuevo: "1" })}>{t.create}</button>
        )} />

      {showForm && (
        <PlayerForm teamId={team!.id} onCancel={() => setParams({})}
          onSaved={(player) => navigate(`/jugadores/${player.id}`, { state: { notice: es.pages.player.created } })} />
      )}

      <ErrorBanner error={players.error} onRetry={players.reload} />
      {players.loading && !players.data ? <Section><Loading /></Section> : all.length === 0 ? (
        <Section><EmptyState title={t.empty} body={isCoach ? t.emptyCoach : undefined} /></Section>
      ) : (
        <>
          <div className="squad-toolbar">
            <div className="search-box">
              <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" />
              </svg>
              <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t.search}
                aria-label={t.search} maxLength={60} />
              {query && <button type="button" className="search-clear" onClick={() => setQuery("")} aria-label={t.clearSearch}>×</button>}
            </div>
            <div className="filter-chips" role="group" aria-label={t.title}>
              {FILTERS.map((option) => {
                const count = all.filter((player) => inFilter(player, option)).length;
                return (
                  <button key={option} type="button" className={`chip${filter === option ? " selected" : ""}`}
                    aria-pressed={filter === option} onClick={() => setFilter(option)}>
                    {t.filters[option]} <span className="chip-count">{count}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {search && <TriePanel trie={trie} search={search} query={query} />}

          {groups.length === 0 ? (
            <Section><EmptyState title={search ? t.noResults(query.trim()) : t.noneInFilter} /></Section>
          ) : groups.map(({ group, players: list }) => (
            <section key={group} className="squad-group" aria-labelledby={`group-${group}`}>
              <h2 id={`group-${group}`} className="squad-group-title">
                {t.groups[group]} <span>{list.length}</span>
              </h2>
              <ul className="player-grid">
                {list.map((player) => <li key={player.id}><PlayerCard player={player} /></li>)}
              </ul>
            </section>
          ))}
        </>
      )}
    </div>
  );
}

function PlayerCard({ player }: { player: Player }) {
  const details = [
    player.position ? label("position", player.position) : null,
    player.preferred_foot ? label("footShort", player.preferred_foot) : null,
  ].filter(Boolean).join(" · ");
  return (
    <Link to={`/jugadores/${player.id}`} className={`player-card${player.status === "INACTIVE" ? " is-inactive" : ""}`}>
      <span className="player-number" aria-label={`${t.shirtShort} ${player.shirt_number ?? t.noShirt}`}>
        {player.shirt_number ?? t.noShirt}
      </span>
      <span className="player-info">
        <span className="player-first">{player.first_name}</span>
        <strong className="player-last">{player.last_name}</strong>
        {details && <small>{details}</small>}
      </span>
      {player.status !== "ACTIVE" && (
        <span className="player-status"><Pill tone={PLAYER_STATUS_TONE[player.status]}>{label("playerStatus", player.status)}</Pill></span>
      )}
    </Link>
  );
}

/** Shows how the Trie answered the query: the letters walked, the nodes visited and the result size. */
function TriePanel({ trie, search, query }: { trie: Trie<string>; search: ReturnType<typeof searchAll<string>>; query: string }) {
  const [open, setOpen] = useState(false);
  const last = search.last;
  const lastWord = query.trim().split(/\s+/).pop() ?? "";
  const broken = last && !last.found;
  return (
    <div className="trie-panel" aria-live="polite">
      <div className="trie-row">
        <span className="trie-title">{t.trie.title}</span>
        <ol className="trie-path" aria-label={t.trie.title}>
          <li className="trie-node root" aria-hidden="true">·</li>
          {last?.path.map((letter, index) => <li key={index} className="trie-node">{letter}</li>)}
          {broken && <li className="trie-node missing" title={t.trie.notFound}>{lastWord.slice(last.path.length, last.path.length + 1) || "?"}</li>}
        </ol>
        <span className="trie-stats">
          <strong>{t.trie.result(search.matches.size)}</strong>
          <span>{t.trie.visited(search.visited, trie.size)}</span>
        </span>
        <button type="button" className="btn btn-ghost btn-sm" aria-expanded={open} onClick={() => setOpen(!open)}>{t.trie.how}</button>
      </div>
      {open && (
        <p className="trie-explanation">
          {t.trie.explanation} {t.trie.stats(trie.size, trie.words)}
        </p>
      )}
    </div>
  );
}
