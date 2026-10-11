import { useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { api, json } from "../../api/client";
import { useTeam } from "../../app/teamState";
import { ACTION_TYPES, EMPTY_BOARD, FORMATIONS, formationTokens, fromConfiguration, toConfiguration } from "../../components/tactics/board";
import Pitch from "../../components/tactics/Pitch";
import { EmptyState, ErrorBanner, Loading, PageHeader, Pill, Section } from "../../components/ui";
import { useLoad } from "../../hooks/useLoad";
import { es } from "../../i18n/es";
import { formatServerDate, label } from "../../i18n/labels";
import type { TacticalPlay, TacticalPlaySummary } from "../../types";

const t = es.pages.tactics;

export default function TacticsPage() {
  const { team, isCoach } = useTeam();
  const [params, setParams] = useSearchParams();
  const showForm = isCoach && params.get("nuevo") === "1";
  const plays = useLoad(() => api<TacticalPlaySummary[]>(`/api/teams/${team!.id}/tactical-plays`), team!.id);

  return (
    <div className="page">
      <PageHeader eyebrow={t.eyebrow} title={t.title} description={t.description}
        actions={isCoach && !showForm && (
          <button type="button" className="btn btn-primary" onClick={() => setParams({ nuevo: "1" })}>{t.create}</button>
        )} />

      {showForm && <PlayForm teamId={team!.id} onCancel={() => setParams({})} />}

      <ErrorBanner error={plays.error} onRetry={plays.reload} />
      {plays.loading && !plays.data ? <Section><Loading /></Section> : (plays.data ?? []).length === 0 ? (
        <Section><EmptyState title={t.empty} body={isCoach ? t.emptyCoach : t.emptyAnalyst} /></Section>
      ) : (
        <ul className="play-grid">
          {(plays.data ?? []).map((play) => (
            <li key={play.id}>
              <Link to={`/diseno-tactico/${play.id}`} className="play-card">
                <div className="play-preview">
                  <Pitch board={fromConfiguration(play.configuration)} tool="select" selectedId={null} compact readOnly ariaLabel={play.name} />
                </div>
                <div className="play-info">
                  <div className="play-title-row">
                    <strong>{play.name}</strong>
                    {play.action_type && <Pill>{label("actionType", play.action_type)}</Pill>}
                  </div>
                  <small>
                    {play.current_version_number ? t.version(play.current_version_number) : ""}
                    {play.version_count > 1 ? ` · ${t.versions(play.version_count)}` : ""}
                    {play.updated_at ? ` · ${t.updated(formatServerDate(play.updated_at))}` : ""}
                  </small>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function PlayForm({ teamId, onCancel }: { teamId: string; onCancel: () => void }) {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", actionType: "", description: "", start: FORMATIONS[0] as string });
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const board = form.start
      ? { ...EMPTY_BOARD, formation: form.start, tokens: formationTokens(form.start, "own") }
      : EMPTY_BOARD;
    try {
      const created = await api<TacticalPlay>(`/api/teams/${teamId}/tactical-plays`, { method: "POST", body: json({
        name: form.name.trim(), action_type: form.actionType || null, description: form.description.trim() || null,
        configuration: toConfiguration(board),
      }) });
      navigate(`/diseno-tactico/${created.id}`);
    } catch (caught) {
      setError(caught);
      setBusy(false);
    }
  };

  return (
    <Section title={t.create}>
      <form className="form-grid" onSubmit={submit}>
        <label className="field">
          <span>{t.name}</span>
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder={t.namePlaceholder}
            maxLength={120} required autoFocus />
        </label>
        <label className="field">
          <span>{t.actionType}</span>
          <select value={form.actionType} onChange={(e) => setForm({ ...form, actionType: e.target.value })}>
            <option value="">—</option>
            {ACTION_TYPES.map((code) => <option key={code} value={code}>{label("actionType", code)}</option>)}
          </select>
        </label>
        <label className="field">
          <span>{t.startWith}</span>
          <select value={form.start} onChange={(e) => setForm({ ...form, start: e.target.value })}>
            {FORMATIONS.map((formation) => <option key={formation} value={formation}>{t.formationStart(formation)}</option>)}
            <option value="">{t.blank}</option>
          </select>
        </label>
        <label className="field">
          <span>{t.descriptionLabel}</span>
          <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} maxLength={250} />
        </label>
        <ErrorBanner error={error} />
        <div className="form-actions field-wide">
          <button type="button" className="btn btn-ghost" onClick={onCancel}>{es.app.cancel}</button>
          <button className="btn btn-primary" disabled={busy}>{busy ? es.auth.working : t.create}</button>
        </div>
      </form>
    </Section>
  );
}
