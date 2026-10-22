import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { api, json } from "../../api/client";
import { useTeam } from "../../app/teamState";
import {
  ACTION_TYPES, FORMATIONS, MAX_ARROWS, MAX_TOKENS, formationTokens, fromConfiguration, newId, nextLabel, sameBoard,
  toConfiguration, type ArrowKind, type Board, type Tool,
} from "../../components/tactics/board";
import { availabilitySummary, isUnavailable } from "../../components/players/availability";
import Pitch from "../../components/tactics/Pitch";
import { useBoardEditor } from "../../components/tactics/useBoardEditor";
import { ConfirmButton, ErrorBanner, Loading, PageHeader, Pill, Section } from "../../components/ui";
import { useLoad } from "../../hooks/useLoad";
import { es } from "../../i18n/es";
import { formatDateTime, formatTimestamp, label } from "../../i18n/labels";
import type { HistoryEntry } from "../../structures/UndoHistory";
import type { Stack } from "../../structures/Stack";
import type { Match, Player, TacticalPlay, TacticalVersion } from "../../types";

const t = es.pages.editor;
const TOOL_GROUPS: Tool[][] = [["select", "own", "rival", "ball", "erase"], ["pass", "run", "dribble"]];
const STACK_PREVIEW = 6;

const playerOption = (player: Player) =>
  `${player.shirt_number !== null ? `${player.shirt_number} · ` : ""}${player.first_name} ${player.last_name}`;

const TOOL_ICONS: Record<Tool, ReactNode> = {
  select: <path d="M6 3l12 9-5.5 1L15 20l-2.5 1-2.6-7L6 17z" />,
  own: <><circle cx="12" cy="12" r="7" /><path d="M12 9v6M9 12h6" /></>,
  rival: <><circle cx="12" cy="12" r="7" /><path d="M9 9l6 6M15 9l-6 6" /></>,
  ball: <><circle cx="12" cy="12" r="7" /><path d="M12 8.5l3 2.2-1.1 3.6h-3.8L9 10.7z" /></>,
  pass: <path d="M4 18L18 6M18 6h-6M18 6v6" strokeDasharray="3 2.5" />,
  run: <path d="M4 18L18 6M18 6h-6M18 6v6" />,
  dribble: <path d="M4 18c2-1 1-3 3-4s2 1 4-1 1-3 3-4 2 0 4-3M18 6h-5M18 6v5" />,
  erase: <path d="M5 15l7-9 7 6-6 7H9zM9 19h10" />,
};

