import Logo from "../components/Logo";
import { es } from "../i18n/es";

export default function PhilosophyFooter() {
  const [lead, rest] = es.philosophy.paragraphs;
  return (
    <footer id="filosofia" className="philosophy">
      <div className="philosophy-grid">
        <p className="philosophy-eyebrow">{es.philosophy.eyebrow}</p>
        <h2 className="philosophy-title">{es.philosophy.title}</h2>
        <p className="philosophy-lead">{lead}</p>
        <p className="philosophy-body">{rest}</p>
      </div>
      <div className="philosophy-bar">
        <div className="philosophy-brand">
          <Logo size={28} />
          <span>{es.brand.name}</span>
        </div>
        <p>© 2026 {es.philosophy.rights}</p>
      </div>
    </footer>
  );
}
