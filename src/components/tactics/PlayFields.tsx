import { useEffect, useState } from "react";
import { api, json } from "../../api/client";
import { es } from "../../i18n/es";
import { label } from "../../i18n/labels";
import { ACTION_TYPES, ACTION_TYPE_MAX } from "./board";

const t = es.pages.tactics;
const WRITE = "__write__";

type CountedProps = {
  text: string;
  value: string;
  max: number;
  onChange: (value: string) => void;
  multiline?: boolean;
  required?: boolean;
  placeholder?: string;
  autoFocus?: boolean;
};

/** A text field with its limit and a box that counts down the characters left (50, 49, 48...). */
export function CountedField({ text, value, max, onChange, multiline, required, placeholder, autoFocus }: CountedProps) {
  const left = max - value.length;
  const shared = {
    value, maxLength: max, required, placeholder, autoFocus,
    onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => onChange(event.target.value.slice(0, max)),
  };
  return (
    <label className="field counted-field">
      <span className="counted-head">
        <span>{text}</span>
        {/* A span, not <output>: an <output> inside the label would become the labelled control. */}
        <span className={`counted-left${left <= 5 ? " is-low" : ""}`} role="status" aria-label={t.charsLeftLabel(left)}>
          {left}
        </span>
      </span>
      {multiline ? <textarea rows={2} {...shared} /> : <input {...shared} />}
      <span className="muted small">{t.charsLeft(left, max)}</span>
    </label>
  );
}

interface ActionType { id: string; name: string }

/**
 * Type of action of a play: the fixed ones, the ones this team wrote before, or a new one written
 * here. A written type is saved for the team (table team_action_types) and can be reused in any play.
 */
export function ActionTypeField({ teamId, value, onChange }: { teamId: string; value: string; onChange: (value: string) => void }) {
  const [own, setOwn] = useState<ActionType[]>([]);
  const [writing, setWriting] = useState(false);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    api<ActionType[]>(`/api/teams/${teamId}/action-types`).then((list) => { if (alive) setOwn(list); }).catch(() => undefined);
    return () => { alive = false; };
  }, [teamId]);

  const fixed = ACTION_TYPES as readonly string[];
  const saved = own.find((item) => item.name === value);
  // A play may carry a type that was later removed from the list: it is still shown as its own.
  const orphan = value && !fixed.includes(value) && !saved ? value : null;

  const save = async () => {
    const name = draft.trim().replace(/\s+/g, " ");
    if (name.length < 2) { setError(t.typeTooShort); return; }
    setBusy(true);
    setError("");
    try {
      const created = await api<ActionType>(`/api/teams/${teamId}/action-types`, { method: "POST", body: json({ name }) });
      setOwn((list) => (list.some((item) => item.id === created.id) ? list : [...list, created]
        .sort((a, b) => a.name.localeCompare(b.name, "es"))));
      onChange(created.name);
      setWriting(false);
      setDraft("");
    } catch {
      setError(t.typeNotSaved);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (item: ActionType) => {
    try {
      await api(`/api/teams/${teamId}/action-types/${item.id}`, { method: "DELETE" });
      setOwn((list) => list.filter((other) => other.id !== item.id));
    } catch {
      setError(t.typeNotSaved);
    }
  };

  return (
    <div className="field action-type-field">
      <label className="field">
        <span>{t.actionType}</span>
        <select value={writing ? WRITE : value} onChange={(event) => {
          if (event.target.value === WRITE) { setWriting(true); return; }
          setWriting(false);
          onChange(event.target.value);
        }}>
          <option value="">—</option>
          {ACTION_TYPES.map((code) => <option key={code} value={code}>{label("actionType", code)}</option>)}
          {(own.length > 0 || orphan) && (
            <optgroup label={t.ownTypes}>
              {own.map((item) => <option key={item.id} value={item.name}>{item.name}</option>)}
              {orphan && <option value={orphan}>{orphan}</option>}
            </optgroup>
          )}
          <option value={WRITE}>{t.writeType}</option>
        </select>
      </label>
      {writing && (
        <div className="action-type-new">
          <CountedField text={t.newType} value={draft} max={ACTION_TYPE_MAX} onChange={setDraft} placeholder={t.newTypePlaceholder} autoFocus />
          <div className="form-actions">
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setWriting(false); setDraft(""); setError(""); }}>{es.app.cancel}</button>
            <button type="button" className="btn btn-primary btn-sm" disabled={busy} onClick={() => void save()}>{t.saveType}</button>
          </div>
        </div>
      )}
      {!writing && saved && (
        <button type="button" className="btn btn-ghost btn-sm action-type-remove" onClick={() => void remove(saved)}>
          {t.removeType(saved.name)}
        </button>
      )}
      {error && <p className="field-error" role="alert">{error}</p>}
    </div>
  );
}
