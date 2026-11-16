import { es } from "../i18n/es";

const t = es.pages.tactics;

/** Box that counts down the characters left in a field (50, 49, 48...); it turns red near the end. */
export function CharCount({ value, max }: { value: string; max: number }) {
  const left = Math.max(0, max - value.length);
  return (
    // The number is drawn by CSS (::before, from data-left) and hidden from screen readers, so it never
    // becomes part of the label's text or the field's name ("Motivo" stays "Motivo", not "Motivo 255").
    // The browser already tells the limit of the field through maxLength.
    <span className={`counted-left${left <= Math.max(5, Math.round(max * 0.05)) ? " is-low" : ""}`} aria-hidden="true"
      title={t.charsLeftLabel(left)} data-left={left} data-testid="chars-left" />
  );
}

/** The text of a field's label with its countdown box at the right. */
export function CountedLabel({ text, value, max }: { text: string; value: string; max: number }) {
  return (
    <span className="counted-head">
      <span>{text}</span>
      <CharCount value={value} max={max} />
    </span>
  );
}
