import { useRef, useState, type ChangeEvent } from "react";
import { ApiError, api, json } from "../../api/client";
import { useTeam } from "../../app/teamState";
import { es } from "../../i18n/es";
import type { Team } from "../../types";
import { shirtColorName } from "../analysis/shirtColor";
import { TeamSwatch } from "../analysis/TeamColors";
import { ConfirmButton, ErrorBanner, Section } from "../ui";
import TeamCrest from "./TeamCrest";

const t = es.pages.team.identity;
const MAX_BYTES = 2 * 1024 * 1024;
const ACCEPTED = ["image/png", "image/jpeg", "image/webp"];

/** Crest and usual kit colour of the team: the coach changes them, analysts see them. */
export default function TeamIdentity({ team }: { team: Team }) {
  const { isCoach, refresh } = useTeam();
  const input = useRef<HTMLInputElement>(null);
  const [kit, setKit] = useState(team.kit_color ?? "#ffffff");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState<unknown>(null);

  const run = async (action: () => Promise<unknown>, message: string) => {
    setBusy(true);
    setError(null);
    setNotice("");
    try {
      await action();
      await refresh();
      setNotice(message);
    } catch (caught) {
      setError(caught);
    } finally {
      setBusy(false);
    }
  };

  const upload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!ACCEPTED.includes(file.type)) return setError(new ApiError(400, t.badFormat, "CREST_FORMAT"));
    if (file.size > MAX_BYTES) return setError(new ApiError(400, t.tooLarge, "CREST_TOO_LARGE"));
    const body = new FormData();
    body.append("crest", file);
    void run(() => api(`/api/teams/${team.id}/crest`, { method: "PUT", body }), t.crestSaved);
  };

  const saveKit = (color: string | null) =>
    run(() => api(`/api/teams/${team.id}`, { method: "PUT", body: json({ kit_color: color }) }), t.kitSaved);

  return (
    <Section title={t.title}>
      <div className="team-identity">
        <div className="team-identity-crest">
          <TeamCrest team={team} size="lg" />
          {isCoach && (
            <div className="team-identity-actions">
              <input ref={input} type="file" accept={ACCEPTED.join(",")} className="visually-hidden" onChange={upload}
                aria-label={t.upload} tabIndex={-1} />
              <button type="button" className="btn btn-ghost btn-sm" disabled={busy} onClick={() => input.current?.click()}>
                {team.crest_updated_at ? t.replace : t.upload}
              </button>
              {team.crest_updated_at && (
                <ConfirmButton label={t.remove} confirmLabel={t.removeConfirm} className="btn btn-ghost btn-sm"
                  onConfirm={() => void run(() => api(`/api/teams/${team.id}/crest`, { method: "DELETE" }), t.crestRemoved)} />
              )}
              <small className="muted">{t.crestHint}</small>
            </div>
          )}
        </div>

        <div className="team-identity-kit">
          <p className="mini-title">{t.kit}</p>
          {isCoach ? (
            <div className="kit-row">
              <input type="color" value={kit} onChange={(e) => setKit(e.target.value)} aria-label={t.kit} />
              <span>{t.shirt(shirtColorName(kit))}</span>
              <button type="button" className="btn btn-primary btn-sm" disabled={busy || kit === team.kit_color}
                onClick={() => void saveKit(kit)}>{es.app.save}</button>
              {team.kit_color && (
                <button type="button" className="btn btn-ghost btn-sm" disabled={busy} onClick={() => void saveKit(null)}>{t.clearKit}</button>
              )}
            </div>
          ) : (
            <p className="kit-row">
              {team.kit_color ? <><TeamSwatch color={team.kit_color} /> {t.shirt(shirtColorName(team.kit_color))}</> : t.noKit}
            </p>
          )}
          <small className="muted">{t.kitHint}</small>
        </div>
      </div>
      {notice && <p className="notice" role="status">{notice}</p>}
      <ErrorBanner error={error} />
    </Section>
  );
}
