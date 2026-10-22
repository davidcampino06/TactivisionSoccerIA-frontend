import { es } from "../../i18n/es";
import type { Team } from "../../types";
import TeamCrest from "../team/TeamCrest";
import { shirtColorName, type TeamColors, type TeamKey } from "./shirtColor";

const t = es.pages.analysis.teamColors;

export function TeamSwatch({ color }: { color?: string | null }) {
  if (!color) return null;
  return <span className="team-swatch" style={{ background: color }} aria-hidden="true" />;
}

/** "Equipo A" with its shirt colour (and "· tu equipo" when the AI knows it is the user's team). */
export function TeamTag({ team, colors, ownTeam }: { team: TeamKey; colors?: TeamColors; ownTeam?: TeamKey | null }) {
  const color = colors?.[team];
  const name = color ? shirtColorName(color) : "";
  return (
    <span className="team-tag" title={name ? t.shirt(name) : undefined}>
      <TeamSwatch color={color} />
      {t.teams[team]}
      {ownTeam && team === ownTeam && <span className="team-tag-own"> · {t.yours}</span>}
      {name && <span className="visually-hidden"> ({t.shirt(name)})</span>}
    </span>
  );
}

interface LegendProps {
  colors: TeamColors;
  /** Which detected team is the user's (from the kit colour given when analysing), if known. */
  ownTeam?: TeamKey | null;
  myTeam?: Pick<Team, "id" | "name" | "crest_updated_at"> | null;
  ownKitColor?: string | null;
}

/** Which team is "Equipo A" and which is "Equipo B" in this analysis, and which one is yours. */
export function TeamLegend({ colors, ownTeam, myTeam, ownKitColor }: LegendProps) {
  const teams = (["TEAM_A", "TEAM_B"] as const).filter((team) => colors[team]);
  if (!teams.length) return null;
  const known = Boolean(ownTeam && myTeam);
  return (
    <div className="team-legend" aria-label={t.title}>
      {teams.map((team) => (
        <div key={team} className={`team-legend-item${known && team === ownTeam ? " is-own" : ""}`}>
          {known && team === ownTeam && <TeamCrest team={myTeam!} size="md" />}
          <TeamSwatch color={colors[team]} />
          <strong>{t.teams[team]}</strong>
          <span>{t.shirt(shirtColorName(colors[team]!))}</span>
          {known && <span className="team-legend-role">{team === ownTeam ? `${myTeam!.name} (${t.yours})` : t.rival}</span>}
        </div>
      ))}
      <p className="muted small">{t.hint}{known && ownKitColor ? ` ${t.ownHint(t.shirt(shirtColorName(ownKitColor)))}` : ""}</p>
    </div>
  );
}
