import { useState, type FormEvent } from "react";
import { api, json } from "../../api/client";
import { useTeam } from "../../app/teamState";
import {
  ConfirmButton, CopyButton, EmptyState, ErrorBanner, Loading, PageHeader, Section,
} from "../../components/ui";
import { useLoad } from "../../hooks/useLoad";
import { es } from "../../i18n/es";
import type { Team, User } from "../../types";
import TeamIdentity from "../../components/team/TeamIdentity";

const t = es.pages.team;

export default function TeamPage() {
  const { team, user, loading } = useTeam();
  if (loading) return <div className="page"><Loading /></div>;
  if (!team) return <TeamSetup role={user.role} />;
  return <TeamDetails team={team} />;
}

function TeamSetup({ role }: { role: User["role"] }) {
  const { refresh } = useTeam();
  const coach = role === "COACH";
  const [form, setForm] = useState({ name: "", category: "", city: "", code: "" });
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);
  const update = (field: keyof typeof form, value: string) => setForm((current) => ({ ...current, [field]: value }));

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (coach) {
        await api("/api/teams", { method: "POST", body: json({
          name: form.name.trim(), category: form.category.trim() || null, city: form.city.trim() || null,
        }) });
      } else {
        await api("/api/teams/join", { method: "POST", body: json({ invitation_code: form.code.trim().toUpperCase() }) });
      }
      await refresh();
    } catch (caught) {
      setError(caught);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="page page-narrow">
      <PageHeader eyebrow={t.eyebrow} title={coach ? t.setupCoachTitle : t.setupAnalystTitle}
        description={coach ? t.setupCoachBody : t.setupAnalystBody} />
      <Section>
        <form className="form-grid" onSubmit={submit}>
          {coach ? (
            <>
              <label className="field field-wide">
                <span>{t.name}</span>
                <input value={form.name} onChange={(e) => update("name", e.target.value)} minLength={2} maxLength={120} required />
              </label>
              <label className="field">
                <span>{t.category}</span>
                <input value={form.category} placeholder={t.categoryPlaceholder} onChange={(e) => update("category", e.target.value)} maxLength={120} />
              </label>
              <label className="field">
                <span>{t.city}</span>
                <input value={form.city} onChange={(e) => update("city", e.target.value)} maxLength={120} />
              </label>
            </>
          ) : (
            <label className="field field-wide">
              <span>{t.code}</span>
              <input className="input-code" value={form.code} placeholder={t.codePlaceholder}
                onChange={(e) => update("code", e.target.value)} minLength={4} maxLength={20} required />
            </label>
          )}
          <ErrorBanner error={error} />
          <div className="form-actions field-wide">
            <button className="btn btn-primary" disabled={busy}>{busy ? es.auth.working : coach ? t.createButton : t.joinButton}</button>
          </div>
        </form>
      </Section>
    </div>
  );
}

function TeamDetails({ team }: { team: Team }) {
  const { isCoach, refresh } = useTeam();
  const [form, setForm] = useState({ name: team.name, category: team.category ?? "", city: team.city ?? "", description: team.description ?? "" });
  const [notice, setNotice] = useState("");
  const [error, setError] = useState<unknown>(null);
  const [code, setCode] = useState(team.invitation_code);
  const analysts = useLoad(() => api<User[]>(`/api/teams/${team.id}/analysts`), team.id);

  const act = async (action: () => Promise<void>, message: string) => {
    setError(null);
    setNotice("");
    try {
      await action();
      setNotice(message);
    } catch (caught) {
      setError(caught);
    }
  };

  const save = (event: FormEvent) => {
    event.preventDefault();
    void act(async () => {
      await api(`/api/teams/${team.id}`, { method: "PUT", body: json({
        name: form.name.trim(), category: form.category.trim() || null, city: form.city.trim() || null,
        description: form.description.trim() || null,
      }) });
      await refresh();
    }, t.saved);
  };

  return (
    <div className="page">
      <PageHeader eyebrow={t.eyebrow} title={team.name}
        description={[team.category, team.city].filter(Boolean).join(" · ") || undefined} />
      {notice && <p className="notice" role="status">{notice}</p>}
      <ErrorBanner error={error} />

      <div className="two-columns">
        <Section title={t.details}>
          <form className="form-grid" onSubmit={save}>
            <fieldset disabled={!isCoach} className="form-grid-fieldset">
              <label className="field field-wide">
                <span>{t.name}</span>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} minLength={2} maxLength={120} required />
              </label>
              <label className="field">
                <span>{t.category}</span>
                <input value={form.category} placeholder={t.categoryPlaceholder} onChange={(e) => setForm({ ...form, category: e.target.value })} maxLength={120} />
              </label>
              <label className="field">
                <span>{t.city}</span>
                <input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} maxLength={120} />
              </label>
              <label className="field field-wide">
                <span>{t.description}</span>
                <textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} maxLength={250} />
              </label>
            </fieldset>
            <div className="form-actions field-wide">
              {isCoach ? <button className="btn btn-primary">{es.app.save}</button> : <small className="muted">{t.coachOnly}</small>}
            </div>
          </form>
        </Section>

        <div className="stack">
          <TeamIdentity team={team} />
          {isCoach && code && (
            <Section title={t.invitation}>
              <p className="muted">{t.invitationBody}</p>
              <div className="code-box">
                <code>{code}</code>
                <CopyButton text={code} />
              </div>
              <ConfirmButton label={t.regenerate} confirmLabel={t.regenerateConfirm} className="btn btn-ghost btn-sm"
                onConfirm={() => void act(async () => {
                  const updated = await api<Team>(`/api/teams/${team.id}/invitation-code`, { method: "POST" });
                  setCode(updated.invitation_code);
                }, t.regenerated)} />
            </Section>
          )}

          <Section title={t.analysts}>
            {analysts.loading ? <Loading /> : (analysts.data ?? []).length === 0 ? <EmptyState title={t.noAnalysts} /> : (
              <ul className="row-list">
                {(analysts.data ?? []).map((analyst) => (
                  <li key={analyst.id} className="row">
                    <span className="row-main">
                      <strong>{analyst.first_name} {analyst.last_name}</strong>
                      <small>{analyst.email}</small>
                    </span>
                    {isCoach && (
                      <ConfirmButton label={t.remove} confirmLabel={t.removeConfirm}
                        onConfirm={() => void act(async () => {
                          await api(`/api/teams/${team.id}/analysts/${analyst.id}`, { method: "DELETE" });
                          analysts.reload();
                        }, t.saved)} />
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Section>
        </div>
      </div>
    </div>
  );
}
