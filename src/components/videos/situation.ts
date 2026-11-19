import { label } from "../../i18n/labels";

/** Situation of a clip while it is being chosen: the code, the optional note and, for OTHER, its name. */
export interface SituationValue {
  situation: string;
  note: string;
  custom: string;
}

export const OTHER = "OTHER";
/** Longest name the staff can write for a situation (videos.situation_custom, migration 0035). */
export const CUSTOM_MAX = 30;
export const SITUATIONS = ["BUILD_UP", "POSITIONAL_ATTACK", "COUNTER_ATTACK", "DEFENSIVE_TRANSITION", "PRESSING",
  "DEFENSIVE_BLOCK", "SET_PIECE"] as const;

export const emptySituation = (): SituationValue => ({ situation: "", note: "", custom: "" });

/** Spaces at the ends and repeated inside are not part of the name (the backend cleans it the same way). */
export const cleanCustom = (value: string) => value.split(/\s+/).filter(Boolean).join(" ");

/** OTHER can only be saved with its name written. */
export const situationReady = (value: SituationValue) =>
  value.situation !== OTHER || cleanCustom(value.custom).length > 0;

/** Body of PATCH /videos/{id}: the name only travels with OTHER. */
export function situationPayload(value: SituationValue) {
  return {
    situation: value.situation || null,
    situation_note: value.note.trim() || null,
    situation_custom: value.situation === OTHER ? cleanCustom(value.custom) || null : null,
  };
}

/**
 * Name shown for a clip's situation: the fixed one, the one the staff wrote (OTHER), or "Sin
 * clasificar". The clip library sends the written ones as facets "OTHER:<name>".
 */
export function situationLabel(situation: string | null | undefined, custom?: string | null): string {
  if (situation === OTHER) return custom || label("situation", OTHER);
  if (situation?.startsWith(`${OTHER}:`)) return situation.slice(OTHER.length + 1);
  return label("situation", situation ?? "NONE");
}
