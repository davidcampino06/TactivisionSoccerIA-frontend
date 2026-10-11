import { Fragment, useEffect, useRef, useState, type CSSProperties } from "react";
import PitchCanvas from "../components/PitchCanvas";
import { es } from "../i18n/es";
import CountUp from "./CountUp";
import DetectionOverlay from "./DetectionOverlay";
import { SLIDES, SLIDE_DURATION_MS, type Slide } from "./slides";
import Sparkline from "./Sparkline";
import Timecode from "./Timecode";

const STRIPS = 10;
const STRIP_STAGGER_MS = 55;
const TRANSITION_MS = 900 + STRIPS * STRIP_STAGGER_MS;

type Props = {
  paused: boolean;
  onStart: () => void;
  onLogin: () => void;
};

/** Full-screen hero: photo slides revealed in vertical strips, with AI detection overlays. */
export default function HeroSlideshow({ paused, onStart, onLogin }: Props) {
  const rootRef = useRef<HTMLElement>(null);
  const [index, setIndex] = useState(0);
  const [incoming, setIncoming] = useState<number | null>(null);
  const [userPaused, setUserPaused] = useState(false);
  const reducedMotion = useReducedMotion();
  const slide = SLIDES[index];
  const target = SLIDES[incoming ?? index];
  const isPaused = paused || userPaused || reducedMotion;

  // Expose the hero size so every photo layer (including the strips) can emulate object-fit: cover.
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const observer = new ResizeObserver(([entry]) => {
      root.style.setProperty("--hero-w", `${entry.contentRect.width}px`);
      root.style.setProperty("--hero-h", `${entry.contentRect.height}px`);
    });
    observer.observe(root);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (incoming === null) return;
    const timer = window.setTimeout(() => {
      setIndex(incoming);
      setIncoming(null);
    }, reducedMotion ? 0 : TRANSITION_MS);
    return () => window.clearTimeout(timer);
  }, [incoming, reducedMotion]);

  const goTo = (next: number) => {
    if (incoming !== null || next === index) return;
    setIncoming((next + SLIDES.length) % SLIDES.length);
  };

  const anyPhotoMissing = SLIDES.some((item) => !item.image);

  return (
    <section
      ref={rootRef}
      id="inicio"
      className="hero"
      style={{ "--tint": target.tint } as CSSProperties}
      aria-roledescription="carrusel"
      aria-label={es.landing.modules}
    >
      {anyPhotoMissing && (
        <div className={`hero-pitch${target.image ? " hidden" : ""}`} aria-hidden="true">
          <div className="hero-pitch-tilt"><PitchCanvas /></div>
        </div>
      )}

      <div className="hero-layer" aria-hidden="true">
        <Backdrop slide={slide} />
        {incoming === null && slide.image && <DetectionOverlayFrame slide={slide} />}
      </div>

      {incoming !== null && !reducedMotion && (
        <div className="hero-strips" aria-hidden="true">
          {Array.from({ length: STRIPS }, (_, strip) => (
            <div
              key={strip}
              className="hero-strip"
              style={{ left: `${(strip * 100) / STRIPS}%`, width: `${100 / STRIPS}%`, animationDelay: `${strip * STRIP_STAGGER_MS}ms` }}
            >
              <div className="hero-strip-inner" style={{ width: `${STRIPS * 100}%`, left: `${-strip * 100}%` }}>
                <Backdrop slide={SLIDES[incoming]} />
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="hero-vignette" aria-hidden="true" />

      {/* Left rail: live numbers of the current module. */}
      <aside className="hero-rail-left" aria-live="polite">
        <div className="rail-block">
          <Sparkline seed={index + 1} />
          <p className="rail-figure">
            <CountUp key={`trend-${slide.id}`} value={1240 + index * 187} />
            <span className="rail-delta">+{8 + index * 3}%</span>
          </p>
          <p className="rail-caption">{es.landing.trend}</p>
        </div>
        <div className="rail-block">
          <p className="rail-big">
            <CountUp key={slide.id} value={slide.stat.value} decimals={slide.stat.decimals} />
          </p>
          <p className="rail-caption">{slide.stat.label}</p>
        </div>
      </aside>

      {/* Right rail: modules of the pipeline. */}
      <nav className="hero-rail-right" aria-label={es.landing.modules}>
        {SLIDES.map((item, position) => (
          <button
            key={item.id}
            type="button"
            className={position === (incoming ?? index) ? "active" : undefined}
            onClick={() => goTo(position)}
            aria-label={`${es.landing.goToSlide} ${position + 1}: ${item.module}`}
            aria-current={position === index ? "true" : undefined}
          >
            <span className="module-index">{String(position + 1).padStart(2, "0")}</span>
            <span className="module-name">{item.module}</span>
          </button>
        ))}
      </nav>

      <div className="hero-copy" key={target.id}>
        <p className="hero-eyebrow">
          <span className="scan-dot" />
          {es.landing.analyzing} · {target.eyebrow}
        </p>
        <h1 className="hero-title">
          {target.title.split(" ").map((word, position) => (
            <Fragment key={`${word}-${position}`}>
              <span className="word">
                <span style={{ animationDelay: `${120 + position * 70}ms` }}>{word}</span>
              </span>{" "}
            </Fragment>
          ))}
        </h1>
        <p className="hero-body">{target.body}</p>
        <div className="hero-actions">
          <button type="button" className="cta-primary" onClick={onStart}>
            {es.landing.start}
            <ArrowIcon />
          </button>
          <button type="button" className="cta-ghost" onClick={onLogin}>{es.landing.login}</button>
          <a className="cta-link" href="#filosofia">{es.landing.readPhilosophy}</a>
        </div>
      </div>

      <div className="hero-bottom">
        <button
          type="button"
          className="play-toggle"
          onClick={() => setUserPaused((current) => !current)}
          aria-label={userPaused ? es.landing.play : es.landing.pause}
        >
          {userPaused ? <PlayIcon /> : <PauseIcon />}
        </button>
        <ol className="hero-indicators">
          {SLIDES.map((item, position) => (
            <li key={item.id} className={position === index ? "active" : position < index ? "done" : undefined}>
              <button type="button" onClick={() => goTo(position)} aria-label={`${es.landing.goToSlide} ${position + 1}`}>
                <span className="indicator-number">{String(position + 1).padStart(2, "0")}</span>
                <span className="indicator-track">
                  {position === index && incoming === null && (
                    <span
                      className="indicator-fill"
                      style={{ animationDuration: `${SLIDE_DURATION_MS}ms`, animationPlayState: isPaused ? "paused" : "running" }}
                      onAnimationEnd={() => goTo(index + 1)}
                    />
                  )}
                </span>
              </button>
            </li>
          ))}
        </ol>
        <Timecode />
      </div>
    </section>
  );
}

function Backdrop({ slide }: { slide: Slide }) {
  return (
    <div className={`backdrop ${slide.look ?? "natural"}`}>
      {slide.image && (
        <div className="cover-box" style={coverStyle(slide)}>
          <img src={slide.image} alt="" draggable={false} />
        </div>
      )}
      <div className="backdrop-tint" style={{ "--slide-tint": slide.tint } as CSSProperties} />
    </div>
  );
}

function DetectionOverlayFrame({ slide }: { slide: Slide }) {
  return (
    <div className="cover-box overlay" style={coverStyle(slide)}>
      <DetectionOverlay key={slide.id} detections={slide.detections} links={slide.links} />
    </div>
  );
}

/** Same framing for the photo and its detection overlay, so boxes stay on the players. */
function coverStyle(slide: Slide): CSSProperties {
  return {
    "--ar": slide.imageAspect,
    "--zoom": slide.focus?.zoom ?? 1,
    "--fx-wide": slide.focus?.x ?? 0.5,
    "--fy": slide.focus?.y ?? 0.5,
  } as CSSProperties;
}

function useReducedMotion() {
  const [reduced] = useState(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  return reduced;
}

function ArrowIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true" fill="currentColor"><rect x="6" y="5" width="4" height="14" rx="1" /><rect x="14" y="5" width="4" height="14" rx="1" /></svg>
  );
}

function PlayIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true" fill="currentColor"><path d="M7 5v14l12-7z" /></svg>
  );
}
