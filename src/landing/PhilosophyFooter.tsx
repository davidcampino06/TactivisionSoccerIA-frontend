import Logo from "../components/Logo";
import { es } from "../i18n/es";

export default function PhilosophyFooter() {
  const [lead, rest] = es.philosophy.paragraphs;
  const team = es.philosophy.team;
  return (
    <footer id="filosofia" className="philosophy">
      <div className="philosophy-grid">
        <p className="philosophy-eyebrow">{es.philosophy.eyebrow}</p>
        <h2 className="philosophy-title">{es.philosophy.title}</h2>
        <p className="philosophy-lead">{lead}</p>
        <p className="philosophy-body">{rest}</p>
      </div>
      <section id="equipo" className="team" aria-labelledby="team-title">
        <h3 id="team-title" className="team-title">{team.title}</h3>
        <ul className="team-cards">
          {team.members.map((member) => (
            <li key={member.name} className="team-card">
              <img src={member.photo} alt={member.name} width={480} height={480} loading="lazy" decoding="async" />
              <div className="team-card-text">
                <p className="team-name">
                  <span className="team-flag" role="img" aria-label={team.country} />
                  {member.name}
                </p>
                <p className="team-role">{team.role}</p>
                <span className="team-rule" aria-hidden="true" />
              </div>
            </li>
          ))}
        </ul>
      </section>
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
