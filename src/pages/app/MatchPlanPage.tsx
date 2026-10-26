import { useState } from "react";
import { Link, useParams } from "react-router";
import { api, download } from "../../api/client";
import { PLAYER_STATUS_TONE, SEVERITY_TONE } from "../../app/tones";
import { EmptyState, ErrorBanner, Loading, PageHeader, Pill, Section } from "../../components/ui";
import { returnText, todayIso } from "../../components/players/availability";
import { useLoad } from "../../hooks/useLoad";
import { es } from "../../i18n/es";
import { formatDate, formatDateTime, label } from "../../i18n/labels";
import type { MatchPlan, PlanOccurrence, PlanPlayer } from "../../types";

const t = es.pages.plan;

/** "plan-medellin.pdf": the server sends the same name, this one is only the fallback. */
const fileName = (opponent: string) =>
  `plan-${opponent.normalize("NFD").replace(/[^\w\s-]/g, "").trim().toLowerCase().replace(/\s+/g, "-") || "partido"}.pdf`;

/**
 * The plan for a match, built only from what the staff registered (squad, plays) and from the
 * problems and strengths a person confirmed in the last analysed matches before it.
 */
export default function MatchPlanPage() {
  const { matchId = "" } = useParams();
  const plan = useLoad(() => api<MatchPlan>(`/api/matches/${matchId}/plan`), matchId);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<unknown>(null);

  if (plan.loading) return <div className="page"><Loading /></div>;
  if (plan.error || !plan.data) return <div className="page"><ErrorBanner error={plan.error} onRetry={plan.reload} /></div>;
  const data = plan.data;
  const matchCount = data.based_on.length;

  const getPdf = async () => {
    setDownloading(true);
    setError(null);
    try {
      await download(`/api/matches/${matchId}/plan.pdf`, fileName(data.match.opponent));
    } catch (caught) {
      setError(caught);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="page match-plan">
      <Link to={`/partidos/${matchId}`} className="back-link">← {t.back}</Link>
      <PageHeader
        eyebrow={`${t.eyebrow} · ${formatDateTime(data.match.match_date)} · ${data.match.is_home ? es.pages.matches.home : es.pages.matches.away}`}
        title={t.title(data.match.opponent)}
        description={data.match.location ?? undefined}
        actions={<button type="button" className="btn btn-primary btn-sm" onClick={() => void getPdf()} disabled={downloading}>
          {downloading ? t.downloading : t.download}
        </button>}
      />
      <ErrorBanner error={error} />
      <p className="plan-rule">{t.rule}</p>

      <div className="two-columns">
        <Section title={t.squad}>
          <Squad squad={data.squad} />
        </Section>
        <Section title={t.plays}>
          {data.plays.length === 0 ? <p className="muted">{t.noPlays}</p> : (
            <ul className="plan-plays">
              {data.plays.map((play) => (
                <li key={play.id}>
                  <div className="plan-play-head">
                    <strong>{play.name}</strong>
                    {play.formation && <Pill>{play.formation}</Pill>}
                    {play.action_type && <span className="muted small">{label("actionType", play.action_type)}</span>}
                    {play.version !== null && <span className="muted small">{t.version(play.version)}</span>}
                  </div>
                  {play.description && <p>{play.description}</p>}
                  {play.notes && <p className="muted">{play.notes}</p>}
                  <Link to={`/diseno-tactico/${play.id}`} className="btn btn-ghost btn-sm">{t.openPlay}</Link>
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>

      <Section title={t.basedOn}>
        {matchCount === 0 ? <p className="muted">{t.noBasis}</p> : (
          <ul className="plan-basis">
            {data.based_on.map((item) => (
              <li key={item.match_id}>
                <Link to={`/analisis/${item.analysis_id}`}>{es.pages.matches.vs} {item.opponent}</Link>
                <span className="muted small"> · {formatDate(item.match_date)}</span>
              </li>
            ))}
          </ul>
        )}
        {(data.left_out.problems > 0 || data.left_out.strengths > 0) && (
          <p className="plan-left-out">{t.leftOut(data.left_out.problems, data.left_out.strengths)}</p>
        )}
      </Section>

      {matchCount > 0 && (
        <div className="two-columns">
          <Section title={t.toCorrect}>
            {data.to_correct.length === 0 ? <EmptyState title={t.noToCorrect} /> : data.to_correct.map((item) => (
              <article key={item.title} className={`issue issue-${item.severity.toLowerCase()} plan-item`}>
                <header className="issue-head">
                  <h3>{item.title}</h3>
                  <div className="issue-pills"><Pill tone={SEVERITY_TONE[item.severity]}>{label("severity", item.severity)}</Pill></div>
                </header>
                <p className="small"><strong>{t.seenIn(item.occurrences.length, matchCount)}:</strong> <Occurrences items={item.occurrences} /></p>
                <p><strong>{t.recommendation}:</strong> {item.recommendation}</p>
                {item.notes.length > 0 && (
                  <ul className="plan-notes">
                    {item.notes.map((note, index) => (
                      <li key={index}>
                        <p>«{note.text}»</p>
                        <span className="muted small">— {note.author ?? es.pages.analysis.notes.deletedUser}{note.role ? `, ${note.role}` : ""} · {es.pages.matches.vs} {note.opponent}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </article>
            ))}
          </Section>
          <Section title={t.toKeep}>
            {data.to_keep.length === 0 ? <EmptyState title={t.noToKeep} /> : data.to_keep.map((item) => (
              <article key={item.title} className="issue issue-strength plan-item">
                <header className="issue-head"><h3>{item.title}</h3></header>
                <p className="small"><strong>{t.confirmedIn(item.occurrences.length, matchCount)}:</strong> <Occurrences items={item.occurrences} /></p>
                {item.meaning && <p>{item.meaning}</p>}
                {item.keep && <p><strong>{item.keep}</strong></p>}
              </article>
            ))}
          </Section>
        </div>
      )}
    </div>
  );
}

function Occurrences({ items }: { items: PlanOccurrence[] }) {
  return (
    <>
      {items.map((item, index) => (
        <span key={`${item.match_id}-${index}`}>
          {index > 0 && ", "}
          {item.analysis_id
            ? <Link to={`/analisis/${item.analysis_id}`}>{es.pages.matches.vs} {item.opponent}</Link>
            : `${es.pages.matches.vs} ${item.opponent}`}
          {!item.team_known && item.team && item.team !== "MATCH" && (
            <span className="muted"> ({label("team", item.team)}, {t.teamUnknown})</span>
          )}
        </span>
      ))}
    </>
  );
}

function Squad({ squad }: { squad: MatchPlan["squad"] }) {
  const name = (player: PlanPlayer) => `${player.shirt_number !== null ? `${player.shirt_number} · ` : ""}${player.name}`;
  return (
    <>
      <p><Pill tone="success">{t.available(squad.available_count)}</Pill></p>
      {squad.groups.length === 0 ? <p className="muted">{t.noAvailable}</p> : (
        <dl className="plan-squad">
          {squad.groups.map((group) => (
            <div key={group.label}>
              <dt>{group.label}</dt>
              <dd>{group.players.map(name).join(", ")}</dd>
            </div>
          ))}
        </dl>
      )}
      {squad.unavailable.length > 0 && (
        <>
          <p><Pill tone="warning">{t.unavailable(squad.unavailable.length)}</Pill></p>
          <ul className="plan-unavailable">
            {squad.unavailable.map((player) => (
              <li key={player.id}>
                <div>
                  <strong>{name(player)}</strong>{" "}
                  <Pill tone={PLAYER_STATUS_TONE[player.status]}>{label("playerStatus", player.status)}</Pill>
                </div>
                <span className="muted small">
                  {[player.reason ?? t.noReason, returnText(player.expected_return)].filter(Boolean).join(" · ")}
                </span>
                {player.back_before_match && player.expected_return !== null && player.expected_return >= todayIso() && <span className="plan-back small">{t.backBefore}</span>}
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  );
}
