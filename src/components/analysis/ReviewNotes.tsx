import { useId, useState, type FormEvent } from "react";
import { api, json } from "../../api/client";
import { useTeam } from "../../app/teamState";
import { es } from "../../i18n/es";
import { formatTimestamp } from "../../i18n/labels";
import type { ReviewNote } from "../../types";
import { ConfirmButton, ErrorBanner } from "../ui";

const t = es.pages.analysis.notes;
const MAX = 1000;

interface Props {
  recommendationId: string;
  notes: ReviewNote[];
  onChange: (notes: ReviewNote[]) => void;
}

/**
 * The staff's notes on a possible problem: what a person reads in it, signed. Anyone of the team can
 * write one (the coach gets it in the bell); only its author or the coach can delete it.
 */
export default function ReviewNotes({ recommendationId, notes, onChange }: Props) {
  const { user, isCoach } = useTeam();
  const fieldId = useId();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const add = async (event: FormEvent) => {
    event.preventDefault();
    if (!text.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const note = await api<ReviewNote>(`/api/recommendations/${recommendationId}/notes`, { method: "POST", body: json({ text }) });
      onChange([...notes, note]);
      setText("");
    } catch (caught) {
      setError(caught);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (note: ReviewNote) => {
    setError(null);
    try {
      await api(`/api/recommendation-notes/${note.id}`, { method: "DELETE" });
      onChange(notes.filter((item) => item.id !== note.id));
    } catch (caught) {
      setError(caught);
    }
  };

  return (
    <section className="review-notes" aria-labelledby={`${fieldId}-title`}>
      <h4 id={`${fieldId}-title`}>{t.title}{notes.length > 0 && <span className="muted"> · {t.count(notes.length)}</span>}</h4>
      {notes.length === 0 ? <p className="muted small">{t.empty}</p> : (
        <ol className="review-note-list">
          {notes.map((note) => (
            <li key={note.id} className="review-note">
              <div className="review-note-head">
                <strong>{note.author_name ?? t.deletedUser}</strong>
                {note.author_role && <span className="review-note-role">{t.roles[note.author_role] ?? note.author_role}</span>}
                <span className="muted small">{formatTimestamp(note.created_at)}</span>
                {(note.author_id === user.id || isCoach) && (
                  <ConfirmButton label={t.delete} confirmLabel={t.deleteConfirm} className="btn btn-ghost btn-sm review-note-delete"
                    onConfirm={() => void remove(note)} />
                )}
              </div>
              <p>{note.text}</p>
            </li>
          ))}
        </ol>
      )}
      <form className="review-note-form" onSubmit={add}>
        <label htmlFor={fieldId} className="visually-hidden">{t.add}</label>
        <textarea id={fieldId} value={text} onChange={(e) => setText(e.target.value)} maxLength={MAX} rows={2}
          placeholder={t.placeholder} />
        <button className="btn btn-ghost btn-sm" disabled={busy || !text.trim()}>{busy ? t.adding : t.add}</button>
      </form>
      <ErrorBanner error={error} />
    </section>
  );
}
