import { useState } from "react";
import { Link } from "react-router";
import { api, json } from "../../api/client";
import { SEVERITY_TONE } from "../../app/tones";
import { useTeam } from "../../app/teamState";
import IssueExplanation from "../../components/analysis/IssueExplanation";
import ReviewNotes from "../../components/analysis/ReviewNotes";
import { TeamTag } from "../../components/analysis/TeamColors";
import type { TeamColors, TeamKey } from "../../components/analysis/shirtColor";
import { EmptyState, ErrorBanner, Loading, PageHeader, Pill } from "../../components/ui";
import { useLoad } from "../../hooks/useLoad";
import { es } from "../../i18n/es";
import { formatShortDate } from "../../components/insights/indicators";
import { formatPercent, label } from "../../i18n/labels";
import type { InboxContext, Recommendation, ReviewInbox, Strength } from "../../types";

const t = es.pages.review;
const ta = es.pages.analysis;

type Kind = "problems" | "strengths";
type Problem = ReviewInbox["problems"][number];
type Strong = ReviewInbox["strengths"][number];

const colorsOf = (context: InboxContext): TeamColors => ({ TEAM_A: context.team_a_color, TEAM_B: context.team_b_color });

/**
 * Review inbox: every possible problem and strength of the user's team that nobody has confirmed or
 * dismissed, across all matches, to review them in one place. Reviewed items leave the list.
 */
export default function ReviewInboxPage() {
  const { team } = useTeam();
  const inbox = useLoad(() => api<ReviewInbox>(`/api/teams/${team!.id}/review-inbox`), team!.id);
  const [kind, setKind] = useState<Kind>("problems");
  const [matchId, setMatchId] = useState("");
  const [removed, setRemoved] = useState<Set<string>>(() => new Set());
  const [notes, setNotes] = useState<Record<string, Recommendation["notes"]>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState<unknown>(null);

  if (inbox.loading) return <div className="page"><Loading /></div>;
  if (inbox.error || !inbox.data) return <div className="page"><ErrorBanner error={inbox.error} onRetry={inbox.reload} /></div>;

  const problems = inbox.data.problems.filter((item) => !removed.has(item.id));
  const strengths = inbox.data.strengths.filter((item) => !removed.has(item.id));
  const inMatch = <T extends { context: InboxContext }>(items: T[]) => (matchId ? items.filter((i) => i.context.match_id === matchId) : items);
  const counts = (id: string) => ({
    problems: problems.filter((i) => i.context.match_id === id).length,
    strengths: strengths.filter((i) => i.context.match_id === id).length,
  });
  const matches = inbox.data.matches.filter((m) => counts(m.match_id)[kind] > 0 || m.match_id === matchId);
  const shown = kind === "problems" ? inMatch(problems) : inMatch(strengths);

  const finish = async (id: string, title: string, context: InboxContext, action: "confirm" | "dismiss", path: string) => {
    setBusy(id);
    setError(null);
    try {
      await api(path, { method: "PATCH", body: json({ action }) });
      setRemoved((current) => new Set(current).add(id));
      setMessage(action === "confirm" ? t.confirmed(title, context.opponent) : t.dismissed(title, context.opponent));
    } catch (caught) {
      setError(caught);
    } finally {
      setBusy(null);
    }
  };

  const tab = (value: Kind, text: string) => (
    <button type="button" role="tab" aria-selected={kind === value} className={`review-tab${kind === value ? " is-active" : ""}`}
      onClick={() => { setKind(value); setMatchId(""); setMessage(""); }}>{text}</button>
  );

  return (
    <div className="page review-inbox">
      <PageHeader eyebrow={t.eyebrow} title={t.title} description={t.description} />
      <ErrorBanner error={error} />

      <section className="glass review-bar">
        <div className="review-toolbar">
          <div className="review-tabs" role="tablist" aria-label={t.tabs}>
            {tab("problems", t.problems(problems.length))}
            {tab("strengths", t.strengths(strengths.length))}
          </div>
          {matches.length > 0 && (
            <label className="review-filter">
              <span>{t.match}</span>
              <select value={matchId} onChange={(e) => setMatchId(e.target.value)}>
                <option value="">{t.allMatches}</option>
                {matches.map((m) => (
                  <option key={m.match_id} value={m.match_id}>{t.matchOption(m.opponent, formatShortDate(m.match_date), counts(m.match_id)[kind])}</option>
                ))}
              </select>
            </label>
          )}
        </div>

        <p className="muted small review-hint">{kind === "problems" ? t.problemsOrder : t.strengthsOrder}</p>
        {kind === "problems" && inbox.data.rival_problems > 0 && <p className="muted small review-hint">{t.rival(inbox.data.rival_problems)}</p>}
        <p className="review-message" role="status" aria-live="polite">
          {message}{message && removed.size > 0 && <span className="muted"> · {t.session(removed.size)}</span>}
        </p>
      </section>

      {shown.length === 0 ? (
        <EmptyState title={matchId ? t.noneInMatch : t.done} body={matchId ? undefined : kind === "problems" ? t.doneProblems : t.doneStrengths} />
      ) : (
        <div className="issue-list">
          {kind === "problems"
            ? (shown as Problem[]).map((item, index) => (
              <ProblemCard key={item.id} item={{ ...item, notes: notes[item.id] ?? item.notes }} rank={index + 1} busy={busy === item.id}
                onNotes={(list) => setNotes((current) => ({ ...current, [item.id]: list }))}
                onAction={(action) => void finish(item.id, item.title, item.context, action, `/api/recommendations/${item.id}`)} />
            ))
            : (shown as Strong[]).map((item) => (
              <StrengthCard key={item.id} item={item} busy={busy === item.id}
                onAction={(action) => void finish(item.id, item.title, item.context, action,
                  `/api/analyses/${item.context.analysis_id}/strengths/${item.id}`)} />
            ))}
        </div>
      )}
    </div>
  );
}