export default function TacticalEditorPage() {
  const { playId = "" } = useParams();
  const navigate = useNavigate();
  const { team, isCoach } = useTeam();
  const editor = useBoardEditor();
  const { board, selectedId, history, apply, reset, undo, redo, select } = editor;

  const play = useLoad(() => api<TacticalPlay>(`/api/tactical-plays/${playId}`), playId);
  const versions = useLoad(() => api<TacticalVersion[]>(`/api/tactical-plays/${playId}/versions`), playId);
  const squad = useLoad(() => api<Player[]>(`/api/teams/${team!.id}/players`), team!.id);

  const [tool, setTool] = useState<Tool>("select");
  const [formation, setFormation] = useState<string>(FORMATIONS[0]);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState<unknown>(null);
  const [loadedVersionId, setLoadedVersionId] = useState<string | null>(null);

  const current = versions.data?.find((version) => version.is_current) ?? null;
  const savedBoard = useMemo(() => fromConfiguration(current?.configuration), [current]);
  const dirty = isCoach && current !== null && !sameBoard(board, savedBoard);
  const readOnly = !isCoach;

  // Load the current version into the board when it changes on the server.
  if (current && current.id !== loadedVersionId) {
    setLoadedVersionId(current.id);
    reset(savedBoard);
    if (savedBoard.formation) setFormation(savedBoard.formation);
  }

  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const names = useMemo(() => Object.fromEntries((squad.data ?? []).map((player) => [player.id, player.last_name])), [squad.data]);
  // Injured, suspended or unavailable players: marked on the pitch and separated in the list.
  const unavailable = useMemo(() => Object.fromEntries((squad.data ?? []).filter(isUnavailable)
    .map((player) => [player.id, availabilitySummary(player)])), [squad.data]);
  const unavailableInPlay = board.tokens.filter((token) => token.playerId && unavailable[token.playerId]).length;
  const selectedToken = board.tokens.find((token) => token.id === selectedId) ?? null;
  const selectedArrow = board.arrows.find((arrow) => arrow.id === selectedId) ?? null;

  const removeSelected = () => {
    if (selectedToken) {
      const what = selectedToken.side === "ball" ? t.ball.toLowerCase() : selectedToken.label;
      apply(t.actions.erase(what), (b) => ({ ...b, tokens: b.tokens.filter((token) => token.id !== selectedToken.id) }), null);
    } else if (selectedArrow) {
      apply(t.actions.erase(label("arrowKind", selectedArrow.kind).toLowerCase()), (b) => ({ ...b, arrows: b.arrows.filter((arrow) => arrow.id !== selectedArrow.id) }), null);
    }
  };

  // Keyboard shortcuts (ignored while typing in a field).
  useEffect(() => {
    if (readOnly) return;
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (target.closest("input, textarea, select")) return;
      const mod = event.ctrlKey || event.metaKey;
      if (mod && event.key.toLowerCase() === "z") {
        event.preventDefault();
        if (event.shiftKey) redo(); else undo();
      } else if (mod && event.key.toLowerCase() === "y") {
        event.preventDefault();
        redo();
      } else if (event.key === "Delete" || event.key === "Backspace") {
        if (selectedId) {
          event.preventDefault();
          removeSelected();
        }
      } else if (event.key === "Escape") {
        select(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const addToken = (side: "own" | "rival" | "ball", x: number, y: number) => {
    setNotice("");
    if (board.tokens.length >= MAX_TOKENS) {
      setNotice(t.tooMany);
      return;
    }
    const id = newId(side[0]);
    if (side === "ball") {
      // Only one ball: placing it again moves it.
      const existing = board.tokens.find((token) => token.side === "ball");
      apply(existing ? t.actions.moveBall : t.actions.addBall, (b) => ({
        ...b,
        tokens: existing
          ? b.tokens.map((token) => (token.side === "ball" ? { ...token, x, y } : token))
          : [...b.tokens, { id, side, x, y, label: "", playerId: null }],
      }), existing?.id ?? id);
      return;
    }
    const tokenLabel = nextLabel(board.tokens, side);
    apply(side === "own" ? t.actions.addOwn(tokenLabel) : t.actions.addRival(tokenLabel),
      (b) => ({ ...b, tokens: [...b.tokens, { id, side, x, y, label: tokenLabel, playerId: null }] }), id);
  };

  const addArrow = (kind: ArrowKind, x1: number, y1: number, x2: number, y2: number) => {
    setNotice("");
    if (board.arrows.length >= MAX_ARROWS) {
      setNotice(t.tooMany);
      return;
    }
    const id = newId("a");
    apply(t.actions.addArrow(label("arrowKind", kind)), (b) => ({ ...b, arrows: [...b.arrows, { id, kind, x1, y1, x2, y2 }] }), id);
  };

  const erase = (id: string) => {
    const token = board.tokens.find((item) => item.id === id);
    const arrow = board.arrows.find((item) => item.id === id);
    if (token) apply(t.actions.erase(token.side === "ball" ? t.ball.toLowerCase() : token.label), (b) => ({ ...b, tokens: b.tokens.filter((item) => item.id !== id) }));
    if (arrow) apply(t.actions.erase(label("arrowKind", arrow.kind).toLowerCase()), (b) => ({ ...b, arrows: b.arrows.filter((item) => item.id !== id) }));
  };

  const placeFormation = (side: "own" | "rival") => {
    const placed = formationTokens(formation, side);
    apply(t.actions.formation(formation, side === "rival"), (b) => ({
      ...b,
      formation: side === "own" ? formation : b.formation,
      tokens: [...b.tokens.filter((token) => token.side !== side), ...placed],
    }), null);
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    setNotice("");
    try {
      const created = await api<TacticalVersion>(`/api/tactical-plays/${playId}/versions`, {
        method: "POST", body: json({ configuration: toConfiguration(board) }),
      });
      setLoadedVersionId(created.id); // the board already shows this content: keep the undo stacks
      versions.setData([...(versions.data ?? []).map((version) => ({ ...version, is_current: false })), created]);
      setNotice(t.savedNotice(created.version_number));
    } catch (caught) {
      setError(caught);
    } finally {
      setSaving(false);
    }
  };

  const serverStep = async (request: Promise<TacticalVersion>) => {
    setError(null);
    setNotice("");
    try {
      const version = await request;
      versions.setData((versions.data ?? []).map((item) => ({ ...item, is_current: item.id === version.id })));
      setNotice(t.restored(version.version_number));
    } catch (caught) {
      setError(caught);
    }
  };

  if ((play.error && !play.data) || (versions.error && !versions.data)) {
    return <div className="page"><BackLink /><ErrorBanner error={play.error ?? versions.error} /></div>;
  }
  if (!play.data || !versions.data) return <div className="page"><Loading /></div>;

  const sortedVersions = [...versions.data].sort((a, b) => b.version_number - a.version_number);
  const players = [...(squad.data ?? [])].sort((a, b) => (a.shirt_number ?? 100) - (b.shirt_number ?? 100));
  const eyebrow = [play.data.action_type ? label("actionType", play.data.action_type) : null, current ? es.pages.tactics.version(current.version_number) : null]
    .filter(Boolean).join(" · ");

  return (
    <div className="page page-wide">
      <BackLink />
      <PageHeader eyebrow={eyebrow} title={play.data.name} description={play.data.description ?? undefined}
        actions={isCoach && (
          <>
            {dirty ? <Pill tone="warning">{t.unsaved}</Pill> : <Pill tone="success">{t.saved}</Pill>}
            <button type="button" className="btn btn-primary" disabled={!dirty || saving} onClick={() => void save()}>
              {saving ? t.saving : t.save}
            </button>
          </>
        )} />
      {readOnly && <p className="notice">{t.readOnly}</p>}
      {notice && <p className="notice" role="status">{notice}</p>}
      <ErrorBanner error={error} />

      <div className="editor-layout">
        <div className="editor-main">
          {!readOnly && (
            <div className="editor-toolbar" role="toolbar" aria-label={t.tools}>
              {TOOL_GROUPS.map((group) => (
              <div className="tool-group" key={group.join()}>
                {group.map((item) => (
                  <button key={item} type="button" className={`tool${tool === item ? " selected" : ""}${item === "erase" ? " tool-erase" : ""}`}
                    aria-pressed={tool === item} title={t.toolHint[item]} onClick={() => setTool(item)}>
                    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor"
                      strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{TOOL_ICONS[item]}</svg>
                    <span>{t.tool[item]}</span>
                  </button>
                ))}
              </div>
              ))}
              <div className="tool-group">
                <button type="button" className="tool" disabled={!history.canUndo} onClick={undo} title="Ctrl+Z">
                  <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M9 7L4 12l5 5M4 12h11a5 5 0 0 1 0 10h-2" /></svg>
                  <span>{t.undo}</span>
                </button>
                <button type="button" className="tool" disabled={!history.canRedo} onClick={redo} title="Ctrl+Y">
                  <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M15 7l5 5-5 5M20 12H9a5 5 0 0 0 0 10h2" /></svg>
                  <span>{t.redo}</span>
                </button>
              </div>
            </div>
          )}
          {!readOnly && <p className="tool-hint">{t.toolHint[tool]}</p>}

          <div className="pitch-frame">
            <Pitch board={board} tool={tool} selectedId={selectedId} readOnly={readOnly} names={names} unavailable={unavailable}
              ariaLabel={play.data.name} onSelect={select} onAddToken={addToken} onAddArrow={addArrow} onErase={erase}
              onDragStart={editor.dragStart} onDrag={editor.drag} onDragEnd={editor.dragEnd} />
          </div>
          <p className="pitch-caption">{t.attack} →</p>
          {unavailableInPlay > 0 && <p className="notice notice-warning" role="status">{t.unavailableInPlay(unavailableInPlay)}</p>}

          {!readOnly && (
            <div className="editor-row">
              <div className="formation-picker">
                <label className="field">
                  <span>{t.formation}</span>
                  <select value={formation} onChange={(e) => setFormation(e.target.value)}>
                    {FORMATIONS.map((item) => <option key={item} value={item}>{item}</option>)}
                  </select>
                </label>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => placeFormation("own")}>{t.placeOwn}</button>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => placeFormation("rival")}>{t.placeRival}</button>
              </div>
              <ConfirmButton label={t.clear} confirmLabel={t.clearConfirm} className="btn btn-ghost btn-sm"
                disabled={board.tokens.length === 0 && board.arrows.length === 0}
                onConfirm={() => apply(t.actions.clear, (b) => ({ ...b, tokens: [], arrows: [] }), null)} />
            </div>
          )}

          {!readOnly && (
            <Section title={t.selection}>
              {selectedToken && selectedToken.side !== "ball" ? (
                <div className="inspector">
                  <label className="field">
                    <span>{t.label}</span>
                    <input key={`${selectedToken.id}-${selectedToken.label}`} defaultValue={selectedToken.label} maxLength={3}
                      onBlur={(e) => {
                        const value = e.target.value.trim();
                        if (value && value !== selectedToken.label) {
                          apply(t.actions.label(value), (b) => ({ ...b, tokens: b.tokens.map((token) => (token.id === selectedToken.id ? { ...token, label: value } : token)) }));
                        }
                      }}
                      onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }} />
                  </label>
                  {selectedToken.side === "own" && (
                    <label className="field">
                      <span>{t.linkPlayer}</span>
                      <select value={selectedToken.playerId ?? ""} onChange={(e) => {
                        const player = players.find((item) => item.id === e.target.value);
                        apply(player ? t.actions.link(`${player.first_name} ${player.last_name}`) : t.actions.unlink, (b) => ({
                          ...b,
                          tokens: b.tokens.map((token) => (token.id !== selectedToken.id ? token : {
                            ...token,
                            playerId: player?.id ?? null,
                            label: player?.shirt_number !== null && player?.shirt_number !== undefined ? String(player.shirt_number) : token.label,
                          })),
                        }));
                      }}>
                        <option value="">{t.noPlayer}</option>
                        <optgroup label={t.availableGroup}>
                          {players.filter((player) => !unavailable[player.id]).map((player) => (
                            <option key={player.id} value={player.id}>{playerOption(player)}</option>
                          ))}
                        </optgroup>
                        {players.some((player) => unavailable[player.id]) && (
                          <optgroup label={t.unavailableGroup}>
                            {players.filter((player) => unavailable[player.id]).map((player) => (
                              <option key={player.id} value={player.id}>
                                {playerOption(player)} — {label("playerStatus", player.status)}
                              </option>
                            ))}
                          </optgroup>
                        )}
                      </select>
                    </label>
                  )}
                  {selectedToken.playerId && unavailable[selectedToken.playerId] && (
                    <p className="notice notice-warning small" role="status">
                      {t.unavailableLinked(names[selectedToken.playerId] ?? "",
                        unavailable[selectedToken.playerId])}
                    </p>
                  )}
                  <button type="button" className="btn btn-danger btn-sm" onClick={removeSelected}>{t.remove}</button>
                </div>
              ) : selectedToken ? (
                <div className="inspector">
                  <span className="muted">{t.ball}</span>
                  <button type="button" className="btn btn-danger btn-sm" onClick={removeSelected}>{t.remove}</button>
                </div>
              ) : selectedArrow ? (
                <div className="inspector">
                  <label className="field">
                    <span>{t.arrowType}</span>
                    <select value={selectedArrow.kind} onChange={(e) => {
                      const kind = e.target.value as ArrowKind;
                      apply(t.actions.arrowType(label("arrowKind", kind)), (b) => ({ ...b, arrows: b.arrows.map((arrow) => (arrow.id === selectedArrow.id ? { ...arrow, kind } : arrow)) }));
                    }}>
                      {(["pass", "run", "dribble"] as ArrowKind[]).map((kind) => <option key={kind} value={kind}>{label("arrowKind", kind)}</option>)}
                    </select>
                  </label>
                  <button type="button" className="btn btn-danger btn-sm" onClick={removeSelected}>{t.remove}</button>
                </div>
              ) : <p className="muted">{t.noSelection}</p>}
            </Section>
          )}
        </div>

        <aside className="editor-side">
          {!readOnly && <StacksPanel undoStack={history.undoStack} redoStack={history.redoStack} />}

          <NotesPanel board={board} readOnly={readOnly} onCommit={(notes) => apply(t.actions.notes, (b) => ({ ...b, notes }))} />

          <Section title={t.versionsTitle}>
            <p className="muted small">{t.versionsHint}</p>
            <ol className="version-list">
              {sortedVersions.map((version) => (
                <li key={version.id} className={version.is_current ? "is-current" : undefined}>
                  <span className="version-number">v{version.version_number}</span>
                  <span className="version-date">{formatTimestamp(version.created_at)}</span>
                  {version.is_current ? <Pill tone="success">{t.current}</Pill> : isCoach && (
                    <ConfirmButton label={t.restore} confirmLabel={t.restoreConfirm} className="btn btn-ghost btn-sm"
                      onConfirm={() => void serverStep(api<TacticalVersion>(`/api/tactical-plays/${playId}/versions/${version.id}/activate`, { method: "POST" }))} />
                  )}
                </li>
              ))}
            </ol>
            {isCoach && current && current.version_number > 1 && (
              <ConfirmButton label={t.previous} confirmLabel={t.restoreConfirm} className="btn btn-ghost btn-sm"
                onConfirm={() => void serverStep(api<TacticalVersion>(`/api/tactical-plays/${playId}/versions/undo`, { method: "POST" }))} />
            )}
            {dirty && <small className="muted">{t.discardFirst}</small>}
          </Section>

          <MatchesPanel playId={playId} teamId={team!.id} />

          {isCoach && (
            <DetailsPanel play={play.data} onSaved={(updated) => { play.setData(updated); setNotice(t.detailsSaved); }}
              onDeleted={() => navigate("/diseno-tactico")} />
          )}
        </aside>
      </div>
    </div>
  );
}

