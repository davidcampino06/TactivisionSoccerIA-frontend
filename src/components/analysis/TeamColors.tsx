import { es } from "../../i18n/es";
import { shirtColorName, type TeamColors, type TeamKey } from "./shirtColor";

const t = es.pages.analysis.teamColors;

export function TeamSwatch({ color }: { color?: string | null }) {
  if (!color) return null;
  return <span className="team-swatch" style={{ background: color }} aria-hidden="true" />;
}

/** "Equipo A" with its shirt colour; the colour name goes to screen readers and the tooltip. */
export function TeamTag({ team, colors }: { team: TeamKey; colors?: TeamColors }) {
  const color = colors?.[team];
  const name = color ? shirtColorName(color) : "";
  return (
    <span className="team-tag" title={name ? t.shirt(name) : undefined}>
      <TeamSwatch color={color} />
      {t.teams[team]}
      {name && <span className="visually-hidden"> ({t.shirt(name)})</span>}
    </span>
  );
}

/** Which team is "Equipo A" and which is "Equipo B" in this analysis. */
export function TeamLegend({ colors }: { colors: TeamColors }) {
  const teams = (["TEAM_A", "TEAM_B"] as const).filter((team) => colors[team]);
  if (!teams.length) return null;
  return (
    <div className="team-legend" aria-label={t.title}>
      {teams.map((team) => (
        <div key={team} className="team-legend-item">
          <TeamSwatch color={colors[team]} />
          <strong>{t.teams[team]}</strong>
          <span>{t.shirt(shirtColorName(colors[team]!))}</span>
        </div>
      ))}
      <p className="muted small">{t.hint}</p>
    </div>
  );
}
