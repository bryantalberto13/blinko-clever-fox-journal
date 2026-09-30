import { useState, useEffect } from 'preact/hooks';
import type { JSXInternal } from 'preact/src/jsx';
import { localDateKey, isoWeekKey } from './dates';
import {
  Mode, EntryFields, emptyFields, buildEntry, parseEntry, parseGoalsList, parseGoalChecks, getSection, todayLabel,
} from './entry';
import { loadGoals, saveGoals } from './pluginConfig';
import { SavedEntry } from './journalData';
import { MOODS, ENERGIES, Option } from './moods';

interface Props {
  mode: Mode;
  date: Date;
  existing: SavedEntry | null;
  /** The same day's morning entry, used to pre-fill the evening view. */
  morning?: SavedEntry;
  onSaved: () => void;
  onCancel: () => void;
}

function Picker({ options, value, onChange }: { options: Option[]; value: string | null; onChange: (k: string | null) => void }) {
  return (
    <div className="cf-chips">
      {options.map(o => (
        <button
          key={o.key}
          type="button"
          className={`cf-chip${value === o.key ? ' on' : ''}`}
          aria-pressed={value === o.key}
          onClick={() => onChange(value === o.key ? null : o.key)}
        >
          <span className="e">{o.emoji}</span>
          <span className="l">{o.label}</span>
        </button>
      ))}
    </div>
  );
}