function BackLink() {
  return <Link to="/diseno-tactico" className="back-link">← {t.back}</Link>;
}

/** The two stacks of the undo history, top first. */
function StacksPanel({ undoStack, redoStack }: { undoStack: Stack<HistoryEntry<Board>>; redoStack: Stack<HistoryEntry<Board>> }) {
  const column = (title: string, stack: Stack<HistoryEntry<Board>>, tone: string) => {
    const items = stack.toArray(STACK_PREVIEW);
    return (
      <div className={`stack-column stack-${tone}`}>
        <p className="stack-title">{title} <span>{stack.size}</span></p>
        {items.length === 0 ? <p className="stack-empty">{t.emptyStack}</p> : (
          <ol className="stack-items">
            {items.map((entry, index) => (
              <li key={`${stack.size - index}`} className={index === 0 ? "is-top" : undefined}>
                <span>{entry.label}</span>
                {index === 0 && <small>{t.top}</small>}
              </li>
            ))}
          </ol>
        )}
        {stack.size > STACK_PREVIEW && <p className="stack-more">{t.more(stack.size - STACK_PREVIEW)}</p>}
      </div>
    );
  };
  return (
    <Section title={t.history}>
      <p className="muted small">{t.historyHint}</p>
      <div className="stacks">
        {column(t.undoStack, undoStack, "undo")}
        {column(t.redoStack, redoStack, "redo")}
      </div>
      <p className="muted small">{t.shortcuts}</p>
    </Section>
  );
}

