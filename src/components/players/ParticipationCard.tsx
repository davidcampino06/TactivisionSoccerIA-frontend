import { Link } from "react-router";
import { es } from "../../i18n/es";
import { formatNumber } from "../../i18n/labels";
import type { PlayerStats } from "../../types";
import { Section } from "../ui";
import { summarize } from "./participation";

const t = es.pages.players.participation;

/**
 * Squad page card: how much of the squad already has statistics, the three players with most time on
 * video, and the way to the full statistics (the ranking built with a binary search tree).
 */
export default function ParticipationCard({ stats }: { stats: PlayerStats[] }) {
  const summary = summarize(stats);
  const max = summary.top[0]?.seconds ?? 0;

  return (
    <Section title={t.title} className="participation-card"
      actions={<Link to="/estadisticas" className="btn btn-primary">{t.open}</Link>}>
      {summary.withData === 0 ? <p className="muted">{t.empty}</p> : (
        <>
          <p className="muted">{t.withData(summary.withData, summary.total, formatNumber(summary.seconds, 1))}</p>
          <p className="participation-top-title">{t.top}</p>
          <ol className="ranking-list">
            {summary.top.map((player, index) => (
              <li key={player.player_id}>
                <Link to={`/jugadores/${player.player_id}`} className="ranking-row">
                  <span className="ranking-pos">{index + 1}</span>
                  <span className="ranking-shirt" aria-hidden="true">{player.shirt_number ?? "–"}</span>
                  <span className="ranking-name"><strong>{player.first_name} {player.last_name}</strong></span>
                  <span className="ranking-bar" aria-hidden="true">
                    <span style={{ width: max ? `${(player.seconds / max) * 100}%` : "0%" }} />
                  </span>
                  <span className="ranking-value">{t.seconds(formatNumber(player.seconds, 1))}</span>
                </Link>
              </li>
            ))}
          </ol>
        </>
      )}
    </Section>
  );
}
