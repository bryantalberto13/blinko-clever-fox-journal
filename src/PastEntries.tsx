import { useState, useEffect } from 'preact/hooks';
import type { JSXInternal } from 'preact/src/jsx';
import { fetchTagged, TaggedNote } from './journalData';
import { localDateKey } from './dates';

/** Collapsible list of earlier saved entries for a tag (e.g. "guided"). */
export function PastEntries({ tag, refreshKey, preview }: { tag: string; refreshKey: number; preview: (content: string) => string }): JSXInternal.Element {
  const [notes, setNotes] = useState<TaggedNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<number | null>(null);

  useEffect(() => {
    setLoading(true);
    fetchTagged(tag).then(setNotes).catch(() => setNotes([])).finally(() => setLoading(false));
  }, [tag, refreshKey]);

  return (
    <div className="cf-card">
      <h2>Past entries</h2>
      {loading && <div className="cf-muted">Loading…</div>}
      {!loading && notes.length === 0 && <div className="cf-muted">Nothing saved yet.</div>}
      {notes.map(n => (
        <div key={n.id} className="cf-item" style={{ display: 'block' }}>
          <div className="cf-row">
            <div className="cf-grow" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              <b>{localDateKey(new Date(n.createdAt))}</b> · <span className="cf-muted">{preview(n.content)}</span>
            </div>
            <button className="cf-link" onClick={() => setOpen(open === n.id ? null : n.id)}>{open === n.id ? 'Hide' : 'Read'}</button>
          </div>
          {open === n.id && <div className="cf-out" style={{ marginTop: 8 }}>{n.content.replace(/\n?#journal\/\S+\s*$/, '')}</div>}
        </div>
      ))}
    </div>
  );
}