function NotesPanel({ board, readOnly, onCommit }: { board: Board; readOnly: boolean; onCommit: (notes: string) => void }) {
  return (
    <Section title={t.notes}>
      {readOnly ? <p className="notes-text">{board.notes || "—"}</p> : (
        <textarea key={board.notes} rows={4} maxLength={1000} defaultValue={board.notes} placeholder={t.notesPlaceholder}
          aria-label={t.notes} onBlur={(e) => { if (e.target.value !== board.notes) onCommit(e.target.value); }} />
      )}
    </Section>
  );
}

function MatchesPanel({ playId, teamId }: { playId: string; teamId: string }) {
  const linked = useLoad(() => api<Match[]>(`/api/tactical-plays/${playId}/matches`), playId);
  const all = useLoad(() => api<Match[]>(`/api/teams/${teamId}/matches`), teamId);
  const [choice, setChoice] = useState("");
  const [error, setError] = useState<unknown>(null);
  const linkedIds = new Set((linked.data ?? []).map((match) => match.id));
  const options = (all.data ?? []).filter((match) => !linkedIds.has(match.id)).sort((a, b) => b.match_date.localeCompare(a.match_date));

  const run = async (request: Promise<unknown>) => {
    setError(null);
    try {
      await request;
      setChoice("");
      linked.reload();
    } catch (caught) {
      setError(caught);
    }
  };

  return (
    <Section title={t.matches}>
      <ErrorBanner error={error ?? linked.error} />
      {linked.loading && !linked.data ? <Loading /> : (linked.data ?? []).length === 0 ? <p className="muted">{t.matchesEmpty}</p> : (
        <ul className="row-list">
          {(linked.data ?? []).map((match) => (
            <li key={match.id} className="row">
              <span className="row-main">
                <Link to={`/partidos/${match.id}`} className="table-link">vs {match.opponent}</Link>
                <small>{formatDateTime(match.match_date)}</small>
              </span>
              <button type="button" className="btn btn-ghost btn-sm"
                onClick={() => void run(api(`/api/matches/${match.id}/tactical-plays/${playId}`, { method: "DELETE" }))}>{t.unlink}</button>
            </li>
          ))}
        </ul>
      )}
      {options.length > 0 && (
        <form className="inline-form" onSubmit={(event: FormEvent) => {
          event.preventDefault();
          if (choice) void run(api(`/api/matches/${choice}/tactical-plays`, { method: "POST", body: json({ tactical_play_id: playId }) }));
        }}>
          <select value={choice} onChange={(e) => setChoice(e.target.value)} aria-label={t.linkMatch}>
            <option value="">{t.chooseMatch}</option>
            {options.map((match) => <option key={match.id} value={match.id}>vs {match.opponent} · {formatDateTime(match.match_date)}</option>)}
          </select>
          <button className="btn btn-ghost btn-sm" disabled={!choice}>{t.link}</button>
        </form>
      )}
    </Section>
  );
}