export function Composer({ mode, date, existing, morning, onSaved, onCancel }: Props): JSXInternal.Element {
  const isMorning = mode === 'morning';
  const isToday = localDateKey(date) === localDateKey();

  const [goals, setGoals] = useState<string[]>(['', '', '']);
  const [fields, setFields] = useState<EntryFields>(emptyFields());
  const [suggested, setSuggested] = useState(false);
  const [newWeek, setNewWeek] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = <K extends keyof EntryFields>(k: K, v: EntryFields[K]) => setFields(f => ({ ...f, [k]: v }));
  const pad3 = (g: string[]) => { const a = [...g]; while (a.length < 3) a.push(''); return a.slice(0, 3); };

  useEffect(() => {
    (async () => {
      const cfg = await loadGoals().catch(() => null);
      const week = isoWeekKey();
      let active = cfg?.goals ?? ['', '', ''];

      if (isMorning) {
        if (existing && !isToday) active = pad3(parseGoalsList(existing.content));
        else if (cfg && cfg.weekKey !== week) {
          setNewWeek(true);
          // New week: offer the goals suggested by last week's report.
          if (cfg.nextGoals && cfg.nextFor === week && !existing) { active = cfg.nextGoals; setSuggested(true); }
        }
      } else {
        const fromEvening = existing ? parseGoalChecks(existing.content).map(c => c.goal) : [];
        const fromMorning = morning ? parseGoalsList(morning.content) : [];
        const src = fromEvening.length ? fromEvening : fromMorning.length ? fromMorning : null;
        if (src) active = pad3(src);
      }
      setGoals(active);
      if (existing) setFields(parseEntry(mode, existing.content, active));
      setLoading(false);
    })();
  }, []);

  async function save() {
    setSaving(true);
    setError('');
    try {
      if (isMorning && isToday) await saveGoals(goals);
      const content = buildEntry(mode, fields, goals, date);
      // With an id, upsert updates the existing note instead of creating a duplicate.
      await window.Blinko.api.notes.upsert.mutate({ content, type: 0, ...(existing ? { id: existing.id } : {}) });
      window.Blinko.toast.success(`${isMorning ? 'Morning' : 'Evening'} check-in ${existing ? 'updated' : 'saved'} 🦊`);
      window.Blinko.globalRefresh();
      onSaved();
    } catch (e: any) {
      setError(e?.message || 'Failed to save check-in');
      setSaving(false);
    }
  }

  const area = (label: string, key: keyof EntryFields, placeholder: string) => (
    <div className="cf-field">
      <label className="cf-lbl">{label}</label>
      <textarea
        value={fields[key] as string}
        placeholder={placeholder}
        onInput={(e) => set(key, (e.currentTarget as HTMLTextAreaElement).value as any)}
      />
    </div>
  );

  const morningFocus = morning ? getSection(morning.content, 'Daily Focus') : '';
  const hasGoals = goals.some(g => g.trim());

  return (
    <div>
      <h1>{isMorning ? '🌅 Morning check-in' : '🌙 Evening check-in'}</h1>
      <div className="cf-sub">
        {todayLabel(date)}{existing ? ' · editing saved entry' : ''}
      </div>

      <div className="cf-card">
        <h2>How are you feeling?</h2>
        <div className="cf-field"><Picker options={MOODS} value={fields.mood} onChange={(k) => set('mood', k)} /></div>
        <h2>Energy</h2>
        <Picker options={ENERGIES} value={fields.energy} onChange={(k) => set('energy', k)} />
      </div>

      {!isMorning && morningFocus && (
        <div className="cf-card">
          <div className="cf-muted" style={{ marginBottom: 6 }}>🌅 This morning you planned</div>
          <div className="cf-quote">{morningFocus}</div>
        </div>
      )}

      <div className="cf-card">
        <h2>🎯 This week's top 3 goals</h2>
        {isMorning ? (
          <>
            {(newWeek || suggested) && (
              <div className="cf-muted" style={{ marginBottom: 8 }}>
                {suggested ? "Suggested by your weekly report — edit if needed." : 'New week — set your goals.'}
              </div>
            )}
            {[0, 1, 2].map(i => (
              <div key={i} style={{ marginBottom: 8 }}>
                <input
                  type="text"
                  value={goals[i] ?? ''}
                  placeholder={`Goal ${i + 1}`}
                  onInput={(e) => {
                    const v = (e.currentTarget as HTMLInputElement).value;
                    setGoals(g => { const n = [...g]; n[i] = v; return n; });
                  }}
                />
              </div>
            ))}
          </>
        ) : loading ? null : hasGoals ? (
          <>
            {[0, 1, 2].map(i => goals[i]?.trim() ? (
              <label key={i} className="cf-check">
                <input
                  type="checkbox"
                  checked={fields.goalChecks[i] ?? false}
                  onChange={(e) => {
                    const checked = (e.currentTarget as HTMLInputElement).checked;
                    setFields(f => { const n = [...f.goalChecks]; n[i] = checked; return { ...f, goalChecks: n }; });
                  }}
                />
                <span>{goals[i]}</span>
              </label>
            ) : null)}
            <div className="cf-muted" style={{ marginTop: 6 }}>Tick the goals you moved forward today.</div>
          </>
        ) : (
          <div className="cf-muted">No goals set this week — add them in a morning check-in.</div>
        )}
      </div>

      <div className="cf-card">
        {isMorning ? (
          <>
            {area('Daily focus', 'dailyFocus', "What's the one thing that matters most today?")}
            {area('Gratitude', 'gratitude', 'What are you grateful for this morning?')}
            {area('Self-compassion intention', 'selfCompassion', 'How will you be kind to yourself today?')}
          </>
        ) : (
          <>
            {area('Evening wins', 'eveningWins', 'What went well today?')}
            {area('What actually absorbed my time today', 'timeAbsorbedBy', 'Be honest — where did the hours really go?')}
            {area("Reflection / tomorrow's focus", 'reflection', "Any lessons? What should tomorrow's focus be?")}
          </>
        )}
      </div>

      {error && <div className="cf-err">{error}</div>}
      <div className="cf-foot">
        <button className="cf-btn" disabled={saving || loading} onClick={save}>
          {saving ? 'Saving…' : existing ? 'Update check-in' : 'Save check-in'}
        </button>
        <button className="cf-btn ghost" disabled={saving} onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}
