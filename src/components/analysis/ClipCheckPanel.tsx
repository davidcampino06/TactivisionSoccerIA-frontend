import { es } from "../../i18n/es";
import type { ClipCheck } from "../../types";

const t = es.pages.match.clipCheck;
const ICON: Record<string, string> = { ok: "✓", warn: "!", bad: "✕" };

/** What the AI says about a clip before analysing it: each check marked as measured or estimated. */
export default function ClipCheckPanel({ result }: { result: ClipCheck }) {
  return (
    <section className={`clip-check is-${result.verdict}`} aria-label={t.verdict[result.verdict]}>
      <p className="clip-check-verdict"><strong>{t.verdict[result.verdict]}</strong> <span className="muted small">{t.advice}</span></p>
      <ul className="clip-check-list">
        {result.checks.map((check) => (
          <li key={check.code} className={`clip-check-item is-${check.status}`}>
            <span className="clip-check-icon" role="img" aria-label={t.statusLabel[check.status]}>{ICON[check.status]}</span>
            <span className="clip-check-text">
              <strong>{check.title}</strong>
              <span>{check.detail}</span>
            </span>
            <span className="clip-check-kind">{check.measured ? t.measured : t.estimated}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