function DetailsPanel({ play, onSaved, onDeleted }: { play: TacticalPlay; onSaved: (play: TacticalPlay) => void; onDeleted: () => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: play.name, actionType: play.action_type ?? "", description: play.description ?? "" });
  const [error, setError] = useState<unknown>(null);
  const tt = es.pages.tactics;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    try {
      onSaved(await api<TacticalPlay>(`/api/tactical-plays/${play.id}`, { method: "PUT", body: json({
        name: form.name.trim(), action_type: form.actionType || null, description: form.description.trim() || null,
      }) }));
      setOpen(false);
    } catch (caught) {
      setError(caught);
    }
  };

  const remove = async () => {
    try {
      await api(`/api/tactical-plays/${play.id}`, { method: "DELETE" });
      onDeleted();
    } catch (caught) {
      setError(caught);
    }
  };

  return (
    <Section title={t.details} actions={!open && <button type="button" className="btn btn-ghost btn-sm" onClick={() => setOpen(true)}>{t.editDetails}</button>}>
      {open ? (
        <form className="form-grid form-grid-single" onSubmit={submit}>
          <label className="field">
            <span>{tt.name}</span>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} maxLength={120} required />
          </label>
          <label className="field">
            <span>{tt.actionType}</span>
            <select value={form.actionType} onChange={(e) => setForm({ ...form, actionType: e.target.value })}>
              <option value="">—</option>
              {ACTION_TYPES.map((code) => <option key={code} value={code}>{label("actionType", code)}</option>)}
            </select>
          </label>
          <label className="field">
            <span>{tt.descriptionLabel}</span>
            <textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} maxLength={250} />
          </label>
          <ErrorBanner error={error} />
          <div className="form-actions">
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setOpen(false)}>{es.app.cancel}</button>
            <button className="btn btn-primary btn-sm">{es.app.save}</button>
          </div>
        </form>
      ) : (
        <>
          <ErrorBanner error={error} />
          <ConfirmButton label={t.deletePlay} confirmLabel={t.deleteConfirm} onConfirm={() => void remove()} />
        </>
      )}
    </Section>
  );
}
