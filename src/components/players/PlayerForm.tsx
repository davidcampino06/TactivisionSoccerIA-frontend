import { useState, type FormEvent } from "react";
import { api, json } from "../../api/client";
import { es } from "../../i18n/es";
import type { Player } from "../../types";
import { ErrorBanner, Section } from "../ui";

const t = es.pages.player;
const POSITIONS = Object.keys(es.labels.position);
const FEET = Object.keys(es.labels.foot);
const STATUSES = ["ACTIVE", "INJURED", "SUSPENDED"] as const;

interface Props {
  teamId: string;
  /** When present the form edits this player; otherwise it creates a new one. */
  player?: Player;
  onSaved: (player: Player) => void;
  onCancel: () => void;
}

/** Create / edit form. The shirt number must be unique among the current squad (checked by the backend). */
export default function PlayerForm({ teamId, player, onSaved, onCancel }: Props) {
  const [form, setForm] = useState({
    firstName: player?.first_name ?? "",
    lastName: player?.last_name ?? "",
    shirt: player?.shirt_number?.toString() ?? "",
    position: player?.position ?? "",
    foot: player?.preferred_foot ?? "",
    status: player && player.status !== "INACTIVE" ? player.status : "ACTIVE",
  });
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);
  const update = (field: keyof typeof form, value: string) => setForm((current) => ({ ...current, [field]: value }));
  // A free-text position saved before the list existed stays selectable.
  const positions = form.position && !POSITIONS.includes(form.position) ? [...POSITIONS, form.position] : POSITIONS;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const body: Record<string, unknown> = {
      first_name: form.firstName.trim(),
      last_name: form.lastName.trim(),
      shirt_number: form.shirt === "" ? null : Number(form.shirt),
      position: form.position || null,
      preferred_foot: form.foot || null,
    };
    if (player && player.status !== "INACTIVE") body.status = form.status;
    try {
      const saved = player
        ? await api<Player>(`/api/players/${player.id}`, { method: "PUT", body: json(body) })
        : await api<Player>(`/api/teams/${teamId}/players`, { method: "POST", body: json(body) });
      onSaved(saved);
    } catch (caught) {
      setError(caught);
      setBusy(false);
    }
  };

  return (
    <Section title={player ? t.editTitle : t.createTitle}>
      <form className="form-grid" onSubmit={submit}>
        <label className="field">
          <span>{t.firstName}</span>
          <input value={form.firstName} onChange={(e) => update("firstName", e.target.value)} maxLength={80} required autoFocus />
        </label>
        <label className="field">
          <span>{t.lastName}</span>
          <input value={form.lastName} onChange={(e) => update("lastName", e.target.value)} maxLength={80} required />
        </label>
        <label className="field">
          <span>{t.shirt}</span>
          <input type="number" inputMode="numeric" min={0} max={99} value={form.shirt}
            onChange={(e) => update("shirt", e.target.value)} aria-describedby="shirt-hint" />
          <small id="shirt-hint" className="muted">{t.shirtHint}</small>
        </label>
        <label className="field">
          <span>{t.position}</span>
          <select value={form.position} onChange={(e) => update("position", e.target.value)}>
            <option value="">{t.noValue}</option>
            {positions.map((code) => (
              <option key={code} value={code}>{(es.labels.position as Record<string, string>)[code] ?? code}</option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>{t.foot}</span>
          <select value={form.foot} onChange={(e) => update("foot", e.target.value)}>
            <option value="">{t.noValue}</option>
            {FEET.map((code) => <option key={code} value={code}>{(es.labels.foot as Record<string, string>)[code]}</option>)}
          </select>
        </label>
        {player && player.status !== "INACTIVE" && (
          <label className="field">
            <span>{t.status}</span>
            <select value={form.status} onChange={(e) => update("status", e.target.value)}>
              {STATUSES.map((code) => <option key={code} value={code}>{es.labels.playerStatus[code]}</option>)}
            </select>
          </label>
        )}
        <ErrorBanner error={error} />
        <div className="form-actions field-wide">
          <button type="button" className="btn btn-ghost" onClick={onCancel}>{es.app.cancel}</button>
          <button className="btn btn-primary" disabled={busy}>{busy ? es.auth.working : t.save}</button>
        </div>
      </form>
    </Section>
  );
}
