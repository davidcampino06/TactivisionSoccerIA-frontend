import { useState } from "react";
import { ApiError, api, json } from "../../api/client";
import { es } from "../../i18n/es";
import { formationProblem, useFormations } from "./formations";

const t = es.pages.tactics;
const CUSTOM = "__custom__";

type Props = {
  value: string;
  onChange: (value: string) => void;
  label: string;
  /** Text of each option ("Mi equipo en 4-3-3"); the name alone by default. */
  optionText?: (formation: string) => string;
  /** Extra options after the formations (e.g. "Cancha vacía" with value ""). */
  extra?: { value: string; text: string }[];
};

/**
 * Formation select with "Personalizada…": the coach types his own system (from defence to attack,
 * 10 outfield players: 3-4-2-1, 4-1-2-1-2...). It is checked, saved in the formation catalogue so it
 * appears next time, and selected. Afterwards each player can still be dragged anywhere on the pitch.
 */
export default function FormationPicker({ value, onChange, label, optionText = (name) => name, extra = [] }: Props) {
  const [formations, remember] = useFormations();
  const [writing, setWriting] = useState(false);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const known = formations.includes(value) || extra.some((item) => item.value === value);

  const save = async () => {
    const name = draft.replace(/\s+/g, "").replace(/[–—_.]/g, "-");
    const problem = formationProblem(name);
    if (problem) { setError(problem); return; }
    setBusy(true);
    setError("");
    try {
      await api("/api/formations", { method: "POST", body: json({ name, description: t.customDescription }) });
    } catch (caught) {
      // Already in the catalogue: that is fine, use it.
      if (!(caught instanceof ApiError && caught.code === "FORMATION_EXISTS")) {
        setError(t.customNotSaved);
        setBusy(false);
        return;
      }
    }
    remember(name);
    onChange(name);
    setWriting(false);
    setDraft("");
    setBusy(false);
  };

  return (
    <div className="field formation-field">
      <label className="field">
        <span>{label}</span>
        <select value={writing ? CUSTOM : value} onChange={(event) => {
          if (event.target.value === CUSTOM) { setWriting(true); return; }
          setWriting(false);
          onChange(event.target.value);
        }}>
          {formations.map((name) => <option key={name} value={name}>{optionText(name)}</option>)}
          {!known && value && <option value={value}>{optionText(value)}</option>}
          {extra.map((item) => <option key={item.value} value={item.value}>{item.text}</option>)}
          <option value={CUSTOM}>{t.customOption}</option>
        </select>
      </label>
      {writing && (
        <div className="action-type-new">
          <label className="field">
            <span>{t.customLabel}</span>
            <input value={draft} onChange={(event) => setDraft(event.target.value.replace(/\s+/g, "").slice(0, 13))} placeholder="3-4-2-1" autoFocus
              inputMode="numeric" onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); void save(); } }} />
            <span className="muted small">{t.customHint}</span>
          </label>
          <div className="form-actions">
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setWriting(false); setError(""); }}>{es.app.cancel}</button>
            <button type="button" className="btn btn-primary btn-sm" disabled={busy} onClick={() => void save()}>{t.customSave}</button>
          </div>
        </div>
      )}
      {error && <p className="field-error" role="alert">{error}</p>}
    </div>
  );
}
