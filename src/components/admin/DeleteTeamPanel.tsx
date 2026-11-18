import { useState } from "react";
import { api } from "../../api/client";
import { es } from "../../i18n/es";
import type { AdminTeam } from "../../types";

const t = es.pages.admin;

export interface TeamDeletion {
  team: string;
  users: number;
  players: number;
  matches: number;
  videos: number;
  files_removed: number;
}

interface Props {
  team: AdminTeam;
  onDeleted: (result: TeamDeletion) => void;
  onCancel: () => void;
  onError: (error: unknown) => void;
}

/**
 * Deleting a team cannot be undone, so the panel lists what will be lost and the button only works
 * after the administrator types the team's name (the same safeguard GitHub uses for repositories).
 */
export default function DeleteTeamPanel({ team, onDeleted, onCancel, onError }: Props) {
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const matches = typed.trim() === team.name.trim();

  const remove = async () => {
    setBusy(true);
    onError(null);
    try {
      onDeleted(await api<TeamDeletion>(`/api/admin/teams/${team.id}`, { method: "DELETE" }));
    } catch (caught) {
      onError(caught);
      setBusy(false);
    }
  };

  return (
    <div className="delete-team" role="group" aria-labelledby={`delete-${team.id}`}>
      <strong id={`delete-${team.id}`}>{t.deleteTeamTitle(team.name)}</strong>
      <p>{t.deleteTeamWarning}</p>
      <ul>
        {t.deleteTeamItems(team.players, team.matches, team.analyses, team.analysts).map((item) => <li key={item}>{item}</li>)}
      </ul>
      <label>
        <span>{t.deleteTeamType(team.name)}</span>
        <input type="text" value={typed} onChange={(event) => setTyped(event.target.value)} autoComplete="off"
          spellCheck={false} disabled={busy} />
      </label>
      <div className="delete-team-actions">
        <button type="button" className="btn btn-danger btn-sm" disabled={!matches || busy} onClick={() => void remove()}>
          {busy ? t.deleting : t.deleteTeamConfirm}
        </button>
        <button type="button" className="btn btn-ghost btn-sm" disabled={busy} onClick={onCancel}>{es.app.cancel}</button>
      </div>
    </div>
  );
}
