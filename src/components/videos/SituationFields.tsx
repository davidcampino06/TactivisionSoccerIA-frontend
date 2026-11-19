import { es } from "../../i18n/es";
import { label } from "../../i18n/labels";
import { CountedLabel } from "../CharCount";
import { CUSTOM_MAX, OTHER, SITUATIONS, type SituationValue } from "./situation";

const t = es.pages.match;

/**
 * Which tactical situation the clip shows, chosen by a person, and an optional short note. When none
 * of the fixed situations fits, "Otra" lets the staff write its own name (up to 30 characters).
 */
export default function SituationFields({ value, onChange }:
  { value: SituationValue; onChange: (value: SituationValue) => void }) {
  return (
    <div className="situation-fields">
      <div className="situation-choice">
        <label className="field">
          <span>{t.situation}</span>
          <select value={value.situation} onChange={(e) => onChange({ ...value, situation: e.target.value })}>
            <option value="">{t.situationNone}</option>
            {SITUATIONS.map((code) => <option key={code} value={code}>{label("situation", code)}</option>)}
            <option value={OTHER}>{t.situationOther}</option>
          </select>
        </label>
        {value.situation === OTHER && (
          <label className="field">
            <CountedLabel text={t.situationCustom} value={value.custom} max={CUSTOM_MAX} />
            <input type="text" maxLength={CUSTOM_MAX} value={value.custom} required
              placeholder={t.situationCustomPlaceholder} onChange={(e) => onChange({ ...value, custom: e.target.value })} />
          </label>
        )}
      </div>
      <label className="field">
        <CountedLabel text={t.situationNote} value={value.note} max={200} />
        <input type="text" maxLength={200} value={value.note} placeholder={t.situationNotePlaceholder}
          onChange={(e) => onChange({ ...value, note: e.target.value })} />
      </label>
      <small className="muted situation-hint">{t.situationHint}</small>
    </div>
  );
}
