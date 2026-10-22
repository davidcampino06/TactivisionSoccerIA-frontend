import { useEffect, useRef, useState, type ReactNode } from "react";
import { es } from "../i18n/es";
import { toUserMessage } from "../i18n/errors";

// Small building blocks shared by every page of the app.

export function PageHeader({ eyebrow, title, description, actions }:
  { eyebrow?: string; title: string; description?: ReactNode; actions?: ReactNode }) {
  return (
    <header className="page-header">
      <div className="page-header-text">
        {eyebrow && <p className="page-eyebrow">{eyebrow}</p>}
        <h1>{title}</h1>
        {description && <p className="page-description">{description}</p>}
      </div>
      {actions && <div className="page-actions">{actions}</div>}
    </header>
  );
}

export function Section({ title, actions, children, className = "" }:
  { title?: string; actions?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`panel ${className}`}>
      {(title || actions) && (
        <div className="panel-head">
          {title && <h2>{title}</h2>}
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}

export type Tone = "neutral" | "info" | "success" | "warning" | "danger" | "live";

export function Pill({ tone = "neutral", children }: { tone?: Tone; children: ReactNode }) {
  return <span className={`pill pill-${tone}`}>{children}</span>;
}

export function EmptyState({ title, body, action }: { title: string; body?: string; action?: ReactNode }) {
  return (
    <div className="empty-state">
      <p className="empty-title">{title}</p>
      {body && <p className="empty-body">{body}</p>}
      {action}
    </div>
  );
}

/**
 * Placeholder while data loads: empty glass bars with a light sweeping across (skeleton), shaped
 * like the content that is coming. Inside a section it looks like a few lines; as the whole page
 * (`.page > .loading`) it looks like a title and two cards. Screen readers hear the label.
 */
export function Loading({ label = es.app.loading }: { label?: string }) {
  return (
    <div className="loading" role="status">
      <span className="visually-hidden">{label}</span>
      <span className="skeleton skeleton-title" aria-hidden="true" />
      <span className="skeleton skeleton-line" aria-hidden="true" />
      <span className="skeleton skeleton-line" aria-hidden="true" />
      <span className="skeleton skeleton-line is-short" aria-hidden="true" />
    </div>
  );
}

export function ErrorBanner({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  if (!error) return null;
  return (
    <div className="error-banner" role="alert">
      <span>{toUserMessage(error)}</span>
      {onRetry && <button type="button" className="btn btn-ghost btn-sm" onClick={onRetry}>{es.app.retry}</button>}
    </div>
  );
}

/** Two-step button for destructive actions: first click asks, second confirms. */
export function ConfirmButton({ label, confirmLabel, onConfirm, className = "btn btn-danger btn-sm", disabled }:
  { label: string; confirmLabel: string; onConfirm: () => void; className?: string; disabled?: boolean }) {
  const [asking, setAsking] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  if (!asking) {
    return (
      <button type="button" className={className} disabled={disabled} onClick={() => {
        setAsking(true);
        timer.current = window.setTimeout(() => setAsking(false), 4000);
      }}>{label}</button>
    );
  }
  return (
    <span className="confirm-group">
      <button type="button" className="btn btn-danger btn-sm" onClick={() => { setAsking(false); onConfirm(); }}>
        {confirmLabel}
      </button>
      <button type="button" className="btn btn-ghost btn-sm" onClick={() => setAsking(false)}>{es.app.cancel}</button>
    </span>
  );
}

export function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button type="button" className="btn btn-ghost btn-sm" onClick={() => {
      navigator.clipboard.writeText(text).then(() => {
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1500);
      }).catch(() => undefined);
    }}>{copied ? es.app.copied : es.app.copy}</button>
  );
}
