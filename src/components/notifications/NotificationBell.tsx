import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from "react";
import { useNavigate } from "react-router";
import { api } from "../../api/client";
import { ConfirmButton } from "../ui";
import { es } from "../../i18n/es";
import { formatRelative, label } from "../../i18n/labels";
import type { Notification } from "../../types";

const t = es.app.notifications;
const POLL_MS = 20_000;

type Filter = "all" | "unread";

/** Where a notification takes you: its analysis, its match, the team or the squad page. */
function targetOf(item: Notification): string {
  if (item.event === "ANALYST_JOINED") return "/equipo";
  if (item.event === "PLAYER_RETURN_DUE") return "/jugadores";
  if (item.analysis_id) return `/analisis/${item.analysis_id}`;
  if (item.match_id) return `/partidos/${item.match_id}`;
  return "/panel";
}

/**
 * Bell with the unread count. The count is polled (cheap endpoint) every few seconds and when the
 * window gets the focus back; the list is loaded only when the panel opens.
 */
export default function NotificationBell() {
  const navigate = useNavigate();
  const panelId = useId();
  const wrapRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [bump, setBump] = useState(0);
  const [items, setItems] = useState<Notification[] | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [now, setNow] = useState(() => Date.now());
  const lastCount = useRef(0);

  const showCount = useCallback((next: number) => {
    if (next > lastCount.current) setBump((value) => value + 1); // something new: the badge pops
    lastCount.current = next;
    setUnread(next);
  }, []);

  const refreshCount = useCallback(() => api<{ unread: number }>("/api/notifications/unread-count")
    .then(({ unread: next }) => showCount(next))
    .catch(() => undefined), // offline or session ended: the app handles it elsewhere
  [showCount]);

  const loadList = useCallback(async () => {
    try {
      setItems(await api<Notification[]>("/api/notifications?limit=30"));
      setNow(Date.now());
    } catch {
      setItems((current) => current ?? []);
    }
  }, []);

  useEffect(() => {
    void refreshCount();
    const timer = window.setInterval(() => void refreshCount(), POLL_MS);
    const onFocus = () => void refreshCount();
    window.addEventListener("focus", onFocus);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", onFocus);
    };
  }, [refreshCount]);

  // Close with Escape or a click outside.
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false);
    const onPointer = (event: PointerEvent) => {
      if (!wrapRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [open]);

  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (next) {
      void loadList();
      void refreshCount();
    }
  };

  const markRead = (item: Notification) => {
    if (item.read) return;
    setItems((list) => list?.map((entry) => (entry.id === item.id ? { ...entry, read: true } : entry)) ?? list);
    showCount(Math.max(0, lastCount.current - 1));
    void api(`/api/notifications/${item.id}/read`, { method: "POST" }).catch(() => void refreshCount());
  };

  const openItem = (item: Notification) => {
    markRead(item);
    setOpen(false);
    navigate(targetOf(item));
  };

  const markAll = async () => {
    setItems((list) => list?.map((entry) => ({ ...entry, read: true })) ?? list);
    showCount(0);
    await api("/api/notifications/read-all", { method: "POST" }).catch(() => undefined);
    void refreshCount();
  };

  const deleteItem = (item: Notification) => {
    setItems((list) => list?.filter((entry) => entry.id !== item.id) ?? list);
    if (!item.read) showCount(Math.max(0, lastCount.current - 1));
    void api(`/api/notifications/${item.id}`, { method: "DELETE" }).catch(() => {
      void loadList(); // it failed: show the real list again
      void refreshCount();
    });
  };

  const deleteAll = async () => {
    setItems([]);
    showCount(0);
    await api("/api/notifications", { method: "DELETE" }).catch(() => void loadList());
    void refreshCount();
  };

  const visible = (items ?? []).filter((item) => filter === "all" || !item.read);

  return (
    <div className="notif" ref={wrapRef}>
      <button type="button" className={`notif-button${open ? " is-open" : ""}`} onClick={toggle}
        aria-label={t.bell(unread)} aria-expanded={open} aria-controls={panelId} title={t.title}>
        <svg viewBox="0 0 24 24" width="19" height="19" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8"
          strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 9.5a6 6 0 0 1 12 0c0 4.5 1.8 6.5 1.8 6.5H4.2S6 14 6 9.5" /><path d="M10 19.5a2.2 2.2 0 0 0 4 0" />
        </svg>
        {unread > 0 && <span key={bump} className="notif-badge" aria-hidden="true">{unread > 9 ? "9+" : unread}</span>}
      </button>

      {open && (
        <div className="notif-panel" id={panelId} role="dialog" aria-label={t.title}>
          <div className="notif-head">
            <h2>{t.title}</h2>
            <button type="button" className="notif-mark" onClick={() => void markAll()} disabled={unread === 0}>{t.markAll}</button>
          </div>
          <div className="notif-tabs" role="group" aria-label={t.title}>
            {(["all", "unread"] as const).map((option) => (
              <button key={option} type="button" className={filter === option ? "selected" : undefined}
                aria-pressed={filter === option} onClick={() => setFilter(option)}>
                {option === "all" ? t.all : t.unread}
                {option === "unread" && unread > 0 && <span className="notif-count">{unread}</span>}
              </button>
            ))}
          </div>

          {items === null ? <p className="notif-empty">{es.app.loading}</p> : visible.length === 0 ? (
            <div className="notif-empty">
              <strong>{filter === "unread" ? t.emptyUnread : t.empty}</strong>
              {filter === "all" && <span>{t.emptyHint}</span>}
            </div>
          ) : (
            <ul className="notif-list">
              {visible.map((item) => (
                <li key={item.id}>
                  <button type="button" className={`notif-item${item.read ? "" : " is-unread"}`} onClick={() => openItem(item)}>
                    <span className={`notif-icon notif-${item.event.toLowerCase()}`} aria-hidden="true">{ICONS[item.event] ?? ICONS.default}</span>
                    <span className="notif-body">
                      <span className="notif-kind">{label("notification", item.event)}</span>
                      <span className="notif-message">{item.message}</span>
                      <small>{formatRelative(item.created_at, now, t.justNow)}</small>
                    </span>
                    {!item.read && <span className="notif-dot"><span className="visually-hidden">{t.newBadge}</span></span>}
                  </button>
                  <button type="button" className="notif-delete" aria-label={t.delete(label("notification", item.event))}
                    title={t.delete(label("notification", item.event))} onClick={() => deleteItem(item)}>
                    <svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2"
                      strokeLinecap="round" strokeLinejoin="round"><path d="M5 7h14M10 7V5h4v2M7 7l1 12h8l1-12M10.5 11v5M13.5 11v5" /></svg>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {items !== null && items.length > 0 && (
            <div className="notif-foot">
              <ConfirmButton label={t.deleteAll} confirmLabel={t.deleteAllConfirm} className="notif-mark notif-clear"
                onConfirm={() => void deleteAll()} />
              <small>{t.deleteHint}</small>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const glyph = (d: string) => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);

const ICONS: Record<string, ReactNode> = {
  ANALYSIS_COMPLETED: glyph("M5 12.5 10 17l9-10"),
  ANALYSIS_FAILED: glyph("M7 7l10 10M17 7 7 17"),
  ANALYSIS_CANCELLED: glyph("M6 12h12"),
  TACTICAL_ALERT: glyph("M12 4 2.8 19.5h18.4zM12 10v4.5M12 17.2v.1"),
  ANALYST_JOINED: glyph("M10 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7M4 20c.8-3.4 3.2-5 6-5s5.2 1.6 6 5M18 8v6M15 11h6"),
  // A calendar with a check: the day a player should be back.
  PLAYER_RETURN_DUE: glyph("M5 6h14v14H5zM5 10h14M9 3.5v4M15 3.5v4M9 15l2 2 4-4"),
  // A speech bubble: someone of the staff wrote about a problem.
  RECOMMENDATION_NOTE: glyph("M4 5h16v11H9l-5 4zM8 9.5h8M8 12.5h5"),
  default: glyph("M12 7v6M12 16.5v.1"),
};
