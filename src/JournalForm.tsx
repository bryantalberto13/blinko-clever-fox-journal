import { useState, useEffect } from 'preact/hooks';
import type { JSXInternal } from 'preact/src/jsx';
import { localDateKey, isoWeekKey } from './dates';

const PLUGIN_NAME = 'clever-fox-journal';

type Mode = 'morning' | 'evening';

interface Props {
  mode: Mode;
  onDone: () => void;
}

function todayLabel(): string {
  const d = new Date();
  return d.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

function todayKey(): string {
  return localDateKey();
}

export function JournalForm({ mode, onDone }: Props): JSXInternal.Element {
  const i18n = window.Blinko.i18n;
  const isMorning = mode === 'morning';

  // Weekly goals, persisted via plugin config so they can be pinned into every entry
  const [weeklyGoals, setWeeklyGoals] = useState<string[]>(['', '', '']);
  const [goalsWeekKey, setGoalsWeekKey] = useState<string>('');
  const [loadingGoals, setLoadingGoals] = useState(true);

  // Morning fields
  const [dailyFocus, setDailyFocus] = useState('');
  const [gratitude, setGratitude] = useState('');
  const [selfCompassion, setSelfCompassion] = useState('');

  // Evening fields
  const [eveningWins, setEveningWins] = useState('');
  const [timeAbsorbedBy, setTimeAbsorbedBy] = useState('');
  const [reflection, setReflection] = useState('');

  const [saving, setSaving] = useState(false);

  const currentWeekKey = isoWeekKey;

  useEffect(() => {
    window.Blinko.api.config.getPluginConfig.query({ pluginName: PLUGIN_NAME }).then((res: any) => {
      const savedGoals = res?.weeklyGoals ? JSON.parse(res.weeklyGoals) : ['', '', ''];
      const savedWeekKey = res?.goalsWeekKey ?? '';
      setWeeklyGoals(savedGoals.length === 3 ? savedGoals : ['', '', '']);
      setGoalsWeekKey(savedWeekKey);
      setLoadingGoals(false);
    }).catch(() => setLoadingGoals(false));
  }, []);

  const isNewWeek = !loadingGoals && goalsWeekKey !== currentWeekKey();

  async function saveGoals(goals: string[]) {
    setWeeklyGoals(goals);
    await window.Blinko.api.config.setPluginConfig.mutate({
      pluginName: PLUGIN_NAME,
      key: 'weeklyGoals',
      value: JSON.stringify(goals),
    });
    await window.Blinko.api.config.setPluginConfig.mutate({
      pluginName: PLUGIN_NAME,
      key: 'goalsWeekKey',
      value: currentWeekKey(),
    });
    setGoalsWeekKey(currentWeekKey());
  }

  function buildContent(): string {
    const lines: string[] = [];
    const activeGoals = weeklyGoals.filter(g => g.trim().length > 0);

    if (isMorning) {
      lines.push(`## 🦊 Morning Journal — ${todayLabel()}`);
      lines.push('');
      if (activeGoals.length > 0) {
        lines.push('**This Week\'s Top 3 Goals**');
        activeGoals.forEach((g, i) => lines.push(`${i + 1}. ${g}`));
        lines.push('');
      }
      lines.push('**Daily Focus**');
      lines.push(dailyFocus.trim() || '_(none recorded)_');
      lines.push('');
      lines.push('**Gratitude**');
      lines.push(gratitude.trim() || '_(none recorded)_');
      lines.push('');
      lines.push('**Self-Compassion Intention**');
      lines.push(selfCompassion.trim() || '_(none recorded)_');
      lines.push('');
      lines.push(`#journal/morning #journal/${todayKey()}`);
    } else {
      lines.push(`## 🦊 Evening Journal — ${todayLabel()}`);
      lines.push('');
      lines.push('**Evening Wins**');
      lines.push(eveningWins.trim() || '_(none recorded)_');
      lines.push('');
      lines.push('**What Actually Absorbed My Time Today**');
      lines.push(timeAbsorbedBy.trim() || '_(none recorded)_');
      lines.push('');
      lines.push('**Reflection / Tomorrow\'s Focus**');
      lines.push(reflection.trim() || '_(none recorded)_');
      lines.push('');
      lines.push(`#journal/evening #journal/${todayKey()}`);
    }
    return lines.join('\n');
  }

  async function handleSave() {
    setSaving(true);
    try {
      // Persist any last-edited weekly goals before writing the entry
      if (isMorning) {
        await saveGoals(weeklyGoals);
      }
      const content = buildContent();
      await window.Blinko.api.notes.upsert.mutate({
        content,
        type: 0, // NoteType.BLINKO — quick note
      });
      window.Blinko.toast.success(isMorning ? 'Morning journal saved 🦊' : 'Evening journal saved 🦊');
      window.Blinko.globalRefresh();
      onDone();
    } catch (e: any) {
      window.Blinko.toast.error(e?.message || 'Failed to save journal entry');
    } finally {
      setSaving(false);
    }
  }

  const inputClass = 'mt-1 block w-full px-3 py-2 border rounded-md shadow-sm sm:text-sm bg-primary! min-h-[70px]';
  const labelClass = 'block text-sm font-medium mb-2';

  return (
    <div className="max-w-xl mx-auto p-2">
      {/* Weekly goals — editable in the morning, read-only reference in the evening */}
      <div className="mb-5 p-3 rounded-md border border-dashed">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold">🎯 This Week's Top 3 Goals</span>
          {isNewWeek && isMorning && (
            <span className="text-xs text-desc">New week — update your goals</span>
          )}
        </div>
        {[0, 1, 2].map((i) => (
          isMorning ? (
            <input
              key={i}
              value={weeklyGoals[i] ?? ''}
              onChange={(e) => {
                const next = [...weeklyGoals];
                next[i] = (e.currentTarget as HTMLInputElement).value;
                setWeeklyGoals(next);
              }}
              placeholder={`Goal ${i + 1}`}
              className="mt-1 mb-1 block w-full px-3 py-1.5 border rounded-md shadow-sm sm:text-sm bg-primary!"
            />
          ) : (
            <div key={i} className="text-sm py-0.5">
              {weeklyGoals[i]?.trim() ? `${i + 1}. ${weeklyGoals[i]}` : null}
            </div>
          )
        ))}
      </div>

      {isMorning ? (
        <>
          <div className="mb-4">
            <label className={labelClass}>Daily Focus</label>
            <textarea value={dailyFocus} onChange={(e) => setDailyFocus((e.currentTarget as HTMLTextAreaElement).value)} className={inputClass} placeholder="What's the one thing that matters most today?" />
          </div>
          <div className="mb-4">
            <label className={labelClass}>Gratitude</label>
            <textarea value={gratitude} onChange={(e) => setGratitude((e.currentTarget as HTMLTextAreaElement).value)} className={inputClass} placeholder="What are you grateful for this morning?" />
          </div>
          <div className="mb-4">
            <label className={labelClass}>Self-Compassion Intention</label>
            <textarea value={selfCompassion} onChange={(e) => setSelfCompassion((e.currentTarget as HTMLTextAreaElement).value)} className={inputClass} placeholder="How will you be kind to yourself today?" />
          </div>
        </>
      ) : (
        <>
          <div className="mb-4">
            <label className={labelClass}>Evening Wins</label>
            <textarea value={eveningWins} onChange={(e) => setEveningWins((e.currentTarget as HTMLTextAreaElement).value)} className={inputClass} placeholder="What went well today?" />
          </div>
          <div className="mb-4">
            <label className={labelClass}>What Actually Absorbed My Time Today</label>
            <textarea value={timeAbsorbedBy} onChange={(e) => setTimeAbsorbedBy((e.currentTarget as HTMLTextAreaElement).value)} className={inputClass} placeholder="Be honest — where did the hours really go?" />
          </div>
          <div className="mb-4">
            <label className={labelClass}>Reflection / Tomorrow's Focus</label>
            <textarea value={reflection} onChange={(e) => setReflection((e.currentTarget as HTMLTextAreaElement).value)} className={inputClass} placeholder="Any lessons? What should tomorrow's focus be?" />
          </div>
        </>
      )}

      <button
        onClick={handleSave}
        disabled={saving}
        className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md bg-primary text-primary-foreground disabled:opacity-50"
      >
        {saving ? 'Saving…' : `Save ${isMorning ? 'Morning' : 'Evening'} Entry`}
      </button>
    </div>
  );
}
