import { useEffect, useRef, useState } from "react";
import { es } from "../i18n/es";
import { formatValue, pad, parseValue, type Parts } from "./dateTimeValue";

const t = es.dateTimePicker;

function describe(parts: Parts): string {
  const date = new Date(parts.year, parts.month, parts.day);
  const day = date.toLocaleDateString("es-CO", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  return `${day} · ${pad(parts.hour)}:${pad(parts.minute)}`;
}

/** Days of the month view, Monday first; null = blank cell before the 1st. */
function monthCells(year: number, month: number): (number | null)[] {
  const first = (new Date(year, month, 1).getDay() + 6) % 7;
  const days = new Date(year, month + 1, 0).getDate();
  return [...Array<null>(first).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)];
}

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = Array.from({ length: 12 }, (_, i) => i * 5);

interface Props {
  value: string;
  onChange: (value: string) => void;
  labelId?: string;
}

/**
 * Date and time of a match. The native datetime-local picker has no confirm button on desktop browsers,
 * so this one opens a panel with a calendar, the hour and the minutes, and only changes the value when
 * the person presses "Confirmar". Cancel, Escape or a click outside leave the previous value.
 */
export default function DateTimePicker({ value, onChange, labelId }: Props) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Parts>(() => parseValue(value));
  const [view, setView] = useState(() => ({ year: draft.year, month: draft.month }));
  const box = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const current = parseValue(value);

  const show = () => {
    const parts = parseValue(value);
    setDraft(parts);
    setView({ year: parts.year, month: parts.month });
    setOpen(true);
  };
  const close = () => {
    setOpen(false);
    trigger.current?.focus();
  };
  const confirm = () => {
    onChange(formatValue(draft));
    close();
  };

  useEffect(() => {
    if (!open) return;
    const outside = (event: MouseEvent) => {
      if (box.current && !box.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", outside);
    return () => document.removeEventListener("mousedown", outside);
  }, [open]);

  const moveMonth = (step: number) => setView(({ year, month }) => {
    const date = new Date(year, month + step, 1);
    return { year: date.getFullYear(), month: date.getMonth() };
  });
  const pickDay = (day: number) => setDraft((parts) => ({ ...parts, year: view.year, month: view.month, day }));
  const minutes = MINUTES.includes(draft.minute) ? MINUTES : [...MINUTES, draft.minute].sort((a, b) => a - b);
  const monthName = new Date(view.year, view.month, 1).toLocaleDateString("es-CO", { month: "long", year: "numeric" });

  return (
    <div className="dtp" ref={box} onKeyDown={(event) => { if (open && event.key === "Escape") { event.preventDefault(); close(); } }}>
      <button type="button" ref={trigger} className="dtp-trigger" aria-haspopup="dialog" aria-expanded={open}
        aria-labelledby={labelId ? `${labelId} dtp-value-${labelId}` : undefined} onClick={() => (open ? close() : show())}>
        <span id={labelId ? `dtp-value-${labelId}` : undefined}>{describe(current)}</span>
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
          <path d="M7 3v3M17 3v3M4 9h16M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z"
            fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      </button>

      {open && (
        <div className="dtp-panel" role="dialog" aria-label={t.dialog}>
          <div className="dtp-month">
            <button type="button" className="btn btn-ghost btn-sm" aria-label={t.previousMonth} onClick={() => moveMonth(-1)}>‹</button>
            <strong>{monthName}</strong>
            <button type="button" className="btn btn-ghost btn-sm" aria-label={t.nextMonth} onClick={() => moveMonth(1)}>›</button>
          </div>
          <div className="dtp-grid">
            {t.weekdays.map((day) => <span key={day} className="dtp-weekday" aria-hidden="true">{day}</span>)}
            {monthCells(view.year, view.month).map((day, index) => day === null
              ? <span key={`blank-${index}`} />
              : (
                <button key={day} type="button" className="dtp-day"
                  aria-pressed={draft.year === view.year && draft.month === view.month && draft.day === day}
                  aria-label={new Date(view.year, view.month, day).toLocaleDateString("es-CO", { weekday: "long", day: "numeric", month: "long" })}
                  onClick={() => pickDay(day)}>{day}</button>
              ))}
          </div>
          <div className="dtp-time">
            <label>
              <span>{t.hour}</span>
              <select value={draft.hour} onChange={(event) => setDraft({ ...draft, hour: Number(event.target.value) })}>
                {HOURS.map((hour) => <option key={hour} value={hour}>{pad(hour)}</option>)}
              </select>
            </label>
            <span aria-hidden="true">:</span>
            <label>
              <span>{t.minute}</span>
              <select value={draft.minute} onChange={(event) => setDraft({ ...draft, minute: Number(event.target.value) })}>
                {minutes.map((minute) => <option key={minute} value={minute}>{pad(minute)}</option>)}
              </select>
            </label>
          </div>
          <p className="dtp-summary" aria-live="polite">{describe(draft)}</p>
          <div className="dtp-actions">
            <button type="button" className="btn btn-ghost btn-sm" onClick={close}>{t.cancel}</button>
            <button type="button" className="btn btn-primary btn-sm" onClick={confirm}>{t.confirm}</button>
          </div>
        </div>
      )}
    </div>
  );
}
