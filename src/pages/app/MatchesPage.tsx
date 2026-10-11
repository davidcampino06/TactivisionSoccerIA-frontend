import { useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { api, json } from "../../api/client";
import { useTeam } from "../../app/teamState";
import { EmptyState, ErrorBanner, Loading, PageHeader, Pill, Section } from "../../components/ui";
import { useLoad } from "../../hooks/useLoad";
import { es } from "../../i18n/es";
import { formatDateTime, label } from "../../i18n/labels";
import type { Match } from "../../types";
import { RESULT_TONE } from "../../app/tones";

const t = es.pages.matches;

function defaultDateTime(): string {
  const date = new Date();
  date.setMinutes(0, 0, 0);
  date.setHours(date.getHours() + 1);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:00`;
}

export default function MatchesPage() {
  const { team } = useTeam();
  const [params, setParams] = useSearchParams();
  const showForm = params.get("nuevo") === "1";
  const matches = useLoad(() => api<Match[]>(`/api/teams/${team!.id}/matches`), team!.id);
  const list = [...(matches.data ?? [])].sort((a, b) => b.match_date.localeCompare(a.match_date));

  return (
    <div className="page">
      <PageHeader eyebrow={t.eyebrow} title={t.title} description={t.description}
        actions={!showForm && <button type="button" className="btn btn-primary" onClick={() => setParams({ nuevo: "1" })}>{t.create}</button>} />

      {showForm && <MatchForm teamId={team!.id} onClose={() => setParams({})} />}

      <Section>
        <ErrorBanner error={matches.error} onRetry={matches.reload} />
        {matches.loading ? <Loading /> : list.length === 0 ? <EmptyState title={t.empty} /> : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr><th>{t.date}</th><th>{t.opponent}</th><th>{t.venue}</th><th>{t.status}</th><th>{t.result}</th></tr>
              </thead>
              <tbody>
                {list.map((match) => (
                  <tr key={match.id}>
                    <td className="nowrap">{formatDateTime(match.match_date)}</td>
                    <td><Link to={`/partidos/${match.id}`} className="table-link">{match.opponent}</Link></td>
                    <td>{match.is_home ? t.home : t.away}</td>
                    <td><Pill>{label("matchStatus", match.status)}</Pill></td>
                    <td>{match.result
                      ? <Pill tone={RESULT_TONE[match.result]}>{label("matchResult", match.result)} {match.home_score}-{match.away_score}</Pill>
                      : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>
    </div>
  );
}

function MatchForm({ teamId, onClose }: { teamId: string; onClose: () => void }) {
  const navigate = useNavigate();
  const [form, setForm] = useState({ opponent: "", date: defaultDateTime(), isHome: true, location: "" });
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const created = await api<Match>(`/api/teams/${teamId}/matches`, { method: "POST", body: json({
        opponent: form.opponent.trim(), match_date: `${form.date}:00`, is_home: form.isHome,
        location: form.location.trim() || null,
      }) });
      navigate(`/partidos/${created.id}`);
    } catch (caught) {
      setError(caught);
      setBusy(false);
    }
  };

  return (
    <Section title={t.create}>
      <form className="form-grid" onSubmit={submit}>
        <label className="field">
          <span>{t.opponent}</span>
          <input value={form.opponent} onChange={(e) => setForm({ ...form, opponent: e.target.value })} maxLength={120} required autoFocus />
        </label>
        <label className="field">
          <span>{t.date}</span>
          <input type="datetime-local" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required />
        </label>
        <fieldset className="field segmented">
          <legend>{t.venue}</legend>
          <label className={form.isHome ? "selected" : undefined}>
            <input type="radio" name="venue" checked={form.isHome} onChange={() => setForm({ ...form, isHome: true })} />{t.home}
          </label>
          <label className={!form.isHome ? "selected" : undefined}>
            <input type="radio" name="venue" checked={!form.isHome} onChange={() => setForm({ ...form, isHome: false })} />{t.away}
          </label>
        </fieldset>
        <label className="field">
          <span>{t.location}</span>
          <input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} maxLength={120} />
        </label>
        <ErrorBanner error={error} />
        <div className="form-actions field-wide">
          <button type="button" className="btn btn-ghost" onClick={onClose}>{es.app.cancel}</button>
          <button className="btn btn-primary" disabled={busy}>{busy ? es.auth.working : t.create}</button>
        </div>
      </form>
    </Section>
  );
}
