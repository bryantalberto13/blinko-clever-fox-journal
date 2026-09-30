import { useState, useEffect } from 'preact/hooks';
import type { JSXInternal } from 'preact/src/jsx';
import { isoWeekKey } from './dates';
import { Mode, EntryFields, emptyFields, buildEntry, parseEntry, getSection } from './entry';
import { loadGoals, saveGoals } from './pluginConfig';
import { fetchToday, SavedEntry } from './journalData';

interface Props {
  mode: Mode;
  onDone: () => void;
}

const inputClass = 'mt-1 block w-full px-3 py-2 border rounded-md shadow-sm sm:text-sm bg-primary! min-h-[70px]';
const labelClass = 'block text-sm font-medium mb-2';

function Rating({ label, value, onChange }: { label: string; value: number | null; onChange: (v: number | null) => void }) {
  return (
    <div className="flex items-center gap-2 mb-2">
      <span className="text-sm" style={{ width: 64 }}>{label}</span>
      {[1, 2, 3, 4, 5].map(n => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(value === n ? null : n)}
          style={{ width: 32, height: 32, fontWeight: value === n ? 700 : 400, background: value === n ? 'rgba(128,128,128,.35)' : 'transparent', borderWidth: value === n ? 2 : 1 }}
          className="rounded-md border text-sm"
        >
          {n}
        </button>
      ))}
    </div>
  );
}

export function JournalForm({ mode, onDone }: Props): JSXInternal.Element {
  const isMorning = mode === 'morning';

  const [goals, setGoals] = useState<string[]>(['', '', '']);
  const [goalsWeekKey, setGoalsWeekKey] = useState('');
  const [suggested, setSuggested] = useState(false);
  const [fields, setFields] = useState<EntryFields>(emptyFields());
  const [existing, setExisting] = useState<SavedEntry | null>(null);
  const [morningFocus, setMorningFocus] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const set = <K extends keyof EntryFields>(k: K, v: EntryFields[K]) => setFields(f => ({ ...f, [k]: v }));

  useEffect(() => {
    (async () => {
      try {
        const [g, today] = await Promise.all([loadGoals().catch(() => null), fetchToday().catch(() => undefined)]);
        let activeGoals = g?.goals ?? ['', '', ''];
        const week = isoWeekKey();
        setGoalsWeekKey(g?.weekKey ?? '');
        // New week: offer the goals suggested by last week's review, if there are any.
        if (isMorning && g && g.weekKey !== week && g.nextGoals && g.nextFor === week) {
          activeGoals = g.nextGoals;
          setSuggested(true);
        }
        setGoals(activeGoals);
        const mine = isMorning ? today?.morning : today?.evening;
        if (mine) {
          setExisting(mine);
          setFields(parseEntry(mode, mine.content, activeGoals));
        }
        if (today?.morning) setMorningFocus(getSection(today.morning.content, 'Daily Focus'));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const isNewWeek = !loading && goalsWeekKey !== isoWeekKey();

  async function handleSave() {
    setSaving(true);
    try {
      if (isMorning) await saveGoals(goals);
      const content = buildEntry(mode, fields, goals);
      // With an id, upsert updates today's existing note instead of creating a duplicate.
      await window.Blinko.api.notes.upsert.mutate({ content, type: 0, ...(existing ? { id: existing.id } : {}) });
      window.Blinko.toast.success(`${isMorning ? 'Morning' : 'Evening'} journal ${existing ? 'updated' : 'saved'} 🦊`);
      window.Blinko.globalRefresh();
      onDone();
    } catch (e: any) {
      window.Blinko.toast.error(e?.message || 'Failed to save journal entry');
    } finally {
      setSaving(false);
    }
  }

  const area = (label: string, key: keyof EntryFields, placeholder: string) => (
    <div className="mb-4">
      <label className={labelClass}>{label}</label>
      <textarea
        value={fields[key] as string}
        onChange={(e) => set(key, (e.currentTarget as HTMLTextAreaElement).value as any)}
        className={inputClass}
        placeholder={placeholder}
      />
    </div>
  );

  return (
    <div className="max-w-xl mx-auto p-2" style={{ minWidth: '320px' }}>
      {existing && (
        <div className="text-xs text-desc mb-3">✏️ Editing today's {mode} entry — saving updates it.</div>
      )}

      {/* Weekly goals: editable in the morning; evening shows them as a check-off list */}
      <div className="mb-5 p-3 rounded-md border border-dashed">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold">🎯 This Week's Top 3 Goals</span>
          {isNewWeek && isMorning && !suggested && <span className="text-xs text-desc">New week — update your goals</span>}
          {suggested && <span className="text-xs text-desc">Suggested by your weekly review — edit if needed</span>}
        </div>
        {[0, 1, 2].map((i) => isMorning ? (
          <input
            key={i}
            value={goals[i] ?? ''}
            onChange={(e) => {
              const next = [...goals];
              next[i] = (e.currentTarget as HTMLInputElement).value;
              setGoals(next);
            }}
            placeholder={`Goal ${i + 1}`}
            className="mt-1 mb-1 block w-full px-3 py-1.5 border rounded-md shadow-sm sm:text-sm bg-primary!"
          />
        ) : goals[i]?.trim() ? (
          <label key={i} className="flex items-center gap-2 text-sm py-0.5">
            <input
              type="checkbox"
              checked={fields.goalChecks[i] ?? false}
              onChange={(e) => {
                const next = [...fields.goalChecks];
                next[i] = (e.currentTarget as HTMLInputElement).checked;
                set('goalChecks', next);
              }}
            />
            <span>{goals[i]}</span>
          </label>
        ) : null)}
        {!isMorning && !loading && !goals.some(g => g.trim()) && (
          <div className="text-xs text-desc">No goals set this week — add them in a morning entry.</div>
        )}
        {!isMorning && !loading && goals.some(g => g.trim()) && (
          <div className="text-xs text-desc mt-1">Tick the goals you moved forward today.</div>
        )}
      </div>

      {!isMorning && morningFocus && (
        <div className="mb-4 p-3 rounded-md border text-sm">
          <div className="text-xs text-desc mb-1">🌅 This morning you planned</div>
          <div style={{ whiteSpace: 'pre-wrap' }}>{morningFocus}</div>
        </div>
      )}

      {isMorning ? (
        <>
          {area('Daily Focus', 'dailyFocus', "What's the one thing that matters most today?")}
          {area('Gratitude', 'gratitude', 'What are you grateful for this morning?')}
          {area('Self-Compassion Intention', 'selfCompassion', 'How will you be kind to yourself today?')}
        </>
      ) : (
        <>
          {area('Evening Wins', 'eveningWins', 'What went well today?')}
          {area('What Actually Absorbed My Time Today', 'timeAbsorbedBy', 'Be honest — where did the hours really go?')}
          {area("Reflection / Tomorrow's Focus", 'reflection', "Any lessons? What should tomorrow's focus be?")}
        </>
      )}

      <div className="mb-4">
        <Rating label="Mood" value={fields.mood} onChange={(v) => set('mood', v)} />
        <Rating label="Energy" value={fields.energy} onChange={(v) => set('energy', v)} />
      </div>

      <button
        onClick={handleSave}
        disabled={saving || loading}
        className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md bg-primary text-primary-foreground disabled:opacity-50"
      >
        {saving ? 'Saving…' : `${existing ? 'Update' : 'Save'} ${isMorning ? 'Morning' : 'Evening'} Entry`}
      </button>
    </div>
  );
}