function Origin({ context }: { context: InboxContext }) {
  const text = `${es.pages.matches.vs} ${context.opponent} · ${formatShortDate(context.match_date)}`;
  return context.analysis_id
    ? <Link to={`/analisis/${context.analysis_id}`} className="review-origin" title={t.openAnalysis}>{text}</Link>
    : <Link to={`/partidos/${context.match_id}`} className="review-origin">{text}</Link>;
}

function TeamPill({ team, context }: { team: string | null | undefined; context: InboxContext }) {
  if (!team) return null;
  return <Pill>{team === "MATCH" ? label("team", team) : <TeamTag team={team as TeamKey} colors={colorsOf(context)} ownTeam={context.own_team as TeamKey | null} />}</Pill>;
}

function Meter({ value, good = false, text }: { value: number; good?: boolean; text: string }) {
  const percent = Math.round(value * 100);
  return (
    <div className="confidence">
      <span>{text}</span>
      <div className={`meter${good ? " is-good" : ""}`} role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent}>
        <span style={{ width: `${percent}%` }} />
      </div>
      <strong>{formatPercent(value)}</strong>
    </div>
  );
}

function ProblemCard({ item, rank, busy, onNotes, onAction }: {
  item: Problem; rank: number; busy: boolean;
  onNotes: (notes: Recommendation["notes"]) => void; onAction: (action: "confirm" | "dismiss") => void;
}) {
  return (
    <article className={`issue issue-${item.severity.toLowerCase()}`}>
      <div className="issue-head">
        <h3><span className="issue-rank" aria-label={ta.priority(rank)} title={ta.priority(rank)}>{rank}</span>{item.title}</h3>
        <div className="issue-pills">
          <TeamPill team={item.team} context={item.context} />
          <Pill tone={SEVERITY_TONE[item.severity]}>{ta.severity} {label("severity", item.severity).toLowerCase()}</Pill>
        </div>
      </div>
      <Origin context={item.context} />
      <Meter value={item.confidence} text={ta.confidence} />
      <p><span className="issue-label">{ta.evidence}:</span> {item.evidence}</p>
      <p><span className="issue-label">{ta.recommendation}:</span> {item.description}</p>
      {item.explanation && <IssueExplanation explanation={item.explanation} colors={colorsOf(item.context)} />}
      <ReviewNotes recommendationId={item.id} notes={item.notes ?? []} onChange={onNotes} />
      <div className="issue-actions">
        <button type="button" className="btn btn-primary btn-sm" disabled={busy} onClick={() => onAction("confirm")}>{ta.confirm}</button>
        <button type="button" className="btn btn-ghost btn-sm" disabled={busy} onClick={() => onAction("dismiss")}>{ta.dismiss}</button>
      </div>
    </article>
  );
}

function StrengthCard({ item, busy, onAction }: { item: Strength & { context: InboxContext }; busy: boolean; onAction: (action: "confirm" | "dismiss") => void }) {
  return (
    <article className="issue issue-strength">
      <div className="issue-head">
        <h3><span className="strength-mark" aria-hidden="true">✓</span>{item.title}</h3>
        <div className="issue-pills"><TeamPill team={item.team} context={item.context} /></div>
      </div>
      <Origin context={item.context} />
      <Meter value={item.confidence} good text={ta.strengthConfidence} />
      {item.explanation?.meaning && <p>{item.explanation.meaning}</p>}
      {item.explanation && <IssueExplanation explanation={item.explanation} colors={colorsOf(item.context)} positive />}
      <div className="issue-actions">
        <button type="button" className="btn btn-primary btn-sm" disabled={busy || !item.context.analysis_id} onClick={() => onAction("confirm")}>{ta.confirmStrength}</button>
        <button type="button" className="btn btn-ghost btn-sm" disabled={busy || !item.context.analysis_id} onClick={() => onAction("dismiss")}>{ta.dismissStrength}</button>
      </div>
    </article>
  );
}
