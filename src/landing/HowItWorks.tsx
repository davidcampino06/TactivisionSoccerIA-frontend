import { es } from "../i18n/es";

const STEPS = [
  { ...es.slides.detection, image: "/hero/01-deteccion.jpg" },
  { ...es.slides.tracking, image: "/hero/02-seguimiento.jpg" },
  { ...es.slides.context, image: "/hero/03-contexto.jpg" },
  { ...es.slides.insight, image: "/hero/04-recomendacion.jpg" },
];

/** The four stages of the analysis, one card each: what the AI does, in football words. */
export default function HowItWorks() {
  return (
    <section id="como-funciona" className="how" aria-labelledby="how-title">
      <div className="how-head">
        <p className="vhero-eyebrow">{es.landing.how.eyebrow}</p>
        <h2 id="how-title" className="how-title">{es.landing.how.title}</h2>
      </div>
      <ol className="how-steps">
        {STEPS.map((step) => (
          <li key={step.module} className="how-step">
            <img src={step.image} alt="" loading="lazy" />
            <div className="how-step-text">
              <p className="how-step-eyebrow">{step.eyebrow}</p>
              <h3>{step.title}</h3>
              <p>{step.body}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
