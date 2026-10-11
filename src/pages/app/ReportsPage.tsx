import { useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { api, json } from "../../api/client";
import { useTeam } from "../../app/teamState";
import { formatShortDate } from "../../components/insights/indicators";
import { EmptyState, ErrorBanner, Loading, PageHeader, Pill, Section } from "../../components/ui";
import { useLoad } from "../../hooks/useLoad";
import { es } from "../../i18n/es";
import { formatTimestamp, label } from "../../i18n/labels";
import type { AnalysedMatch, Match, Report, ReportDetail, ReportType } from "../../types";

const t = es.pages.reports;
const TYPES: ReportType[] = ["MATCH", "VIDEO_ANALYSIS", "TEAM_EVOLUTION"];

export default function ReportsPage() {
  const { team } = useTeam();
  const [params, setParams] = useSearchParams();
  const showForm = params.get("nuevo") === "1";
  const reports = useLoad(() => api<Report[]>(`/api/teams/${team!.id}/reports`), team!.id);

  return (
    <div className="page">
      <PageHeader eyebrow={t.eyebrow} title={t.title} description={t.description}
        actions={!showForm && <button type="button" className="btn btn-primary" onClick={() => setParams({ nuevo: "1" })}>{t.create}</button>} />

      {showForm && (
        <ReportForm teamId={team!.id} initialType={(params.get("tipo") as ReportType) ?? "MATCH"}
          initialMatch={params.get("partido") ?? ""} initialAnalysis={params.get("analisis") ?? ""} onCancel={() => setParams({})} />
      )}

      <Section>
        <ErrorBanner error={reports.error} onRetry={reports.reload} />
        {reports.loading && !reports.data ? <Loading /> : (reports.data ?? []).length === 0 ? (
          <EmptyState title={t.empty} body={t.emptyBody} />
        ) : (
          <ul className="report-list">
            {(reports.data ?? []).map((report) => (
              <li key={report.id}>
                <Link to={`/reportes/${report.id}`} className="report-row">
                  <span className={`report-icon report-${report.report_type.toLowerCase()}`} aria-hidden="true">
                    {report.report_type === "TEAM_EVOLUTION" ? "↗" : report.report_type === "MATCH" ? "⚽" : "▶"}
                  </span>
                  <span className="row-main">
                    <strong>{report.title}</strong>
                    <small>
                      {formatTimestamp(report.generated_at)}
                      {report.generated_by_name ? ` · ${t.by(report.generated_by_name)}` : ""}
                    </small>
                  </span>
                  <Pill>{label("reportType", report.report_type)}</Pill>
                  <span className="report-version">{t.version(report.version)}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
        <p className="muted small">{t.snapshotHint}</p>
      </Section>
    </div>
  );
}

interface FormProps {
  teamId: string;
  initialType: ReportType;
  initialMatch: string;
  initialAnalysis: string;
  onCancel: () => void;
}

function ReportForm({ teamId, initialType, initialMatch, initialAnalysis, onCancel }: FormProps) {
  const navigate = useNavigate();
  const [type, setType] = useState<ReportType>(TYPES.includes(initialType) ? initialType : "MATCH");
  const [matchId, setMatchId] = useState(initialMatch);
  const [analysisId, setAnalysisId] = useState(initialAnalysis);
  const [title, setTitle] = useState("");
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);
  const matches = useLoad(() => api<Match[]>(`/api/teams/${teamId}/matches`), teamId);
  const analysed = useLoad(() => api<AnalysedMatch[]>(`/api/teams/${teamId}/analysed-matches`), teamId);
  const sortedMatches = [...(matches.data ?? [])].sort((a, b) => b.match_date.localeCompare(a.match_date));

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const created = await api<ReportDetail>(`/api/teams/${teamId}/reports`, { method: "POST", body: json({
        report_type: type,
        title: title.trim() || null,
        match_id: type === "MATCH" ? matchId : null,
        analysis_id: type === "VIDEO_ANALYSIS" ? analysisId : null,
      }) });
      navigate(`/reportes/${created.id}`);
    } catch (caught) {
      setError(caught);
      setBusy(false);
    }
  };

  const missing = (type === "MATCH" && !matchId) || (type === "VIDEO_ANALYSIS" && !analysisId);

  return (
    <Section title={t.create}>
      <form className="form-grid" onSubmit={submit}>
        <fieldset className="field field-wide type-picker">
          <legend>{t.type}</legend>
          {TYPES.map((option) => (
            <label key={option} className={type === option ? "selected" : undefined}>
              <input type="radio" name="report-type" checked={type === option} onChange={() => setType(option)} />
              <strong>{label("reportType", option)}</strong>
              <small>{t.typeHint[option]}</small>
            </label>
          ))}
        </fieldset>

        {type === "MATCH" && (
          <label className="field">
            <span>{t.match}</span>
            <select value={matchId} onChange={(e) => setMatchId(e.target.value)} required>
              <option value="">{t.chooseMatch}</option>
              {sortedMatches.map((match) => (
                <option key={match.id} value={match.id}>vs {match.opponent} · {formatShortDate(match.match_date)}</option>
              ))}
            </select>
          </label>
        )}
        {type === "VIDEO_ANALYSIS" && (
          <label className="field">
            <span>{t.analysis}</span>
            {analysed.data && analysed.data.length === 0 ? <small className="muted">{t.noAnalysed}</small> : (
              <select value={analysisId} onChange={(e) => setAnalysisId(e.target.value)} required>
                <option value="">{t.chooseAnalysis}</option>
                {(analysed.data ?? []).map((item) => (
                  <option key={item.analysis_id} value={item.analysis_id}>
                    vs {item.opponent} · {formatShortDate(item.match_date)} · {label("analysisMode", item.analysis_mode)}
                  </option>
                ))}
              </select>
            )}
          </label>
        )}
        <label className={`field${type === "TEAM_EVOLUTION" ? " field-wide" : ""}`}>
          <span>{t.reportTitle}</span>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t.titlePlaceholder} maxLength={200} />
        </label>

        <ErrorBanner error={error} />
        <div className="form-actions field-wide">
          <button type="button" className="btn btn-ghost" onClick={onCancel}>{es.app.cancel}</button>
          <button className="btn btn-primary" disabled={busy || missing}>{busy ? t.generating : t.generate}</button>
        </div>
      </form>
    </Section>
  );
}
