import { useId, useState } from "react";
import { es } from "../../i18n/es";
import { formatNumber } from "../../i18n/labels";
import type { IssueExample, IssueExplanation as Explanation } from "../../types";
import PitchExample from "./PitchExample";
import type { TeamColors } from "./shirtColor";

const t = es.pages.analysis.explain;
const TEAM_NAME: Record<string, string> = { TEAM_A: "el Equipo A", TEAM_B: "el Equipo B" };
const OF_TEAM: Record<string, string> = { TEAM_A: "del Equipo A", TEAM_B: "del Equipo B" };

function overlayCaption(example: IssueExample): string | null {
  const overlay = example.overlay;
  if (!overlay) return null;
  switch (overlay.kind) {
    case "zone": return t.overlay.zone(overlay.players, overlay.of);
    case "third": return t.overlay.third(overlay.team_a, overlay.team_b);
    case "pressure": return t.overlay.pressure(overlay.pressing.length);
    case "network": return t.overlay.network(overlay.groups.length, overlay.isolated.length);
    default: return t.overlay[overlay.kind];
  }
}

/** "Ver explicación y jugada": the issue told like a coach would, and the frame that shows it. */
export default function IssueExplanation({ explanation, colors }: { explanation: Explanation; colors?: TeamColors }) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const example = explanation.example;
  const focusCount = example && example.team !== "MATCH" ? example.players.filter((p) => p.team === example.team).length : 0;

  return (
    <div className="issue-explain">
      <button type="button" className="btn btn-ghost btn-sm issue-explain-toggle" aria-expanded={open} aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}>
        {open ? t.close : t.open}
      </button>
      {open && (
        <div className="issue-explain-body" id={panelId}>
          <div className="issue-explain-texts">
            <section><h4>{t.seen}</h4><p>{explanation.seen}</p></section>
            {explanation.meaning && <section><h4>{t.meaning}</h4><p>{explanation.meaning}</p></section>}
            {explanation.coach && <section><h4>{t.coach}</h4><p>{explanation.coach}</p></section>}
          </div>
          <figure className="issue-explain-figure">
            <h4>{t.example}</h4>
            {example ? (
              <>
                <PitchExample example={example} colors={colors} label={`${t.example}: ${t.frame(example.frame_number, formatNumber(example.timestamp_seconds, 1))}`} />
                <figcaption>
                  <span>
                    <strong>{t.frame(example.frame_number, formatNumber(example.timestamp_seconds, 1))}</strong>
                    {" · "}{example.owner ? t.owner(TEAM_NAME[example.owner] ?? example.owner) : t.looseBall}
                  </span>
                  {overlayCaption(example) && <span className="issue-explain-legend">{overlayCaption(example)}</span>}
                  {focusCount > 0 && <span>{t.visible(focusCount, OF_TEAM[example.team] ?? example.team)}</span>}
                  <span className="muted">{t.camera}</span>
                </figcaption>
              </>
            ) : <p className="muted">{t.noExample}</p>}
          </figure>
        </div>
      )}
    </div>
  );
}
